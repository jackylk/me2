#!/usr/bin/env python3
"""
测试思维模仿引擎
"""
import asyncio
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.db.database import AsyncSessionLocal
from app.services.mimic_engine import MimicEngine


async def test_learn_from_batch():
    """测试批量学习"""
    # 模拟用户消息
    test_messages = [
        "哈哈，今天天气真好！",
        "确实是这样的",
        "我觉得这个方案不错",
        "嗯嗯，可以试试看",
        "真的吗？那太棒了！",
        "好的好的，我知道了",
        "哇，这个太厉害了！！！",
        "没问题，交给我吧",
        "明天见～",
        "今天心情不错😊",
    ]

    async with AsyncSessionLocal() as db:
        engine = MimicEngine(db)

        print("开始批量学习...")
        print(f"测试消息数量: {len(test_messages)}")

        # 批量学习
        profile = await engine.learn_from_batch(
            user_id="test_user_001",
            messages=test_messages
        )

        print("\n学习完成！")
        print(f"语气风格: {profile.tone_style}")
        print(f"常用短语: {profile.common_phrases[:5]}")
        print(f"表情使用: {profile.emoji_usage:.2f}")
        print(f"思维方式: {profile.thinking_style}")
        print(f"回复长度: {profile.response_length}")
        print(f"置信度: {profile.confidence:.2%}")
        print(f"样本数: {profile.sample_count}")


async def test_incremental_learning():
    """测试增量学习"""
    test_messages = [
        "今天真是太累了",
        "不过还是要坚持",
        "加油吧！"
    ]

    async with AsyncSessionLocal() as db:
        engine = MimicEngine(db)

        print("\n开始增量学习...")

        for msg in test_messages:
            await engine.learn_from_message(
                user_id="test_user_001",
                message=msg
            )
            print(f"✓ 学习: {msg}")

        # 获取更新后的画像
        profile_dict = await engine.get_profile_dict("test_user_001")
        print("\n增量学习完成！")
        print(f"当前画像: {profile_dict}")


async def main():
    """主函数"""
    print("=" * 50)
    print("思维模仿引擎测试")
    print("=" * 50)

    # 测试批量学习
    await test_learn_from_batch()

    # 测试增量学习
    await test_incremental_learning()

    print("\n" + "=" * 50)
    print("测试完成！")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
