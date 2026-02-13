#!/usr/bin/env python3
"""
测试记忆管理功能
"""
import asyncio
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.db.database import AsyncSessionLocal
from app.services.neuromemory_client import neuromemory_client


async def test_add_memories():
    """测试添加记忆"""
    print("=" * 50)
    print("测试添加记忆")
    print("=" * 50)

    user_id = "test_user_001"

    test_memories = [
        {
            "content": "我女儿叫小灿，今年3岁了",
            "memory_type": "fact",
            "metadata": {"source": "chat", "entities": [{"name": "小灿", "type": "person"}]}
        },
        {
            "content": "我喜欢在周末去公园散步",
            "memory_type": "preference",
            "metadata": {"source": "chat"}
        },
        {
            "content": "上周五我们去了迪士尼乐园",
            "memory_type": "event",
            "metadata": {"source": "chat", "entities": [{"name": "迪士尼乐园", "type": "place"}]}
        },
        {
            "content": "我认为工作和生活的平衡很重要",
            "memory_type": "knowledge",
            "metadata": {"source": "chat"}
        },
        {
            "content": "我在一家科技公司做产品经理",
            "memory_type": "fact",
            "metadata": {"source": "chat"}
        },
    ]

    print(f"\n为用户 {user_id} 添加 {len(test_memories)} 条测试记忆...\n")

    for i, memory in enumerate(test_memories, 1):
        result = await neuromemory_client.add_memory(
            user_id=user_id,
            content=memory["content"],
            memory_type=memory["memory_type"],
            metadata=memory["metadata"]
        )
        print(f"  {i}. 添加成功: {memory['content'][:30]}...")

    print(f"\n✓ 所有记忆添加完成")


async def test_search_memories():
    """测试记忆搜索"""
    print("\n" + "=" * 50)
    print("测试记忆搜索")
    print("=" * 50)

    user_id = "test_user_001"
    queries = [
        "我女儿叫什么？",
        "周末喜欢做什么？",
        "最近去了哪里？",
    ]

    for query in queries:
        print(f"\n查询: {query}")
        results = await neuromemory_client.search(
            user_id=user_id,
            query=query,
            limit=3,
            threshold=0.6
        )

        print(f"找到 {len(results)} 条相关记忆:")
        for i, result in enumerate(results, 1):
            content = result.get("content", "")
            score = result.get("score", 0)
            print(f"  {i}. [{score:.2f}] {content[:50]}...")


async def test_recent_memories():
    """测试获取最近记忆"""
    print("\n" + "=" * 50)
    print("测试获取最近记忆")
    print("=" * 50)

    user_id = "test_user_001"

    memories = await neuromemory_client.get_recent_memories(
        user_id=user_id,
        days=7,
        limit=10
    )

    print(f"\n找到最近 7 天的 {len(memories)} 条记忆:")
    for i, memory in enumerate(memories, 1):
        content = memory.get("content", "")
        memory_type = memory.get("memory_type", "unknown")
        print(f"  {i}. [{memory_type}] {content[:50]}...")


async def test_timeline():
    """测试时间线聚合"""
    print("\n" + "=" * 50)
    print("测试时间线聚合")
    print("=" * 50)

    user_id = "test_user_001"

    # 获取最近记忆并按日期分组
    memories = await neuromemory_client.get_recent_memories(
        user_id=user_id,
        days=30,
        limit=100
    )

    from collections import defaultdict
    from datetime import datetime

    timeline = defaultdict(list)
    for memory in memories:
        timestamp = memory.get("timestamp")
        if timestamp:
            if isinstance(timestamp, str):
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            else:
                dt = timestamp
            date = dt.strftime("%Y-%m-%d")
            timeline[date].append(memory)

    print(f"\n时间线统计:")
    for date in sorted(timeline.keys(), reverse=True)[:7]:
        count = len(timeline[date])
        print(f"  {date}: {count} 条记忆")


async def test_graph_extraction():
    """测试知识图谱提取"""
    print("\n" + "=" * 50)
    print("测试知识图谱提取")
    print("=" * 50)

    user_id = "test_user_001"

    # 获取记忆
    memories = await neuromemory_client.get_recent_memories(
        user_id=user_id,
        days=30,
        limit=50
    )

    # 提取实体
    entities = set()
    for memory in memories:
        metadata = memory.get("metadata", {})
        memory_entities = metadata.get("entities", [])
        for entity in memory_entities:
            entity_name = entity.get("name")
            entity_type = entity.get("type")
            if entity_name:
                entities.add((entity_name, entity_type))

    print(f"\n提取到 {len(entities)} 个实体:")
    for name, entity_type in list(entities)[:10]:
        print(f"  - {name} ({entity_type})")


async def test_correction():
    """测试对话式纠正"""
    print("\n" + "=" * 50)
    print("测试对话式纠正")
    print("=" * 50)

    # 这个功能需要通过 API 测试，因为涉及 LLM 调用
    print("\n对话式纠正需要通过 Web UI 或 API 测试")
    print("示例: POST /api/v1/memories/{user_id}/correct")
    print('Body: {"correction": "我女儿不叫灿灿，叫小灿"}')


async def main():
    """主函数"""
    try:
        # 测试添加记忆
        await test_add_memories()

        # 等待一下让记忆被索引
        await asyncio.sleep(1)

        # 测试搜索
        await test_search_memories()

        # 测试最近记忆
        await test_recent_memories()

        # 测试时间线
        await test_timeline()

        # 测试图谱提取
        await test_graph_extraction()

        # 测试纠正
        await test_correction()

        print("\n" + "=" * 50)
        print("✓ 所有测试完成！")
        print("=" * 50)
        print("\n接下来可以:")
        print("1. 启动后端: cd backend && uvicorn app.main:app --reload")
        print("2. 启动前端: cd frontend && npm run dev")
        print("3. 访问 http://localhost:3000/memories 查看记忆管理界面")

    except Exception as e:
        print(f"\n✗ 测试失败: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1

    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
