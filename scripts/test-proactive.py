#!/usr/bin/env python3
"""
测试主动关心功能
"""
import asyncio
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.db.database import AsyncSessionLocal
from app.services.proactive_engine import ProactiveEngine


async def test_check_and_contact():
    """测试主动关心决策"""
    print("=" * 50)
    print("测试主动关心引擎")
    print("=" * 50)

    user_id = "test_user_001"

    async with AsyncSessionLocal() as db:
        engine = ProactiveEngine(db)

        print(f"\n检查用户: {user_id}")

        # 执行检查
        result = await engine.check_and_contact(user_id)

        if result:
            print("\n✓ 需要主动联系")
            print(f"  消息 ID: {result['contact_id']}")
            print(f"  触发类型: {result['trigger_type']}")
            print(f"  触发原因: {result['reason']}")
            print(f"  生成消息: {result['message']}")
        else:
            print("\n✗ 暂不需要主动联系")


async def test_get_pending_messages():
    """测试获取待发送消息"""
    print("\n" + "=" * 50)
    print("测试获取待发送消息")
    print("=" * 50)

    user_id = "test_user_001"

    async with AsyncSessionLocal() as db:
        engine = ProactiveEngine(db)

        messages = await engine.get_pending_messages(user_id)

        print(f"\n找到 {len(messages)} 条待发送消息")

        for i, msg in enumerate(messages, 1):
            print(f"\n消息 {i}:")
            print(f"  ID: {msg['contact_id']}")
            print(f"  类型: {msg['trigger_type']}")
            print(f"  内容: {msg['message']}")


async def test_scheduler_jobs():
    """测试调度器任务"""
    print("\n" + "=" * 50)
    print("测试调度器")
    print("=" * 50)

    from app.schedulers.proactive_scheduler import proactive_scheduler

    # 获取所有任务
    jobs = proactive_scheduler.get_jobs()

    print(f"\n调度器任务列表 ({len(jobs)} 个):")
    for job in jobs:
        print(f"\n  任务: {job.name}")
        print(f"  ID: {job.id}")
        print(f"  触发器: {job.trigger}")
        if job.next_run_time:
            print(f"  下次运行: {job.next_run_time}")


async def main():
    """主函数"""
    try:
        # 测试主动关心决策
        await test_check_and_contact()

        # 测试获取消息
        await test_get_pending_messages()

        # 测试调度器
        await test_scheduler_jobs()

        print("\n" + "=" * 50)
        print("✓ 所有测试完成！")
        print("=" * 50)

    except Exception as e:
        print(f"\n✗ 测试失败: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1

    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
