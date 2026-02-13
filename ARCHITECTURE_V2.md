# Me2 架构设计 v2

## 项目定位

Me2 是一个**温暖陪伴式的 Web Chat 应用**，让用户感觉被理解和支持。

**核心原则**：
- 记忆管理：完全委托给 NeuroMemory
- Me2 专注：Web 应用 + Agent 高层逻辑
- 多用户：支持注册登录，每个用户独立记忆

---

## 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                     Me2 Web App                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐         ┌─────────────────────┐ │
│  │   Frontend       │         │    Backend          │ │
│  │   Next.js 14     │◄───────►│    FastAPI          │ │
│  │   - 聊天界面      │   API   │    - 用户认证       │ │
│  │   - 用户登录      │         │    - 对话引擎       │ │
│  └──────────────────┘         │    - 主动关心       │ │
│                                └──────────┬──────────┘ │
│                                           │            │
│                                ┌──────────▼──────────┐ │
│                                │   NeuroMemory       │ │
│                                │   - 记忆存储         │ │
│                                │   - 记忆召回         │ │
│                                │   - 自动提取         │ │
│                                │   - 情感标注         │ │
│                                │   - 洞察生成         │ │
│                                └──────────┬──────────┘ │
│                                           │            │
│                                ┌──────────▼──────────┐ │
│                                │   PostgreSQL        │ │
│                                │   - users (Me2)     │ │
│                                │   - embeddings (NM) │ │
│                                │   - conversations   │ │
│                                └─────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 后端模块

### 核心模块（简化版）

```
backend/app/
├── main.py                      # FastAPI 主应用
├── config.py                    # 配置管理
├── db/
│   ├── database.py              # 数据库连接
│   └── models.py                # User 模型（只需要用户表）
├── services/
│   ├── memory_manager.py        # NeuroMemory 封装（核心）
│   ├── conversation_engine.py   # 对话引擎（高层逻辑）
│   ├── proactive_engine.py      # 主动关心（简化版）
│   └── auth_service.py          # 用户认证（JWT）
└── api/v1/
    ├── auth.py                  # 注册/登录 API
    ├── chat.py                  # 聊天 API
    └── user.py                  # 用户信息 API
```

### 删除的模块
- ❌ `neuromemory_client.py` - 不需要 HTTP 客户端
- ❌ `memories.py` - 记忆管理交给 NeuroMemory
- ❌ `profile.py` - 画像信息从 NeuroMemory 获取
- ❌ `import_api.py` - 使用 NeuroMemory 批量导入
- ❌ `image_storage.py` - 使用 NeuroMemory 文件管理
- ❌ `mimic_engine.py` - 简化，只做基础语言风格
- ❌ `deep_mimic_engine.py` - 洞察交给 NeuroMemory

---

## 数据库设计

### PostgreSQL 表结构

**Me2 自己的表**（只需要用户表）：
```sql
-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);
```

**NeuroMemory 的表**（自动创建）：
- embeddings（记忆向量）
- conversations（对话历史）
- kv_store（KV 存储）
- graph nodes/edges（知识图谱）
- ... 其他 NeuroMemory 表

---

## 核心流程

### 1. 用户注册/登录
```
POST /api/v1/auth/register
  → 创建用户
  → 返回 JWT token

POST /api/v1/auth/login
  → 验证密码
  → 返回 JWT token
```

### 2. 聊天流程
```
用户发送消息
    ↓
POST /api/v1/chat
    ↓
1. 验证 JWT token，获取 user_id
    ↓
2. MemoryManager.recall(user_id, message)
   - NeuroMemory 三因子检索
   - 返回相关记忆 + 洞察
    ↓
3. ConversationEngine.chat()
   - 构建 prompt（注入记忆和洞察）
   - 调用 LLM（DeepSeek）
   - 生成温暖、懂 ta 的回复
    ↓
4. MemoryManager.save_conversation()
   - 保存对话到 NeuroMemory
   - 自动触发记忆提取（ExtractionStrategy）
    ↓
5. 返回回复给前端
```

### 3. 主动关心（定时任务）
```
每小时执行：
    ↓
ProactiveEngine.check_users()
    ↓
对每个用户：
1. 获取最近记忆的情感标注
2. 判断是否需要关心
3. 生成主动消息（如果需要）
4. 通过 WebSocket 推送给前端
```

---

## 核心代码结构

### 1. MemoryManager（NeuroMemory 封装）

```python
# backend/app/services/memory_manager.py
from neuromemory import NeuroMemory, SiliconFlowEmbedding, OpenAILLM, ExtractionStrategy

class MemoryManager:
    """统一的记忆管理器，封装 NeuroMemory v2"""

    def __init__(self):
        self.nm = None

    async def init(self, config):
        """初始化 NeuroMemory"""
        self.nm = NeuroMemory(
            database_url=config.DATABASE_URL,
            embedding=SiliconFlowEmbedding(api_key=config.SILICONFLOW_API_KEY),
            llm=OpenAILLM(
                api_key=config.DEEPSEEK_API_KEY,
                model="deepseek-chat",
                base_url="https://api.deepseek.com/v1"
            ),
            extraction=ExtractionStrategy(
                message_interval=10,      # 每 10 条消息提取
                reflection_interval=50,   # 每 50 次提取后反思
            ),
            graph_enabled=True,
        )
        await self.nm.init()

    async def recall(self, user_id: str, query: str):
        """召回记忆（三因子检索 + 洞察）"""
        # 1. 三因子检索相关记忆
        recall_result = await self.nm.recall(user_id, query, limit=5)

        # 2. 获取洞察
        insights = await self.nm.search(
            user_id, query,
            memory_type="insight",
            limit=3
        )

        return {
            "memories": recall_result["merged"],
            "insights": insights
        }

    async def save_message(self, user_id: str, role: str, content: str):
        """保存对话（自动触发记忆提取）"""
        await self.nm.conversations.add_message(user_id, role, content)
```

