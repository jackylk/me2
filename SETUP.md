# Me2 开发环境搭建

## 前置要求

- Python 3.10+
- Node.js 18+
- Docker（用于 PostgreSQL）
- Git

---

## 安装步骤

### 1. 启动 PostgreSQL

Me2 使用与 NeuroMemory 相同的 PostgreSQL 数据库。

```bash
# 在 NeuroMemory 项目目录
cd /Users/jacky/code/NeuroMemory
docker compose -f docker-compose.v2.yml up -d db

# 验证数据库运行
docker compose -f docker-compose.v2.yml ps db
# 应该看到 STATUS: healthy
```

### 2. 安装 NeuroMemory

```bash
# 在 NeuroMemory 项目目录
cd /Users/jacky/code/NeuroMemory
pip install -e ".[all]"
```

### 3. 安装 Me2 后端依赖

```bash
cd /Users/jacky/code/me2/backend

# 创建虚拟环境（可选但推荐）
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# 或 venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt
```

**注意**：首次运行时会自动下载 Embedding 模型（约 100MB），请耐心等待。

### 4. 配置环境变量

创建 `backend/.env` 文件：

```bash
# 复制示例配置
cp backend/.env.example backend/.env

# 编辑 .env 文件，填入 DeepSeek API Key
```

**backend/.env** 示例：
```env
# Database
DATABASE_URL=postgresql+asyncpg://neuromemory:neuromemory@localhost:5432/neuromemory

# JWT
JWT_SECRET=your-random-secret-key-change-me-in-production

# LLM - DeepSeek
DEEPSEEK_API_KEY=sk-your-deepseek-api-key  # 需要填入真实的 API Key

# Embedding
EMBEDDING_MODEL=BAAI/bge-small-zh-v1.5

# Debug
DEBUG=true
```

### 5. 初始化数据库

```bash
cd backend

# Me2 的用户表会在首次启动时自动创建
# NeuroMemory 的表也会自动创建

# 可选：使用 Alembic 管理迁移（未来）
# alembic init alembic
# alembic revision --autogenerate -m "Initial migration"
# alembic upgrade head
```

### 6. 启动后端

```bash
cd backend
uvicorn app.main:app --reload

# 或使用 Python
python -m app.main
```

启动日志应该显示：
```
🚀 Me2 启动中...
📦 初始化数据库...
🧠 初始化 NeuroMemory...
📥 加载 Embedding 模型: BAAI/bge-small-zh-v1.5
   首次运行需要下载模型，之后从本地缓存加载
✅ 模型加载完成 (维度: 512)
✅ NeuroMemory 初始化完成
✅ Me2 启动完成
```

访问：
- API: http://localhost:8000
- 文档: http://localhost:8000/docs
- 健康检查: http://localhost:8000/health

### 7. 安装前端依赖

```bash
cd frontend
npm install
```

### 8. 启动前端

```bash
cd frontend
npm run dev
```

访问: http://localhost:3000

---

## 验证安装

### 1. 检查后端健康

```bash
curl http://localhost:8000/health
```

应该返回：
```json
{
  "status": "healthy",
  "neuromemory": "healthy"
}
```

### 2. 测试 Embedding

```python
# test_embedding.py
import asyncio
from app.providers import LocalEmbedding

async def test():
    embedding = LocalEmbedding()
    result = await embedding.embed("你好世界")
    print(f"Embedding 维度: {len(result)}")
    print(f"前 5 个值: {result[:5]}")

asyncio.run(test())
```

---

## 常见问题

### Q1: Embedding 模型下载失败

**问题**: `ConnectionError` 或下载超时

**解决**:
1. 检查网络连接
2. 使用国内镜像站（如果在中国）
3. 手动下载模型到 `~/.cache/huggingface/`

### Q2: PostgreSQL 连接失败

**问题**: `connection refused`

**解决**:
```bash
# 检查 Docker 容器
docker ps | grep postgres

# 重启数据库
cd /Users/jacky/code/NeuroMemory
docker compose -f docker-compose.v2.yml restart db

# 查看日志
docker compose -f docker-compose.v2.yml logs db
```

### Q3: NeuroMemory 导入失败

**问题**: `ModuleNotFoundError: No module named 'neuromemory'`

**解决**:
```bash
# 确保安装了 NeuroMemory
cd /Users/jacky/code/NeuroMemory
pip install -e ".[all]"

# 验证安装
python -c "import neuromemory; print(neuromemory.__version__)"
```

### Q4: DeepSeek API 报错

**问题**: `401 Unauthorized` 或 `API key not found`

**解决**:
1. 检查 `.env` 文件中的 `DEEPSEEK_API_KEY` 是否正确
2. 确保 API Key 有效且有余额
3. 测试 API Key：
```bash
curl https://api.deepseek.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"test"}]}'
```

---

## 下一步

- [ ] 创建用户认证系统
- [ ] 实现聊天功能
- [ ] 测试记忆召回
- [ ] 部署到 Railway

---

**需要帮助？** 查看 `ARCHITECTURE_V2.md` 和 `PRD.md`
