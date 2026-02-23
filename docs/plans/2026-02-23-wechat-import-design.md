# 微信聊天记录导入 设计文档

## 目标

让用户能把微信私聊记录导入 Me2，作为记忆的原始素材。

## 范围（本期）

- 定义微信对话 JSON 格式
- 本地转换脚本：解密后的 SQLite `.db` → JSON
- 后端导入 API：接收 JSON，解析并暂存原始消息
- 前端导入页面：上传 JSON，填写昵称，展示进度

**不在本期范围：** 记忆提取（等 NeuroMemory 支持 `import_conversation` 方法后接入）

## NeuroMemory 需求（转交）

> **功能缺口**：NeuroMemory 当前缺少对「人与人对话」的导入支持。
>
> 需要新增方法：
> ```python
> await nm.import_conversation(
>     user_id: str,
>     messages: list[{"time": str, "sender": "me"|"other", "text": str}],
>     my_role_hint: str = "user",   # 帮助 LLM 理解"我"是谁
> )
> ```
> 该方法应能从任意双人对话中提取所有类型记忆（fact、episodic、insight、知识图谱、情感档案），不依赖 user/assistant 角色结构。

## 用户流程

```
1. 用户用 wechat-dump-rs 解密本地微信数据库，得到 msg_X.db
2. 用户运行 scripts/wechat_to_json.py，指定联系人昵称，得到 JSON 文件
3. 打开 Me2「导入」页面，上传 JSON + 填写「我的昵称」
4. 后端解析、暂存，返回导入摘要（消息数、时间范围）
```

## JSON 格式

```json
{
  "source": "wechat",
  "my_name": "Jackie",
  "contact_name": "好友昵称",
  "exported_at": "2026-02-23T10:00:00",
  "messages": [
    {
      "time": "2024-01-15 10:30:00",
      "sender": "me",
      "text": "今天去爬山了，累死了"
    },
    {
      "time": "2024-01-15 10:31:00",
      "sender": "other",
      "text": "哇去哪座山？"
    }
  ]
}
```

字段说明：
- `sender`: `"me"` 表示用户自己，`"other"` 表示对方
- `text`: 仅含文本消息，图片/语音/视频跳过
- `time`: 本地时间字符串，格式 `YYYY-MM-DD HH:MM:SS`

## 组件设计

### 1. 本地脚本 `scripts/wechat_to_json.py`

输入：
- `--db-dir`：`wechat-dump-rs` 解密后的数据库目录（含多个 `msg_X.db`）
- `--contact`：对方的微信昵称或备注名
- `--my-name`：自己的昵称
- `--output`：输出 JSON 文件路径

逻辑：
1. 扫描所有 `msg_X.db`，找到含目标联系人的消息表
2. 读取文本类型消息（`type=1`），按时间排序
3. 按 `Des` 字段判断方向（`0` = 我发出，`1` = 对方发来）
4. 输出标准 JSON

### 2. 后端 API

**`POST /api/v1/import/upload`**

- 请求：`multipart/form-data`，含 `file`（JSON）、`user_id`
- 响应：`{ "task_id": "...", "total_messages": N, "date_range": "..." }`
- 逻辑：解析 JSON → 验证格式 → 存入数据库待提取 → 返回摘要

**`GET /api/v1/import/tasks/{task_id}`**

- 响应：`{ "status": "pending|processing|completed|failed", "progress": 0.0~1.0, ... }`

### 3. 前端页面 `/app/import`

现有页面 (`frontend/app/import/page.tsx`) 已有完整 UI 框架，调整：
- 文件类型限制为 `.json`
- 数据来源固定为 `wechat`（去掉 Telegram 选项）
- 加入格式说明和 `wechat-dump-rs` 使用步骤
- 加入 Auth header（现有代码缺少）

## 数据库存储

新增表 `import_tasks`：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 任务 ID |
| user_id | str | 用户 ID |
| status | str | pending/processing/completed/failed |
| total_messages | int | 总消息数 |
| my_name | str | 用户昵称 |
| contact_name | str | 对方昵称 |
| date_range_start | datetime | 消息时间范围起 |
| date_range_end | datetime | 消息时间范围止 |
| raw_messages | JSON | 原始消息列表（待提取时使用） |
| created_at | datetime | 创建时间 |

## 后续（等 NeuroMemory 就绪后）

在 `import_tasks` 表的 `status=pending` 任务上，调用：
```python
await nm.import_conversation(user_id, task.raw_messages)
```
将任务状态更新为 `completed`。
