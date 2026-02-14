#!/bin/bash
# Me2 聊天功能测试脚本

set -e

echo "🧪 运行 Me2 聊天功能测试..."
echo

# 检查是否在虚拟环境中
if [ -z "$VIRTUAL_ENV" ]; then
    echo "⚠️  警告：未检测到虚拟环境"
    echo "建议先激活虚拟环境："
    echo "  source venv/bin/activate"
    echo
fi

# 确保在 backend 目录
cd "$(dirname "$0")"

# 显示测试选项
echo "选择测试类型："
echo "1) 快速测试（单元测试）"
echo "2) 完整测试（单元 + 集成）"
echo "3) 仅会话管理测试"
echo "4) 详细模式（显示所有输出）"
echo

read -p "请选择 (1-4): " choice

case $choice in
    1)
        echo "🏃 运行快速测试..."
        pytest tests/api/test_chat_sessions.py::TestChatSessionsAPI -v --tb=short
        ;;
    2)
        echo "🏃 运行完整测试..."
        pytest tests/api/test_chat_sessions.py -v --tb=short
        ;;
    3)
        echo "🏃 运行会话管理测试..."
        pytest tests/api/test_chat_sessions.py -v -k "session" --tb=short
        ;;
    4)
        echo "🏃 运行详细测试..."
        pytest tests/api/test_chat_sessions.py -vv -s
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo
echo "✅ 测试完成！"
