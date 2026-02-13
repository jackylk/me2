"""
记忆管理 API 测试
"""
import pytest
from unittest.mock import patch, AsyncMock
from datetime import datetime, timezone, timedelta


@pytest.mark.api
@pytest.mark.asyncio
class TestMemoriesAPI:
    """记忆管理 API 测试类"""

    async def test_get_memories(self, client, test_user_id):
        """测试获取记忆列表"""
        mock_memories = [
            {
                "id": "mem_1",
                "content": "测试记忆1",
                "memory_type": "fact",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        ]

        with patch(
            'app.services.neuromemory_client.neuromemory_client.get_by_time_range',
            new=AsyncMock(return_value=mock_memories)
        ):
            response = await client.get(
                f"/api/v1/memories/{test_user_id}",
                params={"limit": 10, "offset": 0}
            )

            assert response.status_code == 200
            data = response.json()
            assert "memories" in data
            assert "total" in data

    async def test_get_recent_memories(self, client, test_user_id):
        """测试获取最近记忆"""
        with patch(
            'app.services.neuromemory_client.neuromemory_client.get_recent_memories',
            new=AsyncMock(return_value=[])
        ):
            response = await client.get(
                f"/api/v1/memories/{test_user_id}/recent",
                params={"days": 7, "limit": 50}
            )

            assert response.status_code == 200
            data = response.json()
            assert "memories" in data

    async def test_get_timeline(self, client, test_user_id):
        """测试获取时间线"""
        with patch(
            'app.services.neuromemory_client.neuromemory_client.get_recent_memories',
            new=AsyncMock(return_value=[])
        ):
            response = await client.get(
                f"/api/v1/memories/{test_user_id}/timeline",
                params={"granularity": "day", "days": 30}
            )

            assert response.status_code == 200
            data = response.json()
            assert "timeline" in data
            assert "granularity" in data

    async def test_get_knowledge_graph(self, client, test_user_id):
        """测试获取知识图谱"""
        with patch(
            'app.services.neuromemory_client.neuromemory_client.get_recent_memories',
            new=AsyncMock(return_value=[])
        ):
            response = await client.get(
                f"/api/v1/memories/{test_user_id}/graph",
                params={"limit": 100}
            )

            assert response.status_code == 200
            data = response.json()
            assert "elements" in data
            assert "nodes" in data["elements"]
            assert "edges" in data["elements"]

    async def test_search_memories(self, client, test_user_id):
        """测试搜索记忆"""
        with patch(
            'app.services.neuromemory_client.neuromemory_client.search',
            new=AsyncMock(return_value=[
                {"id": "mem_1", "content": "搜索结果", "score": 0.9}
            ])
        ):
            response = await client.post(
                f"/api/v1/memories/{test_user_id}/search",
                json={
                    "query": "我女儿叫什么？",
                    "limit": 20,
                    "threshold": 0.7
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert "memories" in data
            assert "query" in data

    async def test_get_memory_stats(self, client, test_user_id):
        """测试获取统计信息"""
        with patch(
            'app.services.neuromemory_client.neuromemory_client.get_recent_memories',
            new=AsyncMock(return_value=[])
        ):
            response = await client.get(
                f"/api/v1/memories/{test_user_id}/stats"
            )

            assert response.status_code == 200
            data = response.json()
            assert "total" in data
            assert "by_type" in data

    async def test_conversational_correct(self, client, test_user_id):
        """测试对话式纠正"""
        with patch('app.services.llm_client.llm_client.generate', new=AsyncMock(
            return_value='{"old_value": "灿灿", "new_value": "小灿", "entity_type": "人物", "search_query": "女儿"}'
        )), \
             patch('app.services.neuromemory_client.neuromemory_client.search', new=AsyncMock(return_value=[])), \
             patch('app.services.neuromemory_client.neuromemory_client.add_memory', new=AsyncMock(return_value={"id": "mem_1"})):

            response = await client.post(
                f"/api/v1/memories/{test_user_id}/correct",
                json={"correction": "我女儿不叫灿灿，叫小灿"}
            )

            assert response.status_code == 200
            data = response.json()
            assert "success" in data
            assert "affected_memories" in data


@pytest.mark.integration
@pytest.mark.asyncio
class TestMemoriesAPIIntegration:
    """记忆管理 API 集成测试"""

    @pytest.mark.requires_db
    async def test_full_memory_workflow(self, client, test_user_id):
        """测试完整记忆工作流"""
        # 1. 添加记忆（通过聊天）
        with patch('app.services.llm_client.llm_client.generate', new=AsyncMock(return_value="回复")), \
             patch('app.services.neuromemory_client.neuromemory_client.add_memory', new=AsyncMock(return_value={"id": "mem_1"})), \
             patch('app.services.neuromemory_client.neuromemory_client.search', new=AsyncMock(return_value=[])):

            chat_response = await client.post(
                "/api/v1/chat",
                json={
                    "user_id": test_user_id,
                    "message": "我女儿叫小灿"
                }
            )
            assert chat_response.status_code == 200

        # 2. 搜索记忆
        with patch('app.services.neuromemory_client.neuromemory_client.search', new=AsyncMock(
            return_value=[{"id": "mem_1", "content": "我女儿叫小灿", "score": 0.95}]
        )):
            search_response = await client.post(
                f"/api/v1/memories/{test_user_id}/search",
                json={"query": "女儿", "limit": 10}
            )
            assert search_response.status_code == 200
            data = search_response.json()
            assert len(data["memories"]) > 0

        # 3. 获取统计
        with patch('app.services.neuromemory_client.neuromemory_client.get_recent_memories', new=AsyncMock(return_value=[])):
            stats_response = await client.get(
                f"/api/v1/memories/{test_user_id}/stats"
            )
            assert stats_response.status_code == 200
