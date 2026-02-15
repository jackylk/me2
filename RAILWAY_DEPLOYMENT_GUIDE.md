# 🚀 Me2 Railway 部署完整指南

## 📋 部署架构

Me2 在 Railway 上部署为 **3 个独立服务**：

```
┌─────────────────────────────────────────────┐
│           Railway Project: Me2              │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐  ┌──────────────┐        │
│  │   Backend    │  │   Frontend   │        │
│  │   FastAPI    │◄─┤   Next.js    │        │
│  │   Port: 8000 │  │   Port: 3000 │        │
│  └──────┬───────┘  └──────────────┘        │
│         │                                   │
│  ┌──────▼───────┐                          │
│  │  PostgreSQL  │                          │
│  │   Database   │                          │
│  └──────────────┘                          │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🎯 部署前准备

### 1. 准备 API Keys

你需要以下 API 密钥：

- ✅ **DeepSeek API Key** - 主 LLM
  - 获取地址: https://platform.deepseek.com/
  - 用途: AI 对话生成

- ✅ **SiliconFlow API Key** - Embedding API
  - 获取地址: https://cloud.siliconflow.cn/
  - 用途: 文本向量化（记忆检索）

### 2. 生成安全密钥

```bash
# 在本地运行生成两个随机密钥
python -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"
python -c "import secrets; print('JWT_SECRET=' + secrets.token_urlsafe(32))"

# 保存输出，后面要用
```

### 3. 准备代码

```bash
# 确保代码已提交
git add .
git commit -m "feat: Add Railway deployment config and PWA support"
git push origin master
```

---

## 📦 部署步骤

### Step 1: 创建 Railway 项目

1. **访问 Railway**
   - 打开 https://railway.app/
   - 使用 GitHub 账号登录

2. **创建新项目**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 授权并选择 `me2` 仓库

3. **项目创建完成**
   - Railway 会自动检测到代码
   - 暂时不会部署（需要配置）

---

### Step 2: 部署 PostgreSQL 数据库

1. **添加数据库服务**
   - 在项目中点击 "+ New"
   - 选择 "Database" → "PostgreSQL"
   - 等待数据库创建完成（约 30 秒）

2. **记录连接信息**
   - 点击 PostgreSQL 服务
   - 进入 "Connect" 标签
   - Railway 会自动提供 `DATABASE_URL`
   - 其他服务可以通过变量引用：`${{Postgres.DATABASE_URL}}`

---

### Step 3: 部署后端服务

1. **创建后端服务**
   - 点击 "+ New"
   - 选择 "GitHub Repo" → `me2` 仓库
   - Railway 会自动检测到 `backend/` 目录

2. **配置根目录**
   - 点击后端服务
   - Settings → Service
   - **Root Directory**: `backend`
   - 保存更改

3. **添加环境变量**
   - 进入 "Variables" 标签
   - 点击 "RAW Editor"
   - 粘贴以下内容（**替换为你的真实值**）：

```bash
# DeepSeek API
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat

# SiliconFlow Embedding API
OPENAI_API_KEY=sk-your-siliconflow-api-key
OPENAI_BASE_URL=https://api.siliconflow.cn/v1
EMBEDDING_MODEL=BAAI/bge-large-zh-v1.5
EMBEDDING_DIMENSIONS=1024

# Database (引用 PostgreSQL 服务)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Security (使用你生成的密钥)
SECRET_KEY=your-generated-secret-key
JWT_SECRET=your-generated-jwt-secret
JWT_ALGORITHM=HS256
JWT_EXPIRE_DAYS=7

# App Settings
DEBUG=False
APP_NAME=Me2
APP_VERSION=0.1.0

# CORS (先留空，等前端部署后填写)
ALLOWED_ORIGINS=

