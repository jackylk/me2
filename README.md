# Me2 - 个人陪伴 Agent

Me2 是一个像朋友一样的个人陪伴 AI Agent，具备深度记忆、思维模仿和主动关心能力。

## 核心特性

- **深度记忆**：基于 NeuroMemory 的多层记忆系统（事实、情景、洞察），支持知识图谱和情感建模
- **智能对话**：流式响应、上下文感知、自动记忆召回与融合
- **记忆管理**：可视化记忆浏览、知识图谱展示、时间线视图、语义搜索
- **管理后台**：仪表盘、用户管理、用量统计、数据管理
- **记忆导入**：从微信聊天记录等历史数据中快速学习

## 技术栈

### 后端
- **框架**: FastAPI + Uvicorn
- **数据库**: PostgreSQL 18 (AGE + pgvector) + SQLAlchemy 2 + asyncpg
- **记忆引擎**: NeuroMemory v0.5
- **认证**: JWT (python-jose) + bcrypt

### 前端
- **框架**: Next.js 14 + React 18 + TypeScript
- **样式**: TailwindCSS 3 + Radix UI
- **可视化**: Cytoscape.js (知识图谱) + ECharts (图表)
- **数据**: SWR

### LLM / Embedding
- **主 LLM**: DeepSeek Chat (OpenAI 兼容 API)
- **Embedding**: SiliconFlow BAAI/bge (远程 API，无需 torch)

## 项目结构

```
me2/
├── backend/                  # FastAPI 后端
│   ├── app/
│   │   ├── api/v1/          # REST API 端点
│   │   │   ├── auth.py      #   认证（注册/登录）
│   │   │   ├── chat.py      #   会话与消息（含流式）
│   │   │   ├── memories.py  #   记忆管理（CRUD/搜索/图谱/情感）
│   │   │   ├── admin.py     #   管理后台 API
│   │   │   └── users.py     #   用户操作
│   │   ├── services/        # 核心业务逻辑
│   │   │   ├── conversation_engine.py  # 对话引擎
│   │   │   ├── llm_client.py           # LLM 调用封装
│   │   │   ├── session_manager.py      # 会话管理
│   │   │   ├── admin_service.py        # 后台管理
│   │   │   ├── metrics_collector.py    # 指标采集
│   │   │   ├── intent_analyzer.py      # 意图分析
│   │   │   └── auth_service.py         # 认证服务
│   │   ├── providers/       # 外部服务适配
│   │   │   └── openai_embedding.py     # 远程 Embedding
│   │   ├── db/              # 数据库模型与迁移
│   │   ├── dependencies/    # FastAPI 依赖注入
│   │   ├── prompts/         # LLM Prompt 模板
│   │   └── config.py        # 配置
│   ├── requirements.txt
│   └── main.py
├── frontend/                 # Next.js 前端
│   ├── app/                 # 页面路由
│   │   ├── page.tsx         #   主聊天页
│   │   ├── memories/        #   记忆浏览（认知/反思/画像/图谱）
│   │   ├── import/          #   数据导入
│   │   ├── analysis/        #   分析统计
│   │   ├── admin/           #   管理后台（仪表盘/用户/用量/数据）
│   │   ├── settings/        #   设置
│   │   └── login/           #   登录/注册
│   ├── components/          # React 组件
│   │   ├── ChatInterface.tsx
│   │   ├── layout/          #   布局（侧边栏/导航）
│   │   ├── memories/        #   记忆相关组件
│   │   ├── admin/           #   后台组件
│   │   └── ui/              #   通用 UI
│   └── lib/                 # 工具库
└── docker-compose.yml        # PostgreSQL 开发环境
```

## 快速开始

### 1. 启动数据库

```bash
docker-compose up -d
```

### 2. 配置环境变量

```bash
cd backend
cp .env.example .env
# 编辑 .env，填入 DEEPSEEK_API_KEY 等配置
```

### 3. 启动后端

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 4. 启动前端

```bash
cd frontend
npm install
npm run dev
```

### 5. 访问应用

- 前端: http://localhost:3000
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs

## 主要页面

| 页面 | 路径 | 说明 |
|------|------|------|
| 聊天 | `/` | 主对话界面，支持流式响应和记忆召回 |
| 记忆 | `/memories` | 多标签页浏览：认知记忆、反思洞察、用户画像、知识图谱 |
| 导入 | `/import` | 从微信聊天记录等导入历史数据 |
| 分析 | `/analysis` | 统计分析 |
| 管理后台 | `/admin` | 仪表盘、用户管理、用量统计、数据管理 |

## API 概览

| 模块 | 端点前缀 | 说明 |
|------|----------|------|
| 认证 | `/api/v1/auth` | 注册、登录 |
| 聊天 | `/api/v1/chat` | 会话管理、消息发送（含 SSE 流式） |
| 记忆 | `/api/v1/memories` | 记忆 CRUD、语义搜索、图谱、情感、画像 |
| 管理 | `/api/v1/admin` | 仪表盘、用户管理、系统监控、用量统计 |

## License

MIT
