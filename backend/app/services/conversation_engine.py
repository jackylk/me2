"""对话引擎 - 基于 NeuroMemory v2 的温暖陪伴式聊天"""
import asyncio
import logging
import time
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.services.llm_client import LLMClient
from app.db.models import Message, Session

logger = logging.getLogger(__name__)


class ConversationEngine:
    """对话引擎 - Me2 高层对话逻辑"""

    def __init__(self):
        """初始化对话引擎"""
        self.llm = LLMClient()

    async def chat(
        self,
        user_id: str,
        session_id: str,
        message: str,
        db: AsyncSession,
        debug_mode: bool = False
    ) -> Dict[str, Any]:
        """处理对话 - 温暖、懂用户的回复

        Args:
            user_id: 用户 ID
            session_id: 会话 ID
            message: 用户消息
            db: 数据库会话
            debug_mode: 是否返回调试信息

        Returns:
            对话响应字典
        """
        try:
            # 性能计时
            timings = {}
            start_time = time.time()

            # 延迟导入 nm 以避免循环依赖
            from app.main import nm

            # === 1. 获取当前会话的历史消息 ===
            step_start = time.time()
            stmt = select(Message).where(
                Message.session_id == session_id
            ).order_by(Message.created_at.asc()).limit(20)  # 最多取最近20条
            result = await db.execute(stmt)
            history = result.scalars().all()
            timings['fetch_history'] = time.time() - step_start

            # 构建历史消息列表
            history_messages = []
            for msg in history:
                history_messages.append({
                    "role": msg.role,
                    "content": msg.content
                })

            logger.info(f"获取历史消息: {len(history_messages)} 条")

            # === 2. 保存用户消息到 Me2 数据库 ===
            step_start = time.time()
            user_msg = Message(
                session_id=session_id,
                user_id=user_id,
                role="user",
                content=message
            )
            db.add(user_msg)
            await db.flush()  # 获取 ID 但不提交
            timings['save_user_message'] = time.time() - step_start
            logger.info(f"保存用户消息: {user_msg.id}")

            # === 3-4. 并发召回记忆和获取洞察 ===
            # 🚀 使用 asyncio.gather 并发执行，减少等待时间
            # NeuroMemory 内部会缓存 query embedding，避免重复计算
            step_start = time.time()
            recall_task = nm.recall(user_id=user_id, query=message, limit=5)
            insights_task = nm.search(user_id=user_id, query=message, memory_type="insight", limit=3)

            recall_result, insights = await asyncio.gather(recall_task, insights_task)
            memories = recall_result["merged"]

            timings['recall_memories'] = time.time() - step_start
            logger.info(f"召回 {len(memories)} 条记忆 + {len(insights)} 条洞察（并发执行）")

            # === 5. 构建温暖的 system prompt ===
            step_start = time.time()
            system_prompt = self._build_warm_prompt(memories, insights)
            timings['build_prompt'] = time.time() - step_start

            # === 6. 调用 LLM 生成回复（包含历史对话）===
            step_start = time.time()
            llm_result = await self.llm.generate(
                prompt=message,
                system_prompt=system_prompt,
                history_messages=history_messages,  # 传入历史对话
                temperature=0.8,  # 稍高温度，更自然
                max_tokens=500,
                return_debug_info=debug_mode  # 调试模式
            )
            timings['llm_generate'] = time.time() - step_start

            # 处理返回结果
            if debug_mode and isinstance(llm_result, dict):
                response = llm_result["response"]
                debug_info = llm_result["debug_info"]
            else:
                response = llm_result
                debug_info = None

            logger.info(f"LLM 生成回复完成")

            # === 7. 保存 AI 回复到 Me2 数据库（包含完整上下文）===
            step_start = time.time()
            ai_msg = Message(
                session_id=session_id,
                user_id=user_id,
                role="assistant",
                content=response,
                system_prompt=system_prompt,
                recalled_memories=[{
                    "content": m["content"],
                    "score": m.get("score", 0),
                    "created_at": m.get("created_at").isoformat() if m.get("created_at") else None,
                    "metadata": m.get("metadata", {})
                } for m in memories],
                insights_used=[{
                    "content": i["content"],
                    "type": i.get("type", "")
                } for i in insights],
                meta={
                    "memories_count": len(memories),
                    "insights_count": len(insights),
                    "temperature": 0.8,
                    "max_tokens": 500,
                    "model": "deepseek-chat",
                    "history_messages_count": len(history_messages)
                }
            )
            db.add(ai_msg)

            # === 8. 更新 session 的 last_active_at ===
            from sqlalchemy.sql import func
            stmt_session = select(Session).where(Session.id == session_id)
            result_session = await db.execute(stmt_session)
            session = result_session.scalar_one_or_none()
            if session:
                session.last_active_at = func.now()

            await db.commit()
            timings['save_to_db'] = time.time() - step_start
            logger.info(f"保存 AI 回复和上下文: {ai_msg.id}")

            # === 9. 同步到 NeuroMemory（用于记忆提取）===
            step_start = time.time()
            # 只添加用户消息（AI 回复只存 Me2 数据库，不存 NeuroMemory）
            # NeuroMemory 已优化为只对 user 消息计算 embedding 和提取记忆
            await nm.conversations.add_message(
                user_id=user_id,
                role="user",
                content=message
            )
            timings['sync_neuromemory'] = time.time() - step_start

            # 记录触发的后台任务（用于调试显示）
            background_tasks = []
            # 检查是否会触发extract（每10条用户消息）
            msg_count = len(history_messages) + 1  # 历史 + 本轮的用户消息
            if msg_count % 10 == 0:
                background_tasks.append(f"提取记忆: 第{msg_count}条用户消息触发自动提取（事实/偏好/关系）")

            # 检查是否会触发reflect（每20次提取后）
            extract_count = msg_count // 10
            if extract_count > 0 and extract_count % 20 == 0:
                background_tasks.append(f"记忆整理: 第{extract_count}次提取触发反思（生成洞察+更新画像）")

            # === 10. 记忆整理应由 NeuroMemory 内部异步处理 ===
            # 注意：reflect() 是重量级操作（40+ 秒），不应在对话流程中同步调用
            # NeuroMemory 应该支持：
            # 1. 基于对话轮数自动触发（如每10轮对话）
            # 2. 基于时间周期自动触发（如每小时）
            # 3. 后台异步执行，不阻塞对话响应
            #
            # 当前我们只同步记录对话，整理工作由 NeuroMemory 后台完成
            logger.info(f"对话已同步到 NeuroMemory，等待后台整理")

            # 计算总耗时
            timings['total'] = time.time() - start_time

            logger.info(f"对话处理完成: user={user_id}, session={session_id}, 总耗时: {timings['total']:.3f}s")

            # 构建返回结果
            result = {
                "response": response,
                "memories_recalled": len(memories),
                "insights_used": len(insights),
                "history_messages_count": len(history_messages)
            }

            # 添加调试信息
            if debug_mode and debug_info:
                # 添加性能计时信息
                debug_info["timings"] = timings
                # 添加后台任务信息
                debug_info["background_tasks"] = background_tasks
                result["debug_info"] = debug_info

            return result

        except Exception as e:
            logger.error(f"对话处理失败: {e}", exc_info=True)
            await db.rollback()
            return {
                "response": "抱歉，我遇到了一些问题，请稍后再试。",
                "error": str(e)
            }

    def _build_warm_prompt(
        self,
        memories: list[dict],
        insights: list[dict]
    ) -> str:
        """构建温暖、支持性的 system prompt

        Args:
            memories: 召回的记忆列表
            insights: 洞察列表

        Returns:
            system prompt 字符串
        """
        # 格式化记忆
        memory_lines = []
        for m in memories:
            meta = m.get("metadata", {})

            # 提取情感信息
            emotion_hint = ""
            if "emotion" in meta and meta["emotion"]:
                label = meta["emotion"].get("label", "")
                valence = meta["emotion"].get("valence", 0)
                if label:
                    emotion_hint = f" [用户当时感到{label}]"
                elif valence < -0.3:
                    emotion_hint = " [负面情绪]"
                elif valence > 0.3:
                    emotion_hint = " [正面情绪]"

            score = m.get("score", 0)
            memory_lines.append(
                f"- {m['content']} (相关度: {score:.2f}){emotion_hint}"
            )

        memory_context = "\n".join(memory_lines) if memory_lines else "暂无相关记忆"

        # 格式化洞察
        insight_context = "\n".join([
            f"- {i['content']}" for i in insights
        ]) if insights else "暂无深度理解"

        # 提取情感上下文
        emotional_context = self._extract_emotional_context(memories)

        return f"""你是一个温暖、懂 ta 的朋友。

**你记得关于 ta 的这些事**：
{memory_context}

**你对 ta 的理解**：
{insight_context}

{emotional_context}

**重要指引**：
1. 像真正的朋友一样对话，自然地提及你记得的事
2. 如果 ta 情绪低落，给予温暖的支持和鼓励
3. 如果 ta 分享开心的事，真诚地为 ta 高兴
4. 不要机械地复述记忆，要自然融入对话
5. 让 ta 感觉被理解、被支持
6. 回复简洁自然，不要过长
7. 可以适当使用表情符号，但不要过度"""

    def _extract_emotional_context(self, memories: list[dict]) -> str:
        """提取情感上下文

        Args:
            memories: 记忆列表

        Returns:
            情感提示字符串
        """
        emotions = []
        for m in memories:
            meta = m.get("metadata", {})
            if "emotion" in meta and meta["emotion"]:
                emotions.append(meta["emotion"])

        if not emotions:
            return ""

        # 计算平均情绪
        avg_valence = sum(e["valence"] for e in emotions) / len(emotions)

        if avg_valence < -0.3:
            return "\n**注意**: ta 最近情绪似乎有些低落，请给予关心和支持。"
        elif avg_valence > 0.3:
            return "\n**注意**: ta 最近心情不错，可以分享 ta 的快乐。"

        return ""

    async def chat_stream(
        self,
        user_id: str,
        session_id: str,
        message: str,
        db: AsyncSession,
        debug_mode: bool = False
    ):
        """流式对话处理 - 实时推送生成的内容

        Yields:
            str: 生成的文本片段（token）
            dict: 完成信息（type='done'）或错误信息（type='error'）
        """
        try:
            from app.main import nm

            # 性能计时
            timings = {}
            start_time = time.time()

            # === 1-5步：准备工作（与非流式相同）===
            step_start = time.time()
            stmt = select(Message).where(
                Message.session_id == session_id
            ).order_by(Message.created_at.asc()).limit(20)
            result = await db.execute(stmt)
            history = result.scalars().all()
            timings['fetch_history'] = time.time() - step_start

            history_messages = []
            for msg in history:
                history_messages.append({
                    "role": msg.role,
                    "content": msg.content
                })

            step_start = time.time()
            user_msg = Message(
                session_id=session_id,
                user_id=user_id,
                role="user",
                content=message
            )
            db.add(user_msg)
            await db.flush()
            timings['save_user_message'] = time.time() - step_start

            # 🚀 并发召回记忆和获取洞察
            step_start = time.time()
            try:
                recall_task = nm.recall(user_id=user_id, query=message, limit=5)
                insights_task = nm.search(user_id=user_id, query=message, memory_type="insight", limit=3)

                recall_result, insights = await asyncio.gather(recall_task, insights_task)
                memories = recall_result["merged"]
            except Exception as e:
                logger.warning(f"记忆召回/洞察搜索失败: {e}")
                memories = []
                insights = []
            timings['recall_memories'] = time.time() - step_start

            step_start = time.time()
            system_prompt = self._build_warm_prompt(memories, insights)
            timings['build_prompt'] = time.time() - step_start

            # === 6. 流式调用 LLM ===
            step_start = time.time()
            stream_generator = await self.llm.generate(
                prompt=message,
                system_prompt=system_prompt,
                history_messages=history_messages,
                temperature=0.8,
                max_tokens=500,
                stream=True  # 启用流式
            )

            # 逐个yield token
            full_response = ""
            async for chunk in stream_generator:
                if isinstance(chunk, dict) and chunk.get("done"):
                    # 流结束，忽略这个信号，继续处理
                    break
                else:
                    # 文本token
                    full_response += chunk
                    yield chunk  # 实时推送给前端

            timings['llm_generate'] = time.time() - step_start

            # === 7-9. 保存和同步（与非流式相同）===
            step_start = time.time()
            ai_msg = Message(
                session_id=session_id,
                user_id=user_id,
                role="assistant",
                content=full_response,
                system_prompt=system_prompt,
                recalled_memories=[{
                    "content": m["content"],
                    "score": m.get("score", 0),
                    "created_at": m.get("created_at").isoformat() if m.get("created_at") else None,
                    "metadata": m.get("metadata", {})
                } for m in memories],
                insights_used=[{
                    "content": i["content"],
                    "type": i.get("type", "")
                } for i in insights],
                meta={
                    "memories_count": len(memories),
                    "insights_count": len(insights),
                    "temperature": 0.8,
                    "max_tokens": 500,
                    "model": "deepseek-chat",
                    "history_messages_count": len(history_messages)
                }
            )
            db.add(ai_msg)

            from sqlalchemy.sql import func
            stmt_session = select(Session).where(Session.id == session_id)
            result_session = await db.execute(stmt_session)
            session = result_session.scalar_one_or_none()
            if session:
                session.last_active_at = func.now()

            await db.commit()
            timings['save_to_db'] = time.time() - step_start

            step_start = time.time()
            # 只添加用户消息（AI 回复只存 Me2 数据库，不存 NeuroMemory）
            await nm.conversations.add_message(
                user_id=user_id,
                role="user",
                content=message
            )
            timings['sync_neuromemory'] = time.time() - step_start

            # 记录后台任务
            background_tasks = []
            msg_count = len(history_messages) + 1  # 只计算用户消息
            if msg_count % 10 == 0:
                background_tasks.append(f"提取记忆: 第{msg_count}条用户消息触发自动提取（事实/偏好/关系）")
            extract_count = msg_count // 10
            if extract_count > 0 and extract_count % 20 == 0:
                background_tasks.append(f"记忆整理: 第{extract_count}次提取触发反思（生成洞察+更新画像）")

            timings['total'] = time.time() - start_time

            # === 发送完成信号 ===
            done_data = {
                "type": "done",
                "session_id": session_id,
                "memories_recalled": len(memories),
                "insights_used": len(insights),
                "history_messages_count": len(history_messages)
            }

            if debug_mode:
                done_data["debug_info"] = {
                    "model": "deepseek-chat",
                    "temperature": 0.8,
                    "max_tokens": 500,
                    "messages": [{"role": "system", "content": system_prompt}] +
                               history_messages +
                               [{"role": "user", "content": message}],
                    "message_count": len(history_messages) + 2,
                    "system_prompt": system_prompt,
                    "history_count": len(history_messages),
                    "background_tasks": background_tasks,
                    "timings": timings
                }

            yield done_data

        except Exception as e:
            logger.error(f"流式对话处理失败: {e}", exc_info=True)
            await db.rollback()
            yield {
                "type": "error",
                "error": str(e)
            }


# 全局单例
conversation_engine = ConversationEngine()