# NeuroMemory
NEUROMEMORY_EXTRACTION_INTERVAL=10
NEUROMEMORY_REFLECTION_INTERVAL=20
NEUROMEMORY_IDLE_TIMEOUT=600
NEUROMEMORY_GRAPH_ENABLED=True
```

4. **触发部署**
   - 点击 "Deploy"
   - 查看 Logs 等待部署完成
   - 成功后会显示绿色 ✅

5. **获取后端 URL**
   - Settings → Domains
   - Railway 会自动分配一个域名，如：
     ```
     https://me2-backend-production-xxxx.up.railway.app
     ```
   - 记录这个 URL，前端需要用

6. **验证后端**
   ```bash
   # 健康检查
   curl https://your-backend-url.railway.app/health
   # 应该返回: {"status":"healthy","neuromemory":"healthy"}

   # API 文档
   # 访问: https://your-backend-url.railway.app/docs
   ```

---

### Step 4: 部署前端服务

1. **创建前端服务**
   - 点击 "+ New"
   - 选择 "GitHub Repo" → `me2` 仓库

2. **配置根目录**
   - Settings → Service
   - **Root Directory**: `frontend`
   - 保存

3. **添加环境变量**
   - Variables → RAW Editor
   - 粘贴：

```bash
# API URL (替换为 Step 3 获取的后端 URL)
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app/api/v1
```

4. **触发部署**
   - 点击 "Deploy"
   - 等待构建完成（约 2-3 分钟）

5. **获取前端 URL**
   - Settings → Domains
   - 记录 URL，如：
     ```
     https://me2-frontend-production-xxxx.up.railway.app
     ```

---

### Step 5: 更新 CORS 配置

1. **返回后端服务**
   - 进入 Variables

2. **更新 ALLOWED_ORIGINS**
   ```bash
   ALLOWED_ORIGINS=https://your-frontend-url.railway.app
   ```

3. **重新部署**
   - Settings → Deploy → Redeploy

---

### Step 6: 配置自定义域名（可选但推荐）

#### 方案 A: 使用 Railway 子域名

Railway 提供免费的 `.up.railway.app` 域名，已自动配置 HTTPS。

#### 方案 B: 使用自己的域名

1. **前端域名（如 me2.yourdomain.com）**
   - 在前端服务 → Settings → Domains
   - 点击 "Custom Domain"
   - 输入: `me2.yourdomain.com`
   - Railway 会提供 CNAME 记录

2. **后端域名（如 api.me2.yourdomain.com）**
   - 在后端服务 → Settings → Domains
   - 添加: `api.me2.yourdomain.com`

3. **配置 DNS**
   - 在你的域名提供商（如 Cloudflare）
   - 添加 CNAME 记录指向 Railway 提供的目标

4. **等待生效**
   - DNS 传播需要几分钟到几小时
   - Railway 会自动配置 HTTPS（Let's Encrypt）

5. **更新环境变量**
   - 后端 ALLOWED_ORIGINS: `https://me2.yourdomain.com`
   - 前端 NEXT_PUBLIC_API_URL: `https://api.me2.yourdomain.com/api/v1`

---

## ✅ 验证部署

### 1. 测试后端 API

```bash
# 健康检查
curl https://your-backend.railway.app/health

# 查看 API 文档
open https://your-backend.railway.app/docs
```

### 2. 测试前端

```bash
# 打开前端
open https://your-frontend.railway.app

# 或使用自定义域名
open https://me2.yourdomain.com
```

### 3. 测试完整流程

1. **注册账号**
   - 访问前端
   - 点击"注册"
   - 输入邮箱和密码

2. **测试聊天**
   - 登录后发送消息
   - 检查 AI 是否正常回复

3. **检查记忆**
   - 多轮对话后
   - 访问"记忆"页面
   - 查看 AI 是否记住了内容

### 4. 测试 PWA 功能

1. **在手机上访问**
   - 使用手机浏览器访问部署的 URL
   - HTTPS 下 PWA 功能会自动启用

2. **安装到主屏幕**
   - iOS: Safari → 分享 → 添加到主屏幕
   - Android: Chrome → 菜单 → 安装应用

3. **测试离线功能**
   - 安装后断开网络
   - 应用仍能打开并显示缓存内容

---

## 🐛 故障排查

### 后端部署失败

**症状**: 部署失败，红色 ❌

**常见原因**:
1. 环境变量配置错误
2. API Key 无效
3. 数据库连接失败

**解决方法**:
```bash
# 查看详细日志
Railway Dashboard → Backend Service → Deployments → View Logs

# 检查环境变量
Variables 标签 → 确认所有必需变量都已设置

# 检查数据库连接
确保 DATABASE_URL=${{Postgres.DATABASE_URL}}

# 手动触发重新部署
Settings → Deploy → Redeploy
```

### 前端构建失败

**症状**: 构建卡在 "Building..." 或失败

**常见原因**:
1. Node.js 版本不兼容
2. 依赖安装失败
3. 构建命令错误

**解决方法**:
```bash
# 检查 package.json 中的 engines
{
  "engines": {
    "node": ">=18.0.0"
  }
}

# 查看构建日志
Deployments → View Logs → 查找错误信息

# 清理缓存重新部署
Settings → Redeploy (force clean build)
```

### CORS 错误

**症状**: 前端控制台显示 "CORS policy" 错误

