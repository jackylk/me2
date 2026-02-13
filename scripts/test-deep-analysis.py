#!/usr/bin/env python3
"""
测试深度思维分析功能
"""
import asyncio
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.db.database import AsyncSessionLocal
from app.services.deep_mimic_engine import DeepMimicEngine


async def test_decision_patterns():
    """测试决策模式学习"""
    print("=" * 50)
    print("测试决策模式学习")
    print("=" * 50)

    user_id = "test_user_001"

    async with AsyncSessionLocal() as db:
        engine = DeepMimicEngine(db)

        print(f"\n学习用户 {user_id} 的决策模式...")
        patterns = await engine.learn_decision_patterns(user_id, days=30)

        print(f"\n✓ 学习完成，识别到 {len(patterns)} 个决策模式:")
        for i, pattern in enumerate(patterns, 1):
            print(f"  {i}. {pattern}")


async def test_values_extraction():
    """测试价值观提取"""
    print("\n" + "=" * 50)
    print("测试价值观提取")
    print("=" * 50)

    user_id = "test_user_001"

    async with AsyncSessionLocal() as db:
        engine = DeepMimicEngine(db)

        print(f"\n提取用户 {user_id} 的价值观...")
        values = await engine.extract_values(user_id, days=90)

        print(f"\n✓ 提取完成，识别到 {len(values)} 个价值观:")
        for value, priority in sorted(values.items(), key=lambda x: x[1], reverse=True):
            print(f"  {value}: {priority:.2f}")


async def test_thinking_template():
    """测试思维模板构建"""
    print("\n" + "=" * 50)
    print("测试思维模板构建")
    print("=" * 50)

    user_id = "test_user_001"

    async with AsyncSessionLocal() as db:
        engine = DeepMimicEngine(db)

        print(f"\n构建用户 {user_id} 的思维模板...")
        template = await engine.build_thinking_template(user_id)

        print("\n✓ 模板构建完成:")
        print(f"\n语言风格:")
        print(f"  语气: {template['language']['tone']}")
        print(f"  常用语: {template['language']['phrases'][:5]}")
        print(f"  表情使用: {template['language']['emoji_usage']:.2f}")

        print(f"\n思维习惯:")
        print(f"  风格: {template['thinking']['style']}")
        if template['thinking']['decision_patterns']:
            print(f"  决策模式: {template['thinking']['decision_patterns'][:3]}")

        print(f"\n价值观:")
        if template['values']:
            for value, priority in list(template['values'].items())[:3]:
                print(f"  {value}: {priority:.2f}")

        print(f"\n元数据:")
        print(f"  置信度: {template['confidence']:.2%}")
        print(f"  样本数: {template['sample_count']}")


async def test_conversation_analysis():
    """测试对话深度分析"""
    print("\n" + "=" * 50)
    print("测试对话深度分析")
    print("=" * 50)

    user_id = "test_user_001"

    # 模拟对话
    test_conversations = [
        "今天工作好累，但完成了一个重要项目",
        "我觉得在做决定时，要综合考虑各方面因素",
        "有时候太理性了反而不好，要相信直觉",
        "家人的意见对我来说很重要",
        "我喜欢在做决定前收集尽可能多的信息",
        "不过有些小事情我会很快做决定",
        "最近在思考职业发展的方向",
        "健康和家庭对我来说是最重要的",
        "我希望在工作和生活之间找到平衡",
        "虽然赚钱重要，但不能以牺牲健康为代价"
    ]

    async with AsyncSessionLocal() as db:
        engine = DeepMimicEngine(db)

        print(f"\n分析 {len(test_conversations)} 条对话...")
        analysis = await engine.analyze_conversation_depth(user_id, test_conversations)

        if "error" in analysis:
            print(f"\n✗ 分析失败: {analysis['error']}")
        else:
            print("\n✓ 分析完成:")
            print(f"\n思考深度: {analysis.get('thinking_depth', 'N/A')}")
            print(f"逻辑性: {analysis.get('logic_level', 'N/A')}")
            print(f"抽象能力: {analysis.get('abstraction', 'N/A')}")
            print(f"情感表达: {analysis.get('emotion_expression', 'N/A')}")
            print(f"自我反思: {analysis.get('self_reflection', 'N/A')}")

            if 'key_insights' in analysis:
                print("\n关键洞察:")
                for i, insight in enumerate(analysis['key_insights'], 1):
                    print(f"  {i}. {insight}")


async def main():
    """主函数"""
    try:
        # 测试决策模式学习
        await test_decision_patterns()

        # 测试价值观提取
        await test_values_extraction()

        # 测试思维模板构建
        await test_thinking_template()

        # 测试对话深度分析
        await test_conversation_analysis()

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
