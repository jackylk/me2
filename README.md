# Me2 - 个人陪伴 Agent

Me2 是一个像朋友一样的个人陪伴 AI Agent，具备深度记忆、思维模仿和主动关心能力。

## 核心特性

- **深度记忆**：基于 NeuroMemory v2 的向量记忆系统
- **思维模仿**：完全模仿用户的语气、表达和思维方式
- **主动关心**：智能判断时机，主动问候和提醒
- **记忆导入**：从历史数据（聊天记录、社交媒体、笔记）中快速学习

## 技术栈

### 后端
- FastAPI + Uvicorn
- PostgreSQL + SQLAlchemy
- APScheduler
- NeuroMemory v2

### 前端
- Next.js 14 + React 18 + TypeScript
- TailwindCSS + Radix UI
- SWR
- Cytoscape.js

### LLM
- 主 LLM: DeepSeek v3
- 辅助 LLM: Gemini 2.0 Flash
- Embedding: SiliconFlow BAAI/bge-m3

## 项目结构

```
me2/
├── backend/                # FastAPI 后端
│   ├── app/
│   │   ├── api/v1/        # REST API 端点
│   │   ├── services/      # 核心业务逻辑
│   │   ├── models/        # 数据模型
│   │   ├── db/            # 数据库层
│   │   ├── schedulers/    # 定时任务
│   │   └── prompts/       # LLM Prompt 模板
│   ├── requirements.txt
│   └── main.py
├── frontend/              # Next.js 前端
│   ├── app/               # 页面路由
│   ├── components/        # React 组件
│   └── lib/               # 工具库
└── docker-compose.yml     # 本地开发环境
```

## 快速开始

### 1. 启动数据库

```bash
docker-compose up -d
```

### 2. 启动后端

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

### 4. 访问应用

- 前端: http://localhost:3000
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs

## 开发路线图

- [x] Phase 1: MVP 核心功能（4-6 周）
  - [x] 基础架构
  - [ ] 思维模仿 v1
  - [ ] 记忆导入
- [ ] Phase 2: 主动关心 + 深度模仿（3-4 周）
- [ ] Phase 3: 记忆管理 + 多模态（2-3 周）
- [ ] Phase 4: 优化和完善（持续）

## License

MIT
