#!/usr/bin/env python3
"""
迁移脚本：修复 graph_nodes 和 graph_edges 的唯一索引

问题：
- 旧索引 ix_graph_nodes_lookup 只包含 (node_type, node_id)
- 新索引需要包含 (user_id, node_type, node_id) 以实现用户隔离

解决方案：
1. 删除旧的唯一索引
2. 创建新的唯一索引（包含 user_id）
"""
import asyncio
import asyncpg

DB_URL = "postgresql://me2_user:me2_secure_password_2026@localhost:5432/me2db"

async def migrate():
    print("🔧 开始迁移 graph 索引...\n")

    conn = await asyncpg.connect(DB_URL)
    try:
        # 1. 检查当前索引
        print("1️⃣ 检查当前索引...")
        indexes = await conn.fetch("""
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename IN ('graph_nodes', 'graph_edges')
            ORDER BY tablename, indexname
        """)

        print("   当前索引:")
        for idx in indexes:
            print(f"      • {idx['indexname']}")
            print(f"        {idx['indexdef']}")

        # 2. 删除旧的 graph_nodes 唯一索引
        print("\n2️⃣ 删除旧的 graph_nodes 唯一索引...")
        try:
            await conn.execute("DROP INDEX IF EXISTS ix_graph_nodes_lookup")
            print("   ✅ 已删除 ix_graph_nodes_lookup")
        except Exception as e:
            print(f"   ⚠️  删除失败: {e}")

        # 3. 创建新的 graph_nodes 唯一索引（包含 user_id）
        print("\n3️⃣ 创建新的 graph_nodes 唯一索引...")
        try:
            await conn.execute("""
                CREATE UNIQUE INDEX ix_graph_nodes_lookup
                ON graph_nodes (user_id, node_type, node_id)
            """)
            print("   ✅ 已创建 ix_graph_nodes_lookup (user_id, node_type, node_id)")
        except Exception as e:
            print(f"   ⚠️  创建失败: {e}")
            if "already exists" in str(e):
                print("   索引已存在，跳过")

        # 4. 删除旧的 graph_edges 索引
        print("\n4️⃣ 更新 graph_edges 索引...")
        try:
            await conn.execute("DROP INDEX IF EXISTS ix_graph_edges_lookup")
            print("   ✅ 已删除旧的 ix_graph_edges_lookup")
        except Exception as e:
            print(f"   ⚠️  删除失败: {e}")

        # 5. 创建新的 graph_edges 索引（包含 user_id）
        try:
            await conn.execute("""
                CREATE INDEX ix_graph_edges_lookup
                ON graph_edges (user_id, source_type, source_id, edge_type, target_type, target_id)
            """)
            print("   ✅ 已创建 ix_graph_edges_lookup (包含 user_id)")
        except Exception as e:
            print(f"   ⚠️  创建失败: {e}")
            if "already exists" in str(e):
                print("   索引已存在，跳过")

        # 6. 验证新索引
        print("\n5️⃣ 验证新索引...")
        new_indexes = await conn.fetch("""
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename IN ('graph_nodes', 'graph_edges')
            AND indexname LIKE 'ix_graph%'
            ORDER BY tablename, indexname
        """)

        print("   新索引:")
        for idx in new_indexes:
            print(f"      • {idx['indexname']}")
            print(f"        {idx['indexdef']}")

        # 7. 检查数据完整性
        print("\n6️⃣ 检查数据完整性...")
        node_count = await conn.fetchval("SELECT COUNT(*) FROM graph_nodes")
        edge_count = await conn.fetchval("SELECT COUNT(*) FROM graph_edges")
        print(f"   graph_nodes: {node_count} 条")
        print(f"   graph_edges: {edge_count} 条")

        print("\n✅ 迁移完成！")
        print("\n📋 变更摘要:")
        print("   • graph_nodes 唯一索引: (node_type, node_id) → (user_id, node_type, node_id)")
        print("   • graph_edges 索引: 添加 user_id 作为第一列")
        print("   • 用户隔离: 不同用户现在可以创建相同名称的节点")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(migrate())
