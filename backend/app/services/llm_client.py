"""
LLM 客户端封装

提供统一的 LLM 调用接口
"""
import logging
import json
from typing import Optional, List, Dict, Any
from openai import AsyncOpenAI
from app.config import settings

logger = logging.getLogger(__name__)


class LLMClient:
    """LLM 客户端"""

    def __init__(self):
        """初始化 LLM 客户端"""
        self.client = AsyncOpenAI(
            api_key=settings.DEEPSEEK_API_KEY,
            base_url=settings.DEEPSEEK_BASE_URL
        )
        self.model = settings.DEEPSEEK_MODEL
        self.debug_mode = False  # 调试模式标志

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        history_messages: Optional[List[Dict[str, str]]] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        response_format: Optional[str] = None,
        return_debug_info: bool = False,
        stream: bool = False
    ) -> str | Dict[str, Any]:
        """
        生成 LLM 响应

        Args:
            prompt: 当前用户消息
            system_prompt: 系统提示词
            history_messages: 历史消息列表 [{"role": "user/assistant", "content": "..."}]
            temperature: 温度参数
            max_tokens: 最大生成 token 数
            response_format: 响应格式（"json" 或 None）
            return_debug_info: 是否返回调试信息（包含完整prompt）

        Returns:
            生成的文本，或包含调试信息的字典
        """
        try:
            messages = []

            # 1. 添加 system prompt
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})

            # 2. 添加历史对话
            if history_messages:
                messages.extend(history_messages)

            # 3. 添加当前用户消息
            messages.append({"role": "user", "content": prompt})

            kwargs = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": stream
            }

            # 如果需要 JSON 格式，添加 response_format 参数
            if response_format == "json":
                kwargs["response_format"] = {"type": "json_object"}

            # 记录完整的请求信息（调试用）
            if self.debug_mode or return_debug_info:
                logger.info("=" * 80)
                logger.info("发送给 DeepSeek 的完整请求:")
                logger.info(f"模型: {self.model}")
                logger.info(f"温度: {temperature}, 最大tokens: {max_tokens}, 流式: {stream}")
                logger.info(f"消息数量: {len(messages)}")
                logger.info("-" * 80)
                for i, msg in enumerate(messages):
                    logger.info(f"[消息 {i+1}] {msg['role']}:")
                    logger.info(msg['content'][:500] + ("..." if len(msg['content']) > 500 else ""))
                    logger.info("-" * 40)
                logger.info("=" * 80)

            # 流式生成
            if stream:
                # 返回异步生成器
                async def stream_generator():
                    full_response = ""
                    async for chunk in await self.client.chat.completions.create(**kwargs):
                        if not chunk.choices:
                            continue
                        if chunk.choices[0].delta.content:
                            content = chunk.choices[0].delta.content
                            full_response += content
                            yield content

                    # 流结束后返回调试信息（如果需要）
                    if return_debug_info:
                        yield {
                            "done": True,
                            "debug_info": {
                                "model": self.model,
                                "temperature": temperature,
                                "max_tokens": max_tokens,
                                "messages": messages,
                                "message_count": len(messages),
                                "system_prompt": system_prompt,
                                "history_count": len(history_messages) if history_messages else 0
                            }
                        }

                return stream_generator()

            # 非流式生成（原有逻辑）
            response = await self.client.chat.completions.create(**kwargs)
            generated_text = response.choices[0].message.content.strip()

            # 返回调试信息
            if return_debug_info:
                return {
                    "response": generated_text,
                    "debug_info": {
                        "model": self.model,
                        "temperature": temperature,
                        "max_tokens": max_tokens,
                        "messages": messages,
                        "message_count": len(messages),
                        "system_prompt": system_prompt,
                        "history_count": len(history_messages) if history_messages else 0
                    }
                }

            return generated_text

        except Exception as e:
            logger.error(f"LLM 生成失败: {e}")
            raise


# 全局单例
llm_client = LLMClient()
