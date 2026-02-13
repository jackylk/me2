#!/usr/bin/env python3
"""
测试记忆导入功能
"""
import asyncio
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.services.importer.wechat_parser import WeChatParser
from app.services.importer.knowledge_extractor import KnowledgeExtractor


async def test_wechat_parser():
    """测试 WeChat 解析器"""
    print("=" * 50)
    print("测试 WeChat 解析器")
    print("=" * 50)

    parser = WeChatParser(user_identifier="张三")
    file_path = os.path.join(os.path.dirname(__file__), 'test-data', 'wechat_sample.txt')

    # 解析
    messages = parser.parse(file_path)
    print(f"\n✓ 解析完成: {len(messages)} 条消息")

    # 统计
    stats = parser.get_statistics(messages)
    print(f"\n统计信息:")
    print(f"  总消息数: {stats['total_messages']}")
    print(f"  用户消息: {stats['user_messages']}")
    print(f"  其他消息: {stats['other_messages']}")
    print(f"  时间跨度: {stats['time_span_days']} 天")

    # 筛选用户消息
    user_messages = parser.filter_user_messages(messages)
    print(f"\n用户消息预览:")
    for msg in user_messages[:3]:
        print(f"  [{msg.timestamp}] {msg.sender}: {msg.content}")

    return user_messages


async def test_knowledge_extractor(user_messages):
    """测试知识提取器"""
    print("\n" + "=" * 50)
    print("测试知识提取器")
    print("=" * 50)

    extractor = KnowledgeExtractor()

    # 提取知识
    print(f"\n开始提取知识...")
    knowledge_list = await extractor.extract_batch(user_messages, batch_size=20)

    print(f"\n✓ 提取完成: {len(knowledge_list)} 条知识")

    # 显示提取的知识
    print(f"\n提取的知识:")
    for i, k in enumerate(knowledge_list, 1):
        print(f"\n{i}. [{k.get('type', 'unknown')}] (置信度: {k.get('confidence', 0):.2f})")
        print(f"   内容: {k.get('content', '')}")
        print(f"   来源: {k.get('source_context', '')}")

    # 生成摘要
    summary = extractor.generate_summary(
        knowledge_list,
        total_messages=len(user_messages) * 2,
        user_messages=len(user_messages)
    )

    print(f"\n导入摘要:")
    print(f"  总消息数: {summary['total_messages']}")
    print(f"  用户消息: {summary['user_messages']}")
    print(f"  提取知识: {summary['extracted_knowledge']}")
    print(f"  平均置信度: {summary['average_confidence']:.2f}")

    if summary['highlights']:
        print(f"\n精彩亮点:")
        for highlight in summary['highlights']:
            print(f"  • {highlight}")


async def main():
    """主函数"""
    try:
        # 测试解析器
        user_messages = await test_wechat_parser()

        # 测试知识提取器
        await test_knowledge_extractor(user_messages)

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
