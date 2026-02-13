"""
聊天 API 测试
"""
import pytest
from unittest.mock import patch, AsyncMock


@pytest.mark.api
@pytest.mark.asyncio
class TestChatAPI:
    """聊天 API 测试类"""

    async def test_send_message(
        self,
        client,
        test_user_id,
        sample_message
    ):
        """测试发送消息"""
        with patch('app.services.conversation_engine.ConversationEngine._generate_response', new=AsyncMock(return_value="测试回复")), \
             patch('app.services.neuromemory_client.neuromemory_client.add_memory', new=AsyncMock(return_value={"id": "mem_1"})), \
             patch('app.services.neuromemory_client.neuromemory_client.search', new=AsyncMock(return_value=[])):

            response = await client.post(
                "/api/v1/chat/",
                json={
                    "user_id": test_user_id,
                    "message": sample_message
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert "response" in data
            assert isinstance(data["response"], str)
            assert len(data["response"]) > 0

    async def test_send_message_missing_fields(self, client):
        """测试缺少必填字段"""
        # 缺少 user_id
        response = await client.post(
            "/api/v1/chat/",
            json={"message": "测试"}
        )
        assert response.status_code == 422

        # 缺少 message
        response = await client.post(
            "/api/v1/chat/",
            json={"user_id": "test"}
        )
        assert response.status_code == 422

    async def test_send_empty_message(self, client, test_user_id):
        """测试发送空消息"""
        response = await client.post(
            "/api/v1/chat/",
            json={
                "user_id": test_user_id,
                "message": ""
            }
        )

        # 应该返回 400 或 422
        assert response.status_code in [400, 422]

    async def test_send_message_with_session_id(
        self,
        client,
        test_user_id
    ):
        """测试带会话 ID 的消息"""
        with patch('app.services.conversation_engine.ConversationEngine._generate_response', new=AsyncMock(return_value="回复")), \
             patch('app.services.neuromemory_client.neuromemory_client.add_memory', new=AsyncMock(return_value={"id": "mem_1"})), \
             patch('app.services.neuromemory_client.neuromemory_client.search', new=AsyncMock(return_value=[])):

            # 第一条消息
            response1 = await client.post(
                "/api/v1/chat/",
                json={
                    "user_id": test_user_id,
                    "message": "你好"
                }
            )
            assert response1.status_code == 200
            data1 = response1.json()
            session_id = data1.get("session_id")

            # 第二条消息，使用相同 session_id
            if session_id:
                response2 = await client.post(
                    "/api/v1/chat/",
                    json={
                        "user_id": test_user_id,
                        "message": "我叫小明",
                        "session_id": session_id
                    }
                )
                assert response2.status_code == 200

    async def test_end_session(self, client, test_user_id):
        """测试结束会话"""
        with patch('app.services.conversation_engine.ConversationEngine._generate_response', new=AsyncMock(return_value="回复")), \
             patch('app.services.neuromemory_client.neuromemory_client.add_memory', new=AsyncMock(return_value={"id": "mem_1"})), \
             patch('app.services.neuromemory_client.neuromemory_client.search', new=AsyncMock(return_value=[])):

            # 发送消息创建会话
            response1 = await client.post(
                "/api/v1/chat/",
                json={
                    "user_id": test_user_id,
                    "message": "你好"
                }
            )
            assert response1.status_code == 200
            data1 = response1.json()
            session_id = data1.get("session_id")

            if session_id:
                # 结束会话
                response2 = await client.post(
                    "/api/v1/chat//end",
                    json={
                        "user_id": test_user_id,
                        "session_id": session_id
                    }
                )
                assert response2.status_code == 200

    async def test_concurrent_requests(
        self,
        client,
        test_user_id
    ):
        """测试并发请求"""
        import asyncio

        with patch('app.services.conversation_engine.ConversationEngine._generate_response', new=AsyncMock(return_value="回复")), \
             patch('app.services.neuromemory_client.neuromemory_client.add_memory', new=AsyncMock(return_value={"id": "mem_1"})), \
             patch('app.services.neuromemory_client.neuromemory_client.search', new=AsyncMock(return_value=[])):

            async def send_message(i):
                return await client.post(
                    "/api/v1/chat/",
                    json={
                        "user_id": test_user_id,
                        "message": f"消息 {i}"
                    }
                )

            # 并发发送 5 条消息
            responses = await asyncio.gather(*[send_message(i) for i in range(5)])

            # 验证所有请求都成功
            assert all(r.status_code == 200 for r in responses)

    async def test_long_message(
        self,
        client,
        test_user_id
    ):
        """测试长消息"""
        long_message = "测试" * 500  # 1000 字

        with patch('app.services.conversation_engine.ConversationEngine._generate_response', new=AsyncMock(return_value="回复")), \
             patch('app.services.neuromemory_client.neuromemory_client.add_memory', new=AsyncMock(return_value={"id": "mem_1"})), \
             patch('app.services.neuromemory_client.neuromemory_client.search', new=AsyncMock(return_value=[])):

            response = await client.post(
                "/api/v1/chat/",
                json={
                    "user_id": test_user_id,
                    "message": long_message
                }
            )

            # 可能被截断或拒绝
            assert response.status_code in [200, 400, 413]

    async def test_special_characters(
        self,
        client,
        test_user_id
    ):
        """测试特殊字符"""
        special_messages = [
            "Hello! 你好 🎉",
            "<script>alert('xss')</script>",
            "'; DROP TABLE users; --",
            "测试\n换行\t制表符",
        ]

        with patch('app.services.conversation_engine.ConversationEngine._generate_response', new=AsyncMock(return_value="回复")), \
             patch('app.services.neuromemory_client.neuromemory_client.add_memory', new=AsyncMock(return_value={"id": "mem_1"})), \
             patch('app.services.neuromemory_client.neuromemory_client.search', new=AsyncMock(return_value=[])):

            for message in special_messages:
                response = await client.post(
                    "/api/v1/chat/",
                    json={
                        "user_id": test_user_id,
                        "message": message
                    }
                )

                # 应该正常处理或返回错误，不应该崩溃
                assert response.status_code in [200, 400, 422]


@pytest.mark.integration
@pytest.mark.asyncio
class TestChatAPIIntegration:
    """聊天 API 集成测试"""

    @pytest.mark.requires_llm
    async def test_real_conversation(
        self,
        client,
        test_user_id,
        skip_if_no_api_key
    ):
        """测试真实对话流程"""
        skip_if_no_api_key("deepseek")

        # 发送第一条消息
        response1 = await client.post(
            "/api/v1/chat/",
            json={
                "user_id": test_user_id,
                "message": "你好，我是测试用户"
            }
        )

        assert response1.status_code == 200
        data1 = response1.json()
        assert "response" in data1
        print(f"Response 1: {data1['response']}")

        # 发送第二条消息
        response2 = await client.post(
            "/api/v1/chat/",
            json={
                "user_id": test_user_id,
                "message": "今天天气怎么样？"
            }
        )

        assert response2.status_code == 200
        data2 = response2.json()
        assert "response" in data2
        print(f"Response 2: {data2['response']}")
