# 🚀 Railway 快速部署指南

## ⚡ 5 分钟部署 Me2 到 Railway

### 前置准备

**你需要**：
- GitHub 账号
- Railway 账号（https://railway.app/）
- DeepSeek API Key（https://platform.deepseek.com/）
- SiliconFlow API Key（https://cloud.siliconflow.cn/）

---

## 📋 部署步骤

### 1️⃣ 推送代码到 GitHub

```bash
# 在项目目录
cd /Users/jacky/code/me2

# 提交所有更改
git add .
git commit -m "feat: Ready for Railway deployment with PWA support"
git push origin master
```

---

### 2️⃣ 创建 Railway 项目

1. 访问 https://railway.app/
2. 登录并点击 **"New Project"**
3. 选择 **"Deploy from GitHub repo"**
4. 选择 `me2` 仓库

---

### 3️⃣ 添加 PostgreSQL 数据库

1. 在项目中点击 **"+ New"**
2. 选择 **"Database"** → **"PostgreSQL"**
3. 等待创建完成（约 30 秒）

---

### 4️⃣ 部署后端

**4.1 创建服务**
- 点击 **"+ New"** → **"GitHub Repo"** → 选择 `me2`

**4.2 配置**
- 服务名称改为 `backend`
- **Settings** → **Root Directory** = `backend`

**4.3 添加环境变量**
进入 **Variables** 标签，点击 **"RAW Editor"**，粘贴：

```bash
DEEPSEEK_API_KEY=sk-你的deepseek-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat

OPENAI_API_KEY=sk-你的siliconflow-api-key
OPENAI_BASE_URL=https://api.siliconflow.cn/v1
EMBEDDING_MODEL=BAAI/bge-large-zh-v1.5
EMBEDDING_DIMENSIONS=1024

DATABASE_URL=${{Postgres.DATABASE_URL}}

SECRET_KEY=请运行命令生成
JWT_SECRET=请运行命令生成
DEBUG=False

ALLOWED_ORIGINS=
```

**生成安全密钥**：
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```
复制输出到 `SECRET_KEY` 和 `JWT_SECRET`

**4.4 部署并获取 URL**
- 点击 **"Deploy"**
- 等待部署完成
- **Settings** → **Domains** → 复制 URL（如 `https://backend-xxx.up.railway.app`）

---

### 5️⃣ 部署前端

**5.1 创建服务**
- 点击 **"+ New"** → **"GitHub Repo"** → 选择 `me2`

**5.2 配置**
- 服务名称改为 `frontend`
- **Settings** → **Root Directory** = `frontend`

**5.3 添加环境变量**
```bash
NEXT_PUBLIC_API_URL=https://你的后端URL.railway.app/api/v1
```

**5.4 部署**
- 点击 **"Deploy"**
- 等待完成（约 2-3 分钟）

---

### 6️⃣ 更新 CORS

**返回后端服务** → **Variables** → 更新：
```bash
ALLOWED_ORIGINS=https://你的前端URL.railway.app
```

点击 **Redeploy**

---

### 7️⃣ 验证部署

**后端测试**：
```bash
curl https://你的后端URL.railway.app/health
```
应返回：`{"status":"healthy","neuromemory":"healthy"}`

**前端测试**：
在浏览器打开前端 URL，应该能看到登录页面

---

## 🎯 配置自定义域名（可选）

### 为什么需要自定义域名？
- 更专业的形象
- 更容易记忆
- PWA 需要稳定的域名

### 如何配置？

**1. 在 Railway 添加域名**
- Backend → Settings → Domains → Custom Domain
  - 输入：`api.me2.yourdomain.com`
- Frontend → Settings → Domains → Custom Domain
  - 输入：`me2.yourdomain.com`

**2. 配置 DNS**
在你的域名提供商（如 Cloudflare）：
```
类型: CNAME
名称: api.me2
目标: railway提供的地址

类型: CNAME
名称: me2
目标: railway提供的地址
```

**3. 更新环境变量**
```bash
# 后端
ALLOWED_ORIGINS=https://me2.yourdomain.com

# 前端
NEXT_PUBLIC_API_URL=https://api.me2.yourdomain.com/api/v1
```

**4. 等待生效**
- DNS 传播：5分钟-24小时
- HTTPS 证书：自动配置（Let's Encrypt）

---

## 📱 测试 PWA 功能

**在手机上**：
1. 访问 `https://me2.yourdomain.com`（必须 HTTPS）
2. 等待安装提示（第3次访问）
3. 或手动添加到主屏幕

**验证**：
- 访问 `https://me2.yourdomain.com/pwa-test.html`
- 检查所有 PWA 功能是否正常

---

## 🐛 常见问题

### Q: 后端部署失败？
**A**:
1. 检查日志：Deployments → View Logs
2. 确认所有环境变量已设置
3. 确认 API Keys 有效

### Q: 前端显示"连接失败"？
**A**:
1. 检查 NEXT_PUBLIC_API_URL 是否正确
2. 检查后端 ALLOWED_ORIGINS 是否包含前端 URL
3. 确认两个服务都使用 HTTPS

### Q: CORS 错误？
**A**:
```bash
# 后端 ALLOWED_ORIGINS 应该是完整 URL
ALLOWED_ORIGINS=https://frontend-xxx.railway.app

# 不要遗漏 https://
# 不要添加尾部斜杠 /
```

### Q: 如何查看成本？
**A**:
Railway Dashboard → 右上角头像 → Usage → 查看当前使用量

---

## 📊 部署后检查清单

完成后确认：
- [ ] 后端服务：绿色 ✅
- [ ] 前端服务：绿色 ✅
- [ ] 数据库：绿色 ✅
- [ ] `/health` 返回 healthy
- [ ] `/docs` 可以访问
- [ ] 前端页面正常显示
- [ ] 可以注册新用户
- [ ] 可以登录
- [ ] 聊天功能正常
- [ ] 记忆功能正常
- [ ] HTTPS 证书有效
- [ ] PWA 可以安装（手机）

---

## 💰 预估成本

**Railway Hobby Plan**:
- 免费额度：$5/月
- 小规模使用：~$10-15/月
- 中等流量：~$20-30/月

**省钱技巧**:
- 使用远程 Embedding API（而非本地模型）
- 启用缓存减少数据库查询
- 监控并优化 LLM API 调用

---

## 📚 完整文档

- 详细部署指南：`RAILWAY_DEPLOYMENT_GUIDE.md`
- PWA 使用指南：`MOBILE_PWA_GUIDE.md`
- 快速开始：`MOBILE_QUICK_START.md`

---

## 🎉 完成！

恭喜！Me2 已成功部署到 Railway 并支持 PWA！

**下一步**：
1. 在手机上安装 PWA
2. 邀请朋友测试
3. 收集反馈并改进

**需要帮助**？
- Railway 文档：https://docs.railway.app/
- 提交 Issue：GitHub Issues

---

**祝你部署顺利！** 🚀