### 2. ConversationEngine（对话引擎）

```python
# backend/app/services/conversation_engine.py

class ConversationEngine:
    """对话引擎 - Me2 的高层逻辑"""

    def __init__(self, memory_manager: MemoryManager, llm_client):
        self.memory = memory_manager
        self.llm = llm_client

    async def chat(self, user_id: str, message: str):
        """处理对话 - 温暖、懂 ta 的回复"""

        # 1. 召回记忆和洞察
        context = await self.memory.recall(user_id, message)

        # 2. 构建温暖的 prompt
        system_prompt = self._build_warm_prompt(context)

        # 3. 调用 LLM
        response = await self.llm.chat(
            system_prompt=system_prompt,
            user_message=message,
            temperature=0.8  # 稍高温度，更自然
        )

        # 4. 保存对话（NeuroMemory 自动提取记忆）
        await self.memory.save_message(user_id, "user", message)
        await self.memory.save_message(user_id, "assistant", response)

        return response

    def _build_warm_prompt(self, context):
        """构建温暖、支持性的 prompt"""

        memories = context["memories"]
        insights = context["insights"]

        # 提取情感信息
        emotional_context = self._extract_emotional_context(memories)

        return f"""你是一个温暖、懂 ta 的朋友。

**你记得关于 ta 的这些事**：
{self._format_memories(memories)}

**你对 ta 的理解**：
{self._format_insights(insights)}

{emotional_context}

**重要**：
- 像真正的朋友一样对话，自然地提及你记得的事
- 如果 ta 情绪低落，给予温暖的支持
- 如果 ta 分享开心的事，真诚地为 ta 高兴
- 不要机械地复述记忆，要自然融入对话
- 让 ta 感觉被理解、被支持"""

    def _extract_emotional_context(self, memories):
        """提取情感上下文"""
        emotions = []
        for m in memories:
            meta = m.get("metadata", {})
            if "emotion" in meta and meta["emotion"]:
                emotions.append(meta["emotion"])

        if not emotions:
            return ""

        avg_valence = sum(e["valence"] for e in emotions) / len(emotions)

        if avg_valence < -0.3:
            return "\n**注意**: ta 最近情绪似乎有些低落，请给予关心和支持。"
        elif avg_valence > 0.3:
            return "\n**注意**: ta 最近心情不错，可以分享 ta 的快乐。"

        return ""
```

### 3. API 端点

```python
# backend/app/api/v1/chat.py
from fastapi import APIRouter, Depends
from app.services.auth_service import get_current_user

router = APIRouter()

@router.post("/chat")
async def chat(
    message: str,
    current_user = Depends(get_current_user)  # JWT 验证
):
    """聊天 API"""
    user_id = current_user.id

    # 调用对话引擎
    response = await conversation_engine.chat(user_id, message)

    return {"response": response}
```

---

## 前端设计

### 简化的页面结构
```
frontend/app/
├── page.tsx                 # 登录页（首页）
├── register/page.tsx        # 注册页
├── chat/page.tsx            # 聊天页（主界面）
└── layout.tsx               # 根布局
```

### 核心组件
```
frontend/components/
├── LoginForm.tsx            # 登录表单
├── RegisterForm.tsx         # 注册表单
├── ChatInterface.tsx        # 聊天界面
└── Navigation.tsx           # 导航栏
```

---

## 部署方案

### Railway 部署

**需要的服务**：
1. Web Service（FastAPI + Next.js）
2. PostgreSQL Database（Railway 提供）

**环境变量**：
```bash
# Railway 环境变量
DATABASE_URL=postgresql://...  # Railway 自动提供
SILICONFLOW_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...
JWT_SECRET=...
```

**Dockerfile**：
```dockerfile
# 前端构建
FROM node:18 AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend ./
RUN npm run build

# 后端
FROM python:3.10
WORKDIR /app

# 复制前端构建产物
COPY --from=frontend /app/frontend/.next ./frontend/.next
COPY --from=frontend /app/frontend/public ./frontend/public

# 安装 Python 依赖
COPY backend/requirements.txt ./
RUN pip install -r requirements.txt

# 复制后端代码
COPY backend ./backend

# 启动
CMD uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
```

---

## 实施计划

### Phase 1: 核心重构（1 周）
- [ ] 创建新的 `memory_manager.py`
- [ ] 简化 `conversation_engine.py`
- [ ] 添加用户认证系统（JWT）
- [ ] 更新前端登录/注册页面

### Phase 2: 功能完善（3 天）
- [ ] 简化主动关心（基于情感标注）
- [ ] 测试聊天流程
- [ ] 前端美化

### Phase 3: 部署上线（2 天）
- [ ] 本地测试
- [ ] Railway 配置
- [ ] 上线测试

---

## 下一步

需要我开始实施吗？我可以：
1. 创建新的 `memory_manager.py`
2. 重构 `conversation_engine.py`
3. 添加用户认证系统
4. 清理不需要的代码

Ready to start? 🚀
