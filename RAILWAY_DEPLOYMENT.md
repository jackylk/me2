# Railway 部署指南

## 环境变量配置

在 Railway 项目中设置以下环境变量：

### 必需变量
```
DEEPSEEK_API_KEY=sk-30d75a8ee66d43e89449736541fc6fdb
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
```

### 安全变量（生产环境必须更改）
生成随机密钥：
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

设置：
```
SECRET_KEY=<生成的随机字符串>
JWT_SECRET=<生成的随机字符串>
DEBUG=False
```

## 部署步骤

1. **推送代码到 GitHub**
   ```bash
   git add .
   git commit -m "Add Railway deployment config"
   git push
   ```

2. **在 Railway 创建项目**
   - 访问 https://railway.app
   - New Project → Deploy from GitHub
   - 选择 me2 仓库

3. **添加 PostgreSQL**
   - New → Database → PostgreSQL
   - Railway 自动设置 DATABASE_URL

4. **配置环境变量**
   - 在 Variables 标签页添加上述环境变量

5. **运行数据库迁移**
   - 部署成功后，在 Shell 中执行：
   ```bash
   cd backend && alembic upgrade head
   ```

6. **验证部署**
   - 访问: https://your-app.railway.app/health
   - API文档: https://your-app.railway.app/docs

## 前端配置

更新 `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=https://your-app.railway.app/api/v1
```

## 故障排查

- 查看日志：Deployments → 最新部署 → Logs
- 检查环境变量：Variables 标签页
- 重启服务：Settings → Restart
