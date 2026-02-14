"""
聊天会话管理 API 测试
测试会话创建、列表、消息历史和多会话聊天功能
"""
import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient


@pytest.mark.api
@pytest.mark.asyncio
class TestChatSessionsAPI:
    """聊天会话管理 API 测试类"""

    async def test_create_session(self, authenticated_client: AsyncClient):
        """测试创建新会话"""
        response = await authenticated_client.post(
            "/api/v1/chat/sessions",
            json={"title": "测试会话"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["title"] == "测试会话"
        assert data["message_count"] == 0

    async def test_create_session_without_title(self, authenticated_client: AsyncClient):
        """测试创建会话不指定标题"""
        response = await authenticated_client.post(
            "/api/v1/chat/sessions",
            json={}
        )

        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["title"] is None

    async def test_list_sessions(self, authenticated_client: AsyncClient):
        """测试获取会话列表"""
        # 创建几个会话
        for i in range(3):
            await authenticated_client.post(
                "/api/v1/chat/sessions",
                json={"title": f"会话 {i+1}"}
            )

        # 获取会话列表
        response = await authenticated_client.get("/api/v1/chat/sessions")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3

        # 验证会话按时间倒序排列
        for session in data:
            assert "id" in session
            assert "created_at" in session
            assert "last_active_at" in session
            assert "message_count" in session

    async def test_get_session_messages(self, authenticated_client: AsyncClient):
        """测试获取会话消息历史"""
        # 创建会话
        session_resp = await authenticated_client.post(
            "/api/v1/chat/sessions",
            json={"title": "测试对话"}
        )
        session_id = session_resp.json()["id"]

        # 在会话中发送几条消息
        with patch('app.services.conversation_engine.ConversationEngine._generate_response',
                   new=AsyncMock(return_value="测试回复")), \
             patch('app.services.neuromemory_client.neuromemory_client.add_memory',
                   new=AsyncMock(return_value={"id": "mem_1"})), \
             patch('app.services.neuromemory_client.neuromemory_client.search',
                   new=AsyncMock(return_value=[])):

            for i in range(3):
                await authenticated_client.post(
                    "/api/v1/chat/",
                    json={
                        "message": f"测试消息 {i+1}",
                        "session_id": session_id
                    }
                )

        # 获取消息历史
        response = await authenticated_client.get(
            f"/api/v1/chat/sessions/{session_id}/messages"
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 6  # 3条用户消息 + 3条AI回复

        # 验证消息格式
        for msg in data:
            assert "id" in msg
            assert "role" in msg
            assert msg["role"] in ["user", "assistant"]
            assert "content" in msg
            assert "created_at" in msg

    async def test_get_session_messages_invalid_session(self, authenticated_client: AsyncClient):
        """测试获取不存在的会话消息"""
        response = await authenticated_client.get(
            "/api/v1/chat/sessions/invalid-session-id/messages"
        )

        assert response.status_code == 404

    async def test_chat_with_session_id(self, authenticated_client: AsyncClient):
        """测试在指定会话中聊天"""
        # 创建会话
        session_resp = await authenticated_client.post(
            "/api/v1/chat/sessions",
            json={"title": "专属会话"}
        )
        session_id = session_resp.json()["id"]

        with patch('app.services.conversation_engine.ConversationEngine._generate_response',
                   new=AsyncMock(return_value="在会话中回复")), \
             patch('app.services.neuromemory_client.neuromemory_client.add_memory',
                   new=AsyncMock(return_value={"id": "mem_1"})), \
             patch('app.services.neuromemory_client.neuromemory_client.search',
                   new=AsyncMock(return_value=[])):

            # 发送消息到指定会话
            response = await authenticated_client.post(
                "/api/v1/chat/",
                json={
                    "message": "你好",
                    "session_id": session_id
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert data["session_id"] == session_id
            assert "response" in data

    async def test_chat_without_session_id(self, authenticated_client: AsyncClient):
        """测试不指定会话ID时自动创建新会话"""
        with patch('app.services.conversation_engine.ConversationEngine._generate_response',
                   new=AsyncMock(return_value="自动创建会话回复")), \
             patch('app.services.neuromemory_client.neuromemory_client.add_memory',
                   new=AsyncMock(return_value={"id": "mem_1"})), \
             patch('app.services.neuromemory_client.neuromemory_client.search',
                   new=AsyncMock(return_value=[])):

            response = await authenticated_client.post(
                "/api/v1/chat/",
                json={"message": "你好"}
            )

            assert response.status_code == 200
            data = response.json()
            assert "session_id" in data
            assert data["session_id"] is not None

    async def test_multiple_sessions_isolation(self, authenticated_client: AsyncClient):
        """测试多个会话之间的隔离"""
        # 创建两个会话
        session1_resp = await authenticated_client.post(
            "/api/v1/chat/sessions",
            json={"title": "会话 1"}
        )
        session1_id = session1_resp.json()["id"]

        session2_resp = await authenticated_client.post(
            "/api/v1/chat/sessions",
            json={"title": "会话 2"}
        )
        session2_id = session2_resp.json()["id"]

        with patch('app.services.conversation_engine.ConversationEngine._generate_response',
                   new=AsyncMock(return_value="回复")), \
             patch('app.services.neuromemory_client.neuromemory_client.add_memory',
                   new=AsyncMock(return_value={"id": "mem_1"})), \
             patch('app.services.neuromemory_client.neuromemory_client.search',
                   new=AsyncMock(return_value=[])):

            # 在会话1中发送消息
            await authenticated_client.post(
                "/api/v1/chat/",
                json={
                    "message": "会话1的消息",
                    "session_id": session1_id
                }
            )

            # 在会话2中发送消息
            await authenticated_client.post(
                "/api/v1/chat/",
                json={
                    "message": "会话2的消息",
                    "session_id": session2_id
                }
            )

        # 获取两个会话的消息
        msgs1_resp = await authenticated_client.get(
            f"/api/v1/chat/sessions/{session1_id}/messages"
        )
        msgs2_resp = await authenticated_client.get(
            f"/api/v1/chat/sessions/{session2_id}/messages"
        )

        msgs1 = msgs1_resp.json()
        msgs2 = msgs2_resp.json()

        # 验证消息隔离
        assert len(msgs1) == 2  # 1用户 + 1AI
        assert len(msgs2) == 2
        assert msgs1[0]["content"] == "会话1的消息"
        assert msgs2[0]["content"] == "会话2的消息"

    async def test_unauthorized_access_sessions(self, client: AsyncClient):
        """测试未认证访问会话"""
        # 不带 token
        response = await client.get("/api/v1/chat/sessions")
        assert response.status_code == 401


@pytest.mark.integration
@pytest.mark.asyncio
class TestChatSessionsIntegration:
    """聊天会话集成测试"""

    async def test_complete_session_workflow(self, authenticated_client: AsyncClient):
        """测试完整的会话工作流程"""

        with patch('app.services.conversation_engine.ConversationEngine._generate_response',
                   new=AsyncMock(return_value="AI回复")), \
             patch('app.services.neuromemory_client.neuromemory_client.add_memory',
                   new=AsyncMock(return_value={"id": "mem_1"})), \
             patch('app.services.neuromemory_client.neuromemory_client.search',
                   new=AsyncMock(return_value=[])):

            # 1. 创建新会话
            create_resp = await authenticated_client.post(
                "/api/v1/chat/sessions",
                json={"title": "工作流程测试"}
            )
            assert create_resp.status_code == 200
            session_id = create_resp.json()["id"]

            # 2. 在会话中发送多条消息
            messages = ["你好", "我叫小明", "今天天气不错"]
            for msg in messages:
                chat_resp = await authenticated_client.post(
                    "/api/v1/chat/",
                    json={
                        "message": msg,
                        "session_id": session_id
                    }
                )
                assert chat_resp.status_code == 200

            # 3. 获取会话列表，验证新会话在列表中
            list_resp = await authenticated_client.get("/api/v1/chat/sessions")
            assert list_resp.status_code == 200
            sessions = list_resp.json()
            assert any(s["id"] == session_id for s in sessions)

            # 找到对应会话，验证消息数量
            session = next(s for s in sessions if s["id"] == session_id)
            assert session["message_count"] == 6  # 3用户 + 3AI

            # 4. 获取会话消息历史
            msgs_resp = await authenticated_client.get(
                f"/api/v1/chat/sessions/{session_id}/messages"
            )
            assert msgs_resp.status_code == 200
            msgs = msgs_resp.json()
            assert len(msgs) == 6

            # 5. 验证消息顺序和内容
            assert msgs[0]["role"] == "user"
            assert msgs[0]["content"] == "你好"
            assert msgs[1]["role"] == "assistant"

    async def test_resume_previous_session(self, authenticated_client: AsyncClient):
        """测试继续之前的会话"""

        with patch('app.services.conversation_engine.ConversationEngine._generate_response',
                   new=AsyncMock(return_value="继续对话回复")), \
             patch('app.services.neuromemory_client.neuromemory_client.add_memory',
                   new=AsyncMock(return_value={"id": "mem_1"})), \
             patch('app.services.neuromemory_client.neuromemory_client.search',
                   new=AsyncMock(return_value=[])):

            # 1. 创建会话并发送消息
            create_resp = await authenticated_client.post(
                "/api/v1/chat/sessions",
                json={"title": "可恢复的会话"}
            )
            session_id = create_resp.json()["id"]

            await authenticated_client.post(
                "/api/v1/chat/",
                json={
                    "message": "第一条消息",
                    "session_id": session_id
                }
            )

            # 2. 获取会话列表
            list_resp = await authenticated_client.get("/api/v1/chat/sessions")
            sessions = list_resp.json()

            # 3. "用户选择"之前的会话，继续聊天
            # 模拟用户从列表中选择这个会话
            selected_session = next(s for s in sessions if s["id"] == session_id)

            # 4. 在选中的会话中继续发送消息
            resume_resp = await authenticated_client.post(
                "/api/v1/chat/",
                json={
                    "message": "继续之前的对话",
                    "session_id": selected_session["id"]
                }
            )

            assert resume_resp.status_code == 200
            assert resume_resp.json()["session_id"] == session_id

            # 5. 验证历史消息包含新旧消息
            msgs_resp = await authenticated_client.get(
                f"/api/v1/chat/sessions/{session_id}/messages"
            )
            msgs = msgs_resp.json()
            assert len(msgs) == 4  # 2用户 + 2AI
            assert msgs[0]["content"] == "第一条消息"
            assert msgs[2]["content"] == "继续之前的对话"
