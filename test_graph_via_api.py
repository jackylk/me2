#!/usr/bin/env python3
"""通过 API 测试知识图谱提取"""
import asyncio
import httpx
import asyncpg
import time

BASE_URL = "http://127.0.0.1:8000"
DB_URL = "postgresql://me2_user:me2_secure_password_2026@localhost:5432/me2db"

async def test_graph_extraction():
    """测试知识图谱提取"""

    # 测试消息
    test_message = "我2月15日去了前海滑雪场滑雪"
    print(f"📝 测试消息: {test_message}\n")

    # Disable proxy for local connections
    async with httpx.AsyncClient(trust_env=False) as client:
        # 1. 注册/登录测试用户
        import random
        import string
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
        username = f"graph_test_{random_suffix}"
        password = "test123456"

        email = f"{username}@test.com"
        print(f"🔑 注册新用户: {username}")
        try:
            # 尝试注册
            reg_response = await client.post(
                f"{BASE_URL}/api/v1/auth/register",
                json={"username": username, "email": email, "password": password}
            )
            print(f"   注册响应码: {reg_response.status_code}")
            if reg_response.status_code == 200:
                print("✅ 用户注册成功")
            else:
                print(f"   注册失败: {reg_response.text}")
                if reg_response.status_code == 400:
                    return
        except Exception as e:
            print(f"   注册异常: {e}")
            import traceback
            traceback.print_exc()
            return

        # 登录
        login_response = await client.post(
            f"{BASE_URL}/api/v1/auth/login",
            json={"username": username, "password": password}
        )

        if login_response.status_code != 200:
            print(f"❌ 登录失败 (状态码: {login_response.status_code})")
            print(f"   响应: {login_response.text}")
            return

        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print(f"✅ 登录成功\n")

        # 2. 发送测试消息
        print(f"💬 发送测试消息...")
        start_time = time.time()

        chat_response = await client.post(
            f"{BASE_URL}/api/v1/chat/",
            json={"message": test_message},
            headers=headers,
            timeout=30.0
        )
        elapsed = (time.time() - start_time) * 1000

        if chat_response.status_code != 200:
            print(f"❌ 发送失败 (状态码: {chat_response.status_code})")
            print(f"   响应: {chat_response.text}")
            return

        result = chat_response.json()
        print(f"✅ 消息发送成功 ({elapsed:.0f}ms)")
        print(f"   AI 回复: {result['response'][:100]}...")

        # 3. 等待后台提取任务完成
        print(f"\n⏳ 等待后台提取任务完成 (8秒)...")
        await asyncio.sleep(8)

    # 4. 直接查询 NeuroMemory 数据库
    print(f"\n🔍 查询 NeuroMemory 数据库...")

    # 获取 user_id
    conn = await asyncpg.connect(DB_URL)
    try:
        user_record = await conn.fetchrow(
            "SELECT id FROM users WHERE username = $1",
            username
        )
        if not user_record:
            print("❌ 未找到用户")
            return

        user_id = str(user_record['id'])
        print(f"   用户ID: {user_id}")

        # 查询 embeddings 表（NeuroMemory 的记忆存储）
        print(f"\n📊 查询记忆统计...")
        stats = await conn.fetch("""
            SELECT memory_type, COUNT(*) as count
            FROM embeddings
            WHERE user_id = $1
            GROUP BY memory_type
            ORDER BY count DESC
        """, user_id)

        if stats:
            print(f"   记忆类型统计:")
            for row in stats:
                print(f"      • {row['memory_type']}: {row['count']} 条")
        else:
            print(f"   ⚠️  未找到任何记忆")

        # 查询所有记忆详情
        print(f"\n📋 最近的记忆详情:")
        memories = await conn.fetch("""
            SELECT
                memory_type,
                content,
                metadata,
                created_at
            FROM embeddings
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 10
        """, user_id)

        if memories:
            for i, mem in enumerate(memories, 1):
                print(f"\n   {i}. 类型: {mem['memory_type']}")
                print(f"      内容: {mem['content']}")
                if mem['metadata']:
                    metadata = mem['metadata']
                    print(f"      元数据: {metadata}")
                    # 如果是三元组，显示关系
                    if mem['memory_type'] == 'triple' and 'relation' in metadata:
                        print(f"         主体: {metadata.get('subject', 'N/A')}")
                        print(f"         关系: {metadata.get('relation', 'N/A')}")
                        print(f"         客体: {metadata.get('object', 'N/A')}")
                print(f"      时间: {mem['created_at']}")
        else:
            print(f"   ⚠️  未找到任何记忆")

        # 专门查询知识图谱 (triple)
        print(f"\n🔗 知识图谱三元组:")
        triples = await conn.fetch("""
            SELECT content, metadata
            FROM embeddings
            WHERE user_id = $1 AND memory_type = 'triple'
            ORDER BY created_at DESC
        """, user_id)

        if triples:
            print(f"   ✅ 找到 {len(triples)} 个三元组:")
            for triple in triples:
                metadata = triple['metadata']
                print(f"\n      内容: {triple['content']}")
                if metadata:
                    print(f"      主体: {metadata.get('subject', 'N/A')}")
                    print(f"      关系: {metadata.get('relation', 'N/A')}")
                    print(f"      客体: {metadata.get('object', 'N/A')}")
        else:
            print(f"   ⚠️  未找到知识图谱三元组")

        # 查询对话记录（conversations 表）
        print(f"\n💬 对话记录:")
        conversations = await conn.fetch("""
            SELECT role, content, created_at
            FROM conversations
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 5
        """, user_id)

        if conversations:
            for conv in conversations:
                print(f"   [{conv['role']}] {conv['content']}")
        else:
            print(f"   ⚠️  未找到对话记录")

    finally:
        await conn.close()

    print("\n✅ 测试完成")
    print("\n" + "="*60)
    print("📝 结论:")
    print("="*60)
    if triples:
        print("✅ NeuroMemory 成功提取了知识图谱三元组!")
        print(f"   提取到 {len(triples)} 个三元组关系")
    else:
        print("⚠️  NeuroMemory 没有提取知识图谱三元组")
        print("   可能原因:")
        print("   1. 提取策略没有启用三元组提取")
        print("   2. LLM 认为这条消息不包含明显的实体关系")
        print("   3. 后台任务还未完成（需要等待更长时间）")

if __name__ == "__main__":
    asyncio.run(test_graph_extraction())
