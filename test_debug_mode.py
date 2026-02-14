#!/usr/bin/env python3
"""
测试调试模式和对话历史功能
"""
import asyncio
import requests
import json
import os

# 禁用代理
os.environ['NO_PROXY'] = '*'
os.environ['no_proxy'] = '*'

API_URL = "http://127.0.0.1:8000/api/v1"

def print_separator(title=""):
    print(f"\n{'='*80}")
    if title:
        print(f"  {title}")
        print(f"{'='*80}")
    print()

def register_user():
    """注册测试用户"""
    import random
    username = f"test_user_{random.randint(1000, 9999)}"

    resp = requests.post(
        f"{API_URL}/auth/register",
        json={
            "username": username,
            "email": f"{username}@test.com",
            "password": "test123456"
        }
    )

    if resp.status_code == 200:
        data = resp.json()
        print(f"✅ 注册成功: {username}")
        return data["access_token"], username
    else:
        print(f"❌ 注册失败: {resp.text}")
        return None, None

def chat(token, message, session_id=None, debug_mode=False):
    """发送聊天消息"""
    payload = {"message": message, "debug_mode": debug_mode}
    if session_id:
        payload["session_id"] = session_id  # 复用会话ID

    resp = requests.post(
        f"{API_URL}/chat/",
        headers={"Authorization": f"Bearer {token}"},
        json=payload
    )

    if resp.status_code == 200:
        return resp.json()
    else:
        print(f"❌ 聊天失败: {resp.text}")
        return None

def print_debug_info(debug_info):
    """打印调试信息"""
    print_separator("📋 发送给 DeepSeek 的完整 Prompt")

    messages = debug_info.get("messages", [])

    print(f"📊 总览:")
    print(f"  模型: {debug_info.get('model')}")
    print(f"  温度: {debug_info.get('temperature')}")
    print(f"  最大Tokens: {debug_info.get('max_tokens')}")
    print(f"  消息数量: {debug_info.get('message_count')}")
    print(f"  历史对话: {debug_info.get('history_count')} 条\n")

    for i, msg in enumerate(messages, 1):
        role = msg['role']
        content = msg['content']

        if role == "system":
            print(f"{'─'*80}")
            print(f"[消息 {i}] System Prompt:")
            print(f"{'─'*80}")
            # 显示前800字符
            print(content[:800] + ("..." if len(content) > 800 else ""))
        elif role == "user":
            print(f"\n[消息 {i}] User:")
            print(f"  {content}")
        elif role == "assistant":
            print(f"\n[消息 {i}] Assistant:")
            print(f"  {content}")

    print(f"\n{'='*80}\n")

def main():
    """主测试流程"""
    print_separator("🧪 Me2 调试模式测试")

    # 1. 注册用户
    print("1️⃣ 注册测试用户...")
    token, username = register_user()
    if not token:
        return

    # 2. 第一轮对话（开启调试模式）
    print_separator("2️⃣ 第一轮对话")
    print("用户: 你好，我叫张三，我是程序员")

    session_id = None  # 初始化会话ID
    result = chat(token, "你好，我叫张三，我是程序员", session_id=session_id, debug_mode=True)
    if result:
        session_id = result.get("session_id")  # 获取会话ID
        print(f"📌 会话ID: {session_id}\n")

        if "debug_info" in result:
            print_debug_info(result["debug_info"])

        print(f"Me2: {result['response']}")
        print(f"💡 召回 {result['memories_recalled']} 条记忆 | 历史对话 {result['history_messages_count']} 轮\n")

    # 3. 第二轮对话（复用会话）
    print_separator("3️⃣ 第二轮对话")
    print("用户: 我喜欢打篮球")
    print(f"📌 使用会话ID: {session_id}\n")

    result = chat(token, "我喜欢打篮球", session_id=session_id, debug_mode=True)
    if result:
        if "debug_info" in result:
            print_debug_info(result["debug_info"])

        print(f"Me2: {result['response']}")
        print(f"💡 召回 {result['memories_recalled']} 条记忆 | 历史对话 {result['history_messages_count']} 轮\n")

    # 4. 第三轮对话（测试记忆）
    print_separator("4️⃣ 第三轮对话（测试记忆）")
    print("用户: 你记得我叫什么名字吗？我的职业是什么？我喜欢什么运动？")
    print(f"📌 使用会话ID: {session_id}\n")

    result = chat(token, "你记得我叫什么名字吗？我的职业是什么？我喜欢什么运动？", session_id=session_id, debug_mode=True)
    if result:
        if "debug_info" in result:
            print_debug_info(result["debug_info"])

        print(f"Me2: {result['response']}")
        print(f"💡 召回 {result['memories_recalled']} 条记忆 | 历史对话 {result['history_messages_count']} 轮\n")

    print_separator("✅ 测试完成")

    print("验证要点:")
    print("1. 第二轮的历史对话应该是 2 条（第一轮的 user + assistant）")
    print("2. 第三轮的历史对话应该是 4 条（两轮完整对话）")
    print("3. System Prompt 应该包含召回的记忆")
    print("4. AI 应该能够正确回答名字、职业和爱好")

if __name__ == "__main__":
    main()
