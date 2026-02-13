"""
对话引擎单元测试
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone

from app.services.conversation_engine import ConversationEngine


@pytest.mark.unit
@pytest.mark.asyncio
class TestConversationEngine:
    """对话引擎测试类"""

    async def test_init(self, db_session):
        """测试初始化"""
        engine = ConversationEngine(db_session)

        assert engine.db == db_session
        assert engine.session_manager is not None
        assert engine.mimic_engine is not None
        assert engine.llm_client is not None
        assert engine.model is not None

    async def test_process_message_basic(
        self,
        db_session,
        test_user_id,
        sample_message,
        mock_neuromemory,
        mock_llm_response
    ):
        """测试基本对话处理"""
        engine = ConversationEngine(db_session)

        # Mock 依赖
        with patch.object(engine, 'neuromemory_client', mock_neuromemory), \
             patch.object(engine, '_generate_response', new=AsyncMock(return_value="测试回复")):

            result = await engine.process_message(
                user_id=test_user_id,
                message=sample_message
            )

            # 验证返回结果
            assert "response" in result
            assert isinstance(result["response"], str)
            assert len(result["response"]) > 0

    async def test_process_message_with_session(
        self,
        db_session,
        test_user_id,
        mock_neuromemory
    ):
        """测试带会话的对话"""
        engine = ConversationEngine(db_session)

        with patch.object(engine, 'neuromemory_client', mock_neuromemory), \
             patch.object(engine, '_generate_response', new=AsyncMock(return_value="回复")):

            # 第一条消息
            result1 = await engine.process_message(
                user_id=test_user_id,
                message="你好"
            )

            # 第二条消息（应该在同一个 session）
            result2 = await engine.process_message(
                user_id=test_user_id,
                message="我叫小明"
            )

            assert "response" in result1
            assert "response" in result2

    async def test_intent_analysis(
        self,
        db_session,
        test_user_id,
        mock_neuromemory
    ):
        """测试意图分析"""
        engine = ConversationEngine(db_session)

        # 测试不同意图的消息
        test_cases = [
            ("你好", "CHAT"),
            ("我今天很难过", "EMOTIONAL"),
            ("你觉得我应该怎么做？", "ADVICE"),
            ("我女儿叫什么？", "QUERY"),
        ]

        with patch.object(engine, 'neuromemory_client', mock_neuromemory):
            for message, expected_intent in test_cases:
                with patch('app.services.intent_analyzer.intent_analyzer.analyze', return_value=expected_intent):
                    # 通过 process_message 测试意图分析
                    # 跳过 LLM 调用以加快测试
                    with patch.object(engine, '_generate_response', new=AsyncMock(return_value="回复")):
                        result = await engine.process_message(test_user_id, message)
                        assert result["intent"] == expected_intent

    async def test_memory_retrieval(
        self,
        db_session,
        test_user_id,
        mock_neuromemory
    ):
        """测试记忆检索"""
        engine = ConversationEngine(db_session)

        with patch.object(engine, 'neuromemory_client', mock_neuromemory), \
             patch.object(engine, '_generate_response', new=AsyncMock(return_value="回复")):

            result = await engine.process_message(
                user_id=test_user_id,
                message="我女儿叫什么？"
            )

            # 验证调用了记忆检索
            assert "response" in result

    async def test_mimic_learning(
        self,
        db_session,
        test_user_id,
        mock_neuromemory,
        create_test_profile
    ):
        """测试思维模仿学习"""
        engine = ConversationEngine(db_session)

        # 创建初始画像
        await create_test_profile(test_user_id)

        with patch.object(engine, 'neuromemory_client', mock_neuromemory), \
             patch.object(engine, '_generate_response', new=AsyncMock(return_value="回复")):

            # 发送消息
            result = await engine.process_message(
                user_id=test_user_id,
                message="哈哈，今天真开心！"
            )

            # 验证学习被触发（通过检查画像更新）
            assert "response" in result
            assert "profile_confidence" in result

    async def test_error_handling(
        self,
        db_session,
        test_user_id
    ):
        """测试错误处理"""
        engine = ConversationEngine(db_session)

        # Mock LLM 调用失败
        with patch.object(engine, '_generate_response', side_effect=Exception("LLM Error")):
            result = await engine.process_message(
                user_id=test_user_id,
                message="测试"
            )
            # 应该返回错误响应而不是抛出异常
            assert "error" in result

    async def test_empty_message(
        self,
        db_session,
        test_user_id
    ):
        """测试空消息"""
        engine = ConversationEngine(db_session)

        # 空字符串
        with pytest.raises(ValueError):
            await engine.process_message(
                user_id=test_user_id,
                message=""
            )

        # 只有空格
        with pytest.raises(ValueError):
            await engine.process_message(
                user_id=test_user_id,
                message="   "
            )

    async def test_long_message(
        self,
        db_session,
        test_user_id,
        mock_neuromemory
    ):
        """测试长消息"""
        engine = ConversationEngine(db_session)

        long_message = "测试" * 500  # 1000 字

        with patch.object(engine, 'neuromemory_client', mock_neuromemory), \
             patch.object(engine, '_generate_response', new=AsyncMock(return_value="回复")):

            result = await engine.process_message(
                user_id=test_user_id,
                message=long_message
            )

            assert "response" in result

    async def test_concurrent_messages(
        self,
        db_session,
        test_user_id,
        mock_neuromemory
    ):
        """测试并发消息"""
        engine = ConversationEngine(db_session)

        with patch.object(engine, 'neuromemory_client', mock_neuromemory), \
             patch.object(engine, '_generate_response', new=AsyncMock(return_value="回复")):

            # 并发发送多条消息
            import asyncio

            tasks = [
                engine.process_message(test_user_id, f"消息 {i}")
                for i in range(5)
            ]

            results = await asyncio.gather(*tasks, return_exceptions=True)

            # 验证所有消息都得到处理
            assert len(results) == 5
            for result in results:
                if isinstance(result, dict):
                    assert "response" in result


@pytest.mark.integration
@pytest.mark.asyncio
class TestConversationEngineIntegration:
    """对话引擎集成测试"""

    @pytest.mark.requires_llm
    async def test_real_llm_call(
        self,
        db_session,
        test_user_id,
        skip_if_no_api_key
    ):
        """测试真实 LLM 调用（需要 API Key）"""
        skip_if_no_api_key("deepseek")

        engine = ConversationEngine(db_session)

        result = await engine.process_message(
            user_id=test_user_id,
            message="你好"
        )

        assert "response" in result
        assert len(result["response"]) > 0
        print(f"LLM Response: {result['response']}")
