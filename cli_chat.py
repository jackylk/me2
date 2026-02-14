#!/usr/bin/env python3
"""
Me2 CLI 聊天客户端
快速测试聊天功能的命令行工具
"""

import os
import sys
import requests
import json
from datetime import datetime
from typing import Optional, Dict, Any

# 禁用代理
os.environ['NO_PROXY'] = '*'
os.environ['no_proxy'] = '*'

# 使用 prompt_toolkit 以更好地支持中文输入
try:
    from prompt_toolkit import prompt, HTML
    from prompt_toolkit.history import InMemoryHistory
    from prompt_toolkit.auto_suggest import AutoSuggestFromHistory
    from prompt_toolkit.styles import Style
    USE_PROMPT_TOOLKIT = True
except ImportError:
    USE_PROMPT_TOOLKIT = False
    print("提示: 安装 prompt_toolkit 以获得更好的中文输入体验")
    print("运行: pip install prompt_toolkit")

# ANSI 颜色代码
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

class Me2CLI:
    def __init__(self, api_url: str = "http://127.0.0.1:8000/api/v1"):
        self.api_url = api_url
        self.token: Optional[str] = None
        self.user_id: Optional[str] = None
        self.username: Optional[str] = None
        self.session_id: Optional[str] = None
        self.debug_mode: bool = False  # 调试模式

    def print_header(self):
        """打印欢迎头部"""
        print(f"\n{Colors.CYAN}{Colors.BOLD}{'='*60}")
        print("  Me2 - 个人陪伴 AI Agent (CLI版)")
        print(f"{'='*60}{Colors.ENDC}\n")

    def print_separator(self):
        """打印分隔线"""
        print(f"{Colors.CYAN}{'─'*60}{Colors.ENDC}")

    def register(self, username: str, email: str, password: str) -> bool:
        """注册新用户"""
        try:
            resp = requests.post(
                f"{self.api_url}/auth/register",
                json={
                    "username": username,
                    "email": email,
                    "password": password
                },
                timeout=10
            )

            if resp.status_code == 200:
                data = resp.json()
                self.token = data["access_token"]
                # 获取用户信息
                self.username = username
                print(f"{Colors.GREEN}✅ 注册成功！欢迎，{username}！{Colors.ENDC}")
                return True
            else:
                print(f"{Colors.RED}❌ 注册失败: {resp.text}{Colors.ENDC}")
                return False

        except Exception as e:
            print(f"{Colors.RED}❌ 注册出错: {str(e)}{Colors.ENDC}")
            return False

    def login(self, username: str, password: str) -> bool:
        """用户登录"""
        try:
            resp = requests.post(
                f"{self.api_url}/auth/login",
                json={
                    "username": username,
                    "password": password
                },
                timeout=10
            )

            if resp.status_code == 200:
                data = resp.json()
                self.token = data["access_token"]
                self.username = username
                print(f"{Colors.GREEN}✅ 登录成功！欢迎回来，{username}！{Colors.ENDC}")
                return True
            else:
                print(f"{Colors.RED}❌ 登录失败: {resp.text}{Colors.ENDC}")
                return False

        except Exception as e:
            print(f"{Colors.RED}❌ 登录出错: {str(e)}{Colors.ENDC}")
            return False

    def chat(self, message: str) -> Optional[Dict[str, Any]]:
        """发送聊天消息"""
        if not self.token:
            print(f"{Colors.RED}❌ 未登录，请先登录{Colors.ENDC}")
            return None

        try:
            resp = requests.post(
                f"{self.api_url}/chat/",
                headers={
                    "Authorization": f"Bearer {self.token}",
                    "Content-Type": "application/json"
                },
                json={
                    "message": message,
                    "debug_mode": self.debug_mode
                },
                timeout=30
            )

            if resp.status_code == 200:
                data = resp.json()
                self.session_id = data.get("session_id")
                return data
            else:
                print(f"{Colors.RED}❌ 发送消息失败: {resp.text}{Colors.ENDC}")
                return None

        except Exception as e:
            print(f"{Colors.RED}❌ 发送消息出错: {str(e)}{Colors.ENDC}")
            return None

    def print_debug_info(self, debug_info: Dict[str, Any]):
        """打印调试信息"""
        print(f"\n{Colors.YELLOW}{'═'*80}{Colors.ENDC}")
        print(f"{Colors.YELLOW}{Colors.BOLD}📋 发送给 DeepSeek 的完整 Prompt{Colors.ENDC}")
        print(f"{Colors.YELLOW}{'═'*80}{Colors.ENDC}")

        messages = debug_info.get("messages", [])

        print(f"\n{Colors.CYAN}📊 总览:{Colors.ENDC}")
        print(f"  模型: {debug_info.get('model')}")
        print(f"  温度: {debug_info.get('temperature')}")
        print(f"  最大Tokens: {debug_info.get('max_tokens')}")
        print(f"  消息数量: {debug_info.get('message_count')}")
        print(f"  历史对话: {debug_info.get('history_count')} 条")

        for i, msg in enumerate(messages, 1):
            role = msg['role']
            content = msg['content']

            if role == "system":
                print(f"\n{Colors.YELLOW}{'─'*80}{Colors.ENDC}")
                print(f"{Colors.YELLOW}[消息 {i}] {Colors.BOLD}System Prompt:{Colors.ENDC}")
                print(f"{Colors.YELLOW}{'─'*80}{Colors.ENDC}")
                # 显示前800字符
                print(content[:800] + ("..." if len(content) > 800 else ""))

            elif role == "user":
                print(f"\n{Colors.BLUE}[消息 {i}] User:{Colors.ENDC}")
                print(f"  {content}")

            elif role == "assistant":
                print(f"\n{Colors.GREEN}[消息 {i}] Assistant:{Colors.ENDC}")
                print(f"  {content}")

        print(f"\n{Colors.YELLOW}{'═'*80}{Colors.ENDC}\n")

    def print_message(self, role: str, content: str, metadata: Optional[Dict] = None):
        """打印消息"""
        timestamp = datetime.now().strftime("%H:%M:%S")

        if role == "user":
            print(f"\n{Colors.BLUE}[{timestamp}] 你:{Colors.ENDC}")
            print(f"  {content}")
        else:
            print(f"\n{Colors.GREEN}[{timestamp}] Me2:{Colors.ENDC}")
            print(f"  {content}")

            # 显示元数据
            if metadata:
                memories = metadata.get("memories_recalled", 0)
                insights = metadata.get("insights_used", 0)
                history = metadata.get("history_messages_count", 0)

                info_parts = []
                if memories > 0:
                    info_parts.append(f"召回 {memories} 条记忆")
                if insights > 0:
                    info_parts.append(f"使用 {insights} 条洞察")
                if history > 0:
                    info_parts.append(f"历史对话 {history} 轮")

                if info_parts:
                    print(f"{Colors.CYAN}  💡 {' | '.join(info_parts)}{Colors.ENDC}")

    def interactive_chat(self):
        """交互式聊天循环"""
        print(f"\n{Colors.YELLOW}💬 开始聊天{Colors.ENDC}")
        print(f"{Colors.CYAN}命令:{Colors.ENDC}")
        print(f"  quit/exit - 退出")
        print(f"  /debug on - 开启调试模式")
        print(f"  /debug off - 关闭调试模式")
        print(f"  /status - 显示当前状态")
        self.print_separator()

        # 初始化历史记录和样式
        if USE_PROMPT_TOOLKIT:
            history = InMemoryHistory()
            # 定义prompt_toolkit的样式
            style = Style.from_dict({
                'prompt': 'bold',
            })

        while True:
            try:
                # 获取用户输入
                if USE_PROMPT_TOOLKIT:
                    # 使用 prompt_toolkit，支持更好的中文编辑
                    # 不在prompt字符串中使用ANSI代码
                    user_input = prompt(
                        "\n你: ",
                        history=history,
                        auto_suggest=AutoSuggestFromHistory(),
                        style=style,
                    ).strip()
                else:
                    # 降级使用标准 input
                    user_input = input(f"\n{Colors.BOLD}你: {Colors.ENDC}").strip()

                # 检查退出命令
                if user_input.lower() in ['quit', 'exit', 'q', '退出']:
                    print(f"\n{Colors.YELLOW}👋 再见！{Colors.ENDC}\n")
                    break

                # 检查调试命令
                if user_input.lower() == '/debug on':
                    self.debug_mode = True
                    print(f"{Colors.GREEN}✅ 调试模式已开启（会显示完整prompt）{Colors.ENDC}")
                    continue

                if user_input.lower() == '/debug off':
                    self.debug_mode = False
                    print(f"{Colors.YELLOW}调试模式已关闭{Colors.ENDC}")
                    continue

                # 检查状态命令
                if user_input.lower() == '/status':
                    print(f"\n{Colors.CYAN}当前状态:{Colors.ENDC}")
                    print(f"  用户: {self.username}")
                    print(f"  会话ID: {self.session_id or '未开始'}")
                    print(f"  调试模式: {'开启' if self.debug_mode else '关闭'}")
                    continue

                # 跳过空输入
                if not user_input:
                    continue

                # 发送消息
                print(f"{Colors.CYAN}  ⏳ 思考中...{Colors.ENDC}", end='\r')
                response = self.chat(user_input)

                if response:
                    # 清除"思考中"提示
                    print(" " * 20, end='\r')

                    # 显示调试信息（如果开启）
                    if self.debug_mode and "debug_info" in response:
                        self.print_debug_info(response["debug_info"])

                    # 显示AI回复
                    self.print_message(
                        "assistant",
                        response["response"],
                        {
                            "memories_recalled": response.get("memories_recalled", 0),
                            "insights_used": response.get("insights_used", 0),
                            "history_messages_count": response.get("history_messages_count", 0)
                        }
                    )

            except KeyboardInterrupt:
                print(f"\n\n{Colors.YELLOW}👋 再见！{Colors.ENDC}\n")
                break
            except Exception as e:
                print(f"\n{Colors.RED}❌ 错误: {str(e)}{Colors.ENDC}")

    def run(self):
        """运行CLI"""
        self.print_header()

        # 登录或注册
        print(f"{Colors.BOLD}选择操作:{Colors.ENDC}")
        print("  1. 登录")
        print("  2. 注册新账号")
        print("  3. 快速开始（自动创建测试账号）")

        choice = input(f"\n{Colors.BOLD}请选择 (1/2/3): {Colors.ENDC}").strip()

        if choice == "1":
            # 登录
            if USE_PROMPT_TOOLKIT:
                username = prompt("用户名: ").strip()
                password = prompt("密码: ", is_password=True).strip()
            else:
                username = input(f"{Colors.BOLD}用户名: {Colors.ENDC}").strip()
                password = input(f"{Colors.BOLD}密码: {Colors.ENDC}").strip()

            if not self.login(username, password):
                print(f"\n{Colors.RED}登录失败，程序退出{Colors.ENDC}\n")
                return

        elif choice == "2":
            # 注册
            if USE_PROMPT_TOOLKIT:
                username = prompt("用户名: ").strip()
                email = prompt("邮箱: ").strip()
                password = prompt("密码: ", is_password=True).strip()
            else:
                username = input(f"{Colors.BOLD}用户名: {Colors.ENDC}").strip()
                email = input(f"{Colors.BOLD}邮箱: {Colors.ENDC}").strip()
                password = input(f"{Colors.BOLD}密码: {Colors.ENDC}").strip()

            if not self.register(username, email, password):
                print(f"\n{Colors.RED}注册失败，程序退出{Colors.ENDC}\n")
                return

        elif choice == "3":
            # 快速开始
            import random
            username = f"cli_user_{random.randint(1000, 9999)}"
            email = f"{username}@test.com"
            password = "test123456"

            print(f"\n{Colors.CYAN}⚡ 快速创建测试账号...{Colors.ENDC}")
            print(f"   用户名: {username}")

            if not self.register(username, email, password):
                print(f"\n{Colors.RED}创建账号失败，程序退出{Colors.ENDC}\n")
                return
        else:
            print(f"\n{Colors.RED}无效选择，程序退出{Colors.ENDC}\n")
            return

        # 开始聊天
        self.interactive_chat()


def main():
    """主函数"""
    # 检查后端连接
    api_url = "http://127.0.0.1:8000/api/v1"

    try:
        resp = requests.get(f"http://127.0.0.1:8000/docs", timeout=2)
        if resp.status_code != 200:
            print(f"{Colors.RED}❌ 后端服务未运行，请先启动后端{Colors.ENDC}")
            print(f"   运行: cd backend && uvicorn app.main:app --reload")
            sys.exit(1)
    except:
        print(f"{Colors.RED}❌ 无法连接到后端服务 (http://127.0.0.1:8000){Colors.ENDC}")
        print(f"   请先启动后端: cd backend && uvicorn app.main:app --reload")
        sys.exit(1)

    # 运行CLI
    cli = Me2CLI(api_url)
    cli.run()


if __name__ == "__main__":
    main()