**解决方法**:
```bash
# 检查后端 ALLOWED_ORIGINS
确保包含前端完整 URL（包括 https://）

# 示例
ALLOWED_ORIGINS=https://me2-frontend-xxx.up.railway.app,https://me2.yourdomain.com

# 重新部署后端
Settings → Redeploy
```

### API 连接失败

**症状**: 前端无法连接后端

**检查清单**:
- [ ] 后端服务正常运行（绿色 ✅）
- [ ] 前端 NEXT_PUBLIC_API_URL 正确
- [ ] 后端 ALLOWED_ORIGINS 包含前端 URL
- [ ] 两个服务都使用 HTTPS

### 数据库连接失败

**症状**: 后端日志显示数据库错误

**解决方法**:
```bash
# 确认 DATABASE_URL 格式
postgresql+asyncpg://user:pass@host:port/db

# 使用 Railway 变量引用
DATABASE_URL=${{Postgres.DATABASE_URL}}

# 检查 PostgreSQL 服务状态
PostgreSQL Service → 确保运行中

# 重启后端服务
Backend Service → Settings → Restart
```

---

## 🔒 安全建议

### 1. 保护敏感信息

```bash
# ❌ 不要提交到 Git
.env
.env.local
.env.production

# ✅ 使用 Railway Variables
在 Railway Dashboard 中设置
```

### 2. 定期更新密钥

```bash
# 每 3-6 个月轮换一次
SECRET_KEY
JWT_SECRET
```

### 3. 监控 API 使用

- 定期检查 DeepSeek 和 SiliconFlow 的 API 用量
- 设置用量告警
- 防止异常消耗

### 4. 启用日志监控

```bash
# Railway 自动保留日志
Deployments → Logs

# 可导出日志进行分析
```

---

## 💰 成本估算

### Railway 免费额度

- **Hobby Plan**: $5/月 免费额度
- **执行时间**: 500 小时/月
- **流量**: 100 GB/月
- **存储**: PostgreSQL 数据库

### 预估成本（小规模使用）

```
后端服务:     ~$2-5/月
前端服务:     ~$2-5/月
PostgreSQL:   ~$5/月
─────────────────────
总计:         ~$10-15/月
```

**注意**:
- 免费额度可覆盖早期测试
- 实际成本取决于流量和计算时间
- 可在 Railway Dashboard 查看实时用量

---

## 📈 性能优化

### 1. 启用缓存

```javascript
// frontend/next.config.js
module.exports = {
  compress: true,  // 启用 gzip
  swcMinify: true, // 使用 SWC 压缩
};
```

### 2. 数据库优化

```python
# backend/app/config.py
# 生产环境使用连接池
SQLALCHEMY_POOL_SIZE = 5
SQLALCHEMY_MAX_OVERFLOW = 10
```

### 3. CDN 加速（可选）

- 将静态资源上传到 Cloudflare R2
- 配置 CDN 域名
- 减轻 Railway 流量压力

---

## 🔄 持续部署

Railway 支持自动部署：

```bash
# 推送到 GitHub 后自动部署
git push origin master

# Railway 会自动：
1. 检测代码更新
2. 触发构建
3. 运行测试（如果配置）
4. 部署新版本
5. 零停机切换
```

**配置自动部署**:
- Settings → Service
- Enable "Auto Deploy"
- 选择分支（master/main）

---

## 📚 相关文档

- Railway 官方文档: https://docs.railway.app/
- Next.js 部署: https://nextjs.org/docs/deployment
- FastAPI 部署: https://fastapi.tiangolo.com/deployment/
- PWA 最佳实践: https://web.dev/progressive-web-apps/

---

## 🎉 部署完成检查清单

部署完成后，确认以下所有项目：

- [ ] 后端服务运行中（绿色 ✅）
- [ ] 前端服务运行中（绿色 ✅）
- [ ] PostgreSQL 正常运行
- [ ] 后端健康检查通过 (`/health`)
- [ ] API 文档可访问 (`/docs`)
- [ ] 前端页面正常显示
- [ ] 用户注册功能正常
- [ ] 用户登录功能正常
- [ ] 聊天功能正常
- [ ] 记忆召回功能正常
- [ ] CORS 配置正确
- [ ] HTTPS 证书有效
- [ ] 自定义域名解析（如果配置）
- [ ] PWA 安装功能正常（移动端）
- [ ] Service Worker 注册成功
- [ ] 环境变量已备份
- [ ] API Keys 已保密

---

**祝你部署顺利！** 🚀

如遇问题，请查看故障排查部分或在 GitHub 提 Issue。
