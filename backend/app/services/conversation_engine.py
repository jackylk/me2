"""对话引擎 - 基于 NeuroMemory v2 的温暖陪伴式聊天"""
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.llm_client import LLMClient
from app.db.models import Message, Session
from sqlalchemy import select
import logging

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
        db: AsyncSession
    ) -> Dict[str, Any]:
        """处理对话 - 温暖、懂用户的回复

        Args:
            user_id: 用户 ID
            session_id: 会话 ID
            message: 用户消息
            db: 数据库会话

        Returns:
            对话响应字典
        """
        try:
            # 延迟导入 nm 以避免循环依赖
            from app.main import nm

            # === 1. 保存用户消息到 Me2 数据库 ===
            user_msg = Message(
                session_id=session_id,
                user_id=user_id,
                role="user",
                content=message
            )
            db.add(user_msg)
            await db.flush()  # 获取 ID 但不提交
            logger.info(f"保存用户消息: {user_msg.id}")

            # === 2. 召回相关记忆（三因子检索）===
            recall_result = await nm.recall(
                user_id=user_id,
                query=message,
                limit=5
            )
            memories = recall_result["merged"]
            logger.info(f"召回 {len(memories)} 条记忆")

            # === 3. 获取洞察（深度理解）===
            insights = await nm.search(
                user_id=user_id,
                query=message,
                memory_type="insight",
                limit=3
            )
            logger.info(f"获取 {len(insights)} 条洞察")

            # === 4. 构建温暖的 system prompt ===
            system_prompt = self._build_warm_prompt(memories, insights)

            # === 5. 调用 LLM 生成回复 ===
            response = await self.llm.generate(
                prompt=message,
                system_prompt=system_prompt,
                temperature=0.8,  # 稍高温度，更自然
                max_tokens=500
            )
            logger.info(f"LLM 生成回复完成")

            # === 6. 保存 AI 回复到 Me2 数据库（包含完整上下文）===
            ai_msg = Message(
                session_id=session_id,
                user_id=user_id,
                role="assistant",
                content=response,
                system_prompt=system_prompt,
                recalled_memories=[{
                    "content": m["content"],
                    "score": m.get("score", 0),
                    "created_at": m.get("created_at"),
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
                    "model": "deepseek-chat"
                }
            )
            db.add(ai_msg)

            # === 7. 更新 session 的 last_active_at ===
            from sqlalchemy.sql import func
            stmt = select(Session).where(Session.id == session_id)
            result = await db.execute(stmt)
            session = result.scalar_one_or_none()
            if session:
                session.last_active_at = func.now()

            await db.commit()
            logger.info(f"保存 AI 回复和上下文: {ai_msg.id}")

            # === 8. 同步到 NeuroMemory（用于记忆提取）===
            await nm.conversations.add_message(
                user_id=user_id,
                role="user",
                content=message
            )
            await nm.conversations.add_message(
                user_id=user_id,
                role="assistant",
                content=response
            )
            logger.info(f"同步到 NeuroMemory 完成")

            logger.info(f"对话处理完成: user={user_id}, session={session_id}")

            return {
                "response": response,
                "memories_recalled": len(memories),
                "insights_used": len(insights)
            }

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


# 全局单例
conversation_engine = ConversationEngine()
