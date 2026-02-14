#!/bin/bash
# Me2 CLI 启动脚本

cd "$(dirname "$0")"

# 禁用代理
export NO_PROXY='*'
export no_proxy='*'
unset HTTP_PROXY
unset http_proxy
unset HTTPS_PROXY
unset https_proxy

# 运行CLI
python3 cli_chat.py
