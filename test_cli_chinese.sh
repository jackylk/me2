#!/bin/bash
# 测试CLI中文输入

cd "$(dirname "$0")"

export NO_PROXY='*'
export no_proxy='*'

echo "测试CLI中文输入功能..."
echo ""
echo "请在CLI中测试以下中文输入："
echo "1. 输入: 你好，我叫张三"
echo "2. 尝试使用 Backspace 删除部分文字"
echo "3. 重新输入完整句子"
echo ""
echo "按Enter开始测试..."
read

python3 cli_chat.py
