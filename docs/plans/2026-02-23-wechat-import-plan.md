# 微信聊天记录导入 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现微信私聊记录导入功能——本地转换脚本 + 后端 API + 前端页面，记忆提取部分等 NeuroMemory 支持后再接入。

**Architecture:** 用户用 wechat-dump-rs 解密本地数据库后，运行项目提供的 `scripts/wechat_to_json.py` 生成标准 JSON；上传到 Me2 后端，后端解析并暂存原始消息到 `import_tasks` 表；前端显示进度和摘要。

**Tech Stack:** Python (sqlite3, argparse), FastAPI, SQLAlchemy async, Next.js (已有导入页面框架)

---

### Task 1: ImportTask 数据库模型

**Files:**
- Modify: `backend/app/db/models.py`

**Step 1: 在 `models.py` 末尾追加 ImportTask 模型**

```python
class ImportTask(Base):
    """微信聊天导入任务"""
    __tablename__ = "import_tasks"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="pending")  # pending|processing|completed|failed
    my_name = Column(String(100), nullable=False)
    contact_name = Column(String(100), nullable=True)
    total_messages = Column(String, nullable=True)   # 总消息数（字符串存int）
    date_range_start = Column(DateTime(timezone=True), nullable=True)
    date_range_end = Column(DateTime(timezone=True), nullable=True)
    raw_messages = Column(JSON, nullable=True)        # 原始消息列表，等提取时使用
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

**Step 2: 验证模型能被 init_db 创建**

```bash
cd /Users/jacky/code/me2/backend
python -c "
import asyncio
from app.db.database import init_db
asyncio.run(init_db())
print('OK')
"
```
Expected: 输出 `OK`，无报错

**Step 3: Commit**

```bash
git add backend/app/db/models.py
git commit -m "feat: add ImportTask model for wechat import"
```

---

### Task 2: 后端导入 API

**Files:**
- Create: `backend/app/api/v1/import_api.py`
- Modify: `backend/app/main.py` (注册路由)

**Step 1: 创建 `import_api.py`**

```python
"""微信聊天记录导入 API"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import json
import logging
from datetime import datetime

from app.db.database import get_db
from app.db.models import ImportTask, generate_uuid
from app.dependencies.auth import get_current_user
from app.db.models import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/import", tags=["导入"])


class TaskResponse(BaseModel):
    task_id: str
    status: str
    my_name: str
    contact_name: Optional[str]
    total_messages: int
    date_range_start: Optional[str]
    date_range_end: Optional[str]
    error_message: Optional[str]


def parse_wechat_json(raw: bytes) -> dict:
    """解析并验证微信对话 JSON 格式"""
    try:
        data = json.loads(raw.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="文件不是合法的 JSON")

    if "messages" not in data or not isinstance(data["messages"], list):
        raise HTTPException(status_code=400, detail="JSON 缺少 messages 字段")
    if "my_name" not in data:
        raise HTTPException(status_code=400, detail="JSON 缺少 my_name 字段")

    # 过滤掉空消息
    messages = [
        m for m in data["messages"]
        if m.get("text", "").strip() and m.get("sender") in ("me", "other")
    ]
    if not messages:
        raise HTTPException(status_code=400, detail="没有找到有效的文本消息")

    return {
        "my_name": data["my_name"],
        "contact_name": data.get("contact_name", ""),
        "messages": messages,
    }


@router.post("/upload")
async def upload_import(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    raw = await file.read()
    parsed = parse_wechat_json(raw)

    messages = parsed["messages"]

    # 计算时间范围
    times = []
    for m in messages:
        try:
            times.append(datetime.strptime(m["time"], "%Y-%m-%d %H:%M:%S"))
        except Exception:
            pass
    date_start = min(times) if times else None
    date_end = max(times) if times else None

    task = ImportTask(
        id=generate_uuid(),
        user_id=current_user.id,
        status="pending",
        my_name=parsed["my_name"],
        contact_name=parsed["contact_name"],
        total_messages=str(len(messages)),
        date_range_start=date_start,
        date_range_end=date_end,
        raw_messages=messages,
    )
    db.add(task)
    await db.commit()

    return {
        "task_id": task.id,
        "status": task.status,
        "my_name": task.my_name,
        "contact_name": task.contact_name,
        "total_messages": len(messages),
        "date_range_start": date_start.isoformat() if date_start else None,
        "date_range_end": date_end.isoformat() if date_end else None,
    }


@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ImportTask).where(
            ImportTask.id == task_id,
            ImportTask.user_id == current_user.id,
        )
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    return TaskResponse(
        task_id=task.id,
        status=task.status,
        my_name=task.my_name,
        contact_name=task.contact_name,
        total_messages=int(task.total_messages or 0),
        date_range_start=task.date_range_start.isoformat() if task.date_range_start else None,
        date_range_end=task.date_range_end.isoformat() if task.date_range_end else None,
        error_message=task.error_message,
    )
```

**Step 2: 在 `main.py` 注册路由**

在 `backend/app/main.py` 找到这段：
```python
from app.api.v1 import auth, chat, memories
app.include_router(auth.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(memories.router, prefix="/api/v1")
```

改为：
```python
from app.api.v1 import auth, chat, memories, import_api
app.include_router(auth.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(memories.router, prefix="/api/v1")
app.include_router(import_api.router, prefix="/api/v1")
```

**Step 3: 本地测试接口可访问**

```bash
cd /Users/jacky/code/me2/backend
python -c "
from app.api.v1.import_api import parse_wechat_json
import json
sample = json.dumps({
    'my_name': 'Jackie',
    'contact_name': '好友',
    'messages': [
        {'time': '2024-01-15 10:30:00', 'sender': 'me', 'text': '你好'},
        {'time': '2024-01-15 10:31:00', 'sender': 'other', 'text': '你好啊'},
    ]
}).encode()
result = parse_wechat_json(sample)
assert result['my_name'] == 'Jackie'
assert len(result['messages']) == 2
print('OK')
"
```
Expected: `OK`

**Step 4: Commit**

```bash
git add backend/app/api/v1/import_api.py backend/app/main.py
git commit -m "feat: add wechat import API (upload + task query)"
```

---

### Task 3: 本地转换脚本

**Files:**
- Create: `scripts/wechat_to_json.py`

**Step 1: 创建转换脚本**

```python
#!/usr/bin/env python3
"""
微信聊天记录转换脚本
用途：将 wechat-dump-rs 解密后的 SQLite .db 文件转换为 Me2 导入格式 JSON

使用方式：
  python scripts/wechat_to_json.py \\
    --db-dir ~/wechat_decrypted \\
    --contact "好友昵称" \\
    --my-name "我的昵称" \\
    --output chat.json

前置步骤：
  1. 下载 wechat-dump-rs: https://github.com/0xlane/wechat-dump-rs/releases
  2. 打开微信，运行: wechat-dump-rs -o ~/wechat_decrypted
  3. 运行本脚本
"""
import argparse
import json
import os
import sqlite3
from datetime import datetime
from pathlib import Path


def find_contact_in_db(db_path: str, contact_name: str) -> tuple[str | None, list]:
    """在单个 db 文件中查找联系人的消息"""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # 获取所有表名
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in cursor.fetchall()]

        messages = []
        for table in tables:
            # 微信消息表名格式: Chat_xxxxxxxx
            if not table.startswith("Chat_"):
                continue
            try:
                # 检查这个表是否有目标联系人的消息
                # Des=0 表示我发出，Des=1 表示对方发来
                # Type=1 表示文本消息
                cursor.execute(f"""
                    SELECT CreateTime, Des, Message
                    FROM {table}
                    WHERE Type = 1
                    ORDER BY CreateTime ASC
                """)
                rows = cursor.fetchall()
                if rows:
                    # 采样前几条消息检查是否是目标联系人
                    # （实际匹配需要联系人表，这里用表名做简单过滤）
                    messages.extend([
                        {
                            "time": datetime.fromtimestamp(row[0]).strftime("%Y-%m-%d %H:%M:%S"),
                            "sender": "me" if row[1] == 0 else "other",
                            "text": row[2] or "",
                            "_table": table,
                        }
                        for row in rows
                        if row[2] and row[2].strip()
                    ])
            except Exception:
                continue

        conn.close()
        return messages
    except Exception as e:
        print(f"  跳过 {db_path}: {e}")
        return []


def find_contact_table(db_dir: str, contact_name: str) -> list:
    """扫描所有 msg_X.db，尝试通过联系人表匹配"""
    db_dir = Path(db_dir)
    all_messages = []

    # 先尝试在 Contact 数据库找到联系人的 wxid
    contact_wxid = None
    contact_db_candidates = list(db_dir.glob("**/wccontact_new2.db"))
    for contact_db in contact_db_candidates:
        try:
            conn = sqlite3.connect(str(contact_db))
            cursor = conn.cursor()
            cursor.execute("""
                SELECT m_nsUsrName, m_nsNickName, m_nsRemark
                FROM WCContact
                WHERE m_nsNickName LIKE ? OR m_nsRemark LIKE ?
            """, (f"%{contact_name}%", f"%{contact_name}%"))
            row = cursor.fetchone()
            if row:
                contact_wxid = row[0]
                print(f"找到联系人: {row[1]}（备注: {row[2]}）wxid: {contact_wxid}")
            conn.close()
            if contact_wxid:
                break
        except Exception:
            continue

    # 扫描所有消息 db
    msg_dbs = sorted(db_dir.glob("**/msg_*.db"))
    if not msg_dbs:
        # 尝试当前目录
        msg_dbs = sorted(Path(".").glob("msg_*.db"))

    print(f"扫描 {len(msg_dbs)} 个消息数据库...")
    for db_path in msg_dbs:
        print(f"  处理: {db_path.name}")
        msgs = find_contact_in_db(str(db_path), contact_name)

        if contact_wxid:
            # 用 wxid 过滤对应的 Chat 表
            target_table = f"Chat_{contact_wxid.replace('@', '').replace('.', '')}"
            msgs = [m for m in msgs if m.get("_table") == target_table]

        all_messages.extend(msgs)

    return all_messages


def main():
    parser = argparse.ArgumentParser(description="微信聊天记录转 JSON")
    parser.add_argument("--db-dir", required=True, help="wechat-dump-rs 解密输出目录")
    parser.add_argument("--contact", required=True, help="对方的微信昵称或备注名")
    parser.add_argument("--my-name", required=True, help="你自己的昵称")
    parser.add_argument("--output", default="wechat_chat.json", help="输出 JSON 文件路径")
    args = parser.parse_args()

    print(f"开始转换: {args.contact} 的聊天记录")
    messages = find_contact_table(args.db_dir, args.contact)

    if not messages:
        print("❌ 没有找到消息，请检查：")
        print("   1. --db-dir 是否是 wechat-dump-rs 的输出目录")
        print("   2. --contact 是否是对方的昵称或备注名")
        return

    # 去掉内部字段，按时间排序
    for m in messages:
        m.pop("_table", None)
    messages.sort(key=lambda m: m["time"])

    output = {
        "source": "wechat",
        "my_name": args.my_name,
        "contact_name": args.contact,
        "exported_at": datetime.now().isoformat(),
        "messages": messages,
    }

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    me_count = sum(1 for m in messages if m["sender"] == "me")
    print(f"✅ 完成！共 {len(messages)} 条消息（我: {me_count} 条，对方: {len(messages) - me_count} 条）")
    print(f"   时间范围: {messages[0]['time']} ~ {messages[-1]['time']}")
    print(f"   输出文件: {args.output}")


if __name__ == "__main__":
    main()
```

**Step 2: 用样例数据验证脚本逻辑**

```bash
cd /Users/jacky/code/me2
python -c "
import json, sys
sys.argv = ['test']
# 直接测试 parse 逻辑
sample = {
    'source': 'wechat',
    'my_name': 'Jackie',
    'contact_name': '好友',
    'exported_at': '2026-01-01T00:00:00',
    'messages': [
        {'time': '2024-01-15 10:30:00', 'sender': 'me', 'text': '你好'},
        {'time': '2024-01-15 10:31:00', 'sender': 'other', 'text': '你好啊'},
        {'time': '2024-01-15 10:32:00', 'sender': 'me', 'text': '最近怎么样'},
    ]
}
with open('/tmp/test_wechat.json', 'w') as f:
    json.dump(sample, f, ensure_ascii=False)
print('样例 JSON 已写入 /tmp/test_wechat.json')
"
```

**Step 3: Commit**

```bash
git add scripts/wechat_to_json.py
git commit -m "feat: add wechat SQLite to JSON conversion script"
```

---

### Task 4: 前端导入页面适配

**Files:**
- Modify: `frontend/app/import/page.tsx`

完整替换文件内容为：

```tsx
'use client';

import { useState } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Loader2, Info } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('me2_access_token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

interface ImportResult {
  task_id: string;
  status: string;
  my_name: string;
  contact_name?: string;
  total_messages: number;
  date_range_start?: string;
  date_range_end?: string;
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/import/upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || '上传失败');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || '上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '未知';
    return new Date(iso).toLocaleDateString('zh-CN');
  };

  return (
    <ProtectedRoute>
      <div className="max-w-2xl mx-auto p-6 pb-20 md:pb-6 h-full overflow-y-auto">
        <h1 className="text-2xl font-bold mb-1 dark:text-white">导入微信聊天记录</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
          将微信私聊记录导入，帮助 Me2 更好地了解你
        </p>

        {/* 使用说明 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">准备步骤</span>
          </div>
          <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
            <li>下载 <a href="https://github.com/0xlane/wechat-dump-rs/releases" target="_blank" rel="noreferrer" className="underline">wechat-dump-rs</a>，打开微信后运行，解密本地数据库</li>
            <li>运行项目中的 <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">scripts/wechat_to_json.py</code>，指定联系人昵称生成 JSON 文件</li>
            <li>在下方上传生成的 JSON 文件</li>
          </ol>
        </div>

        {!result ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
            {/* 文件上传区 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                选择 JSON 文件
              </label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="w-10 h-10 text-gray-400" />
                  {file ? (
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span className="text-blue-600 text-sm">{file.name}</span>
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">点击选择 .json 文件</span>
                  )}
                </label>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full bg-blue-500 text-white rounded-lg px-6 py-3 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {uploading ? (
                <><Loader2 className="w-5 h-5 animate-spin" />上传中...</>
              ) : (
                <><Upload className="w-5 h-5" />开始导入</>
              )}
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <h2 className="text-lg font-semibold dark:text-white">导入成功</h2>
            </div>

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">我的昵称</dt>
                <dd className="font-medium dark:text-white">{result.my_name}</dd>
              </div>
              {result.contact_name && (
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">联系人</dt>
                  <dd className="font-medium dark:text-white">{result.contact_name}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">消息总数</dt>
                <dd className="font-medium dark:text-white">{result.total_messages} 条</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">时间范围</dt>
                <dd className="font-medium dark:text-white">
                  {formatDate(result.date_range_start)} ~ {formatDate(result.date_range_end)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">状态</dt>
                <dd className="text-amber-600 dark:text-amber-400">等待记忆提取（功能即将上线）</dd>
              </div>
            </dl>

            <button
              onClick={() => { setResult(null); setFile(null); }}
              className="mt-6 w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg px-6 py-3 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              继续导入更多
            </button>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/app/import/page.tsx
git commit -m "feat: update import page for wechat JSON upload"
```

---

### Task 5: 把导入入口加回移动端导航

导入页面有了，但移动端「更多」抽屉之前清空过，需要把导入入口加回来。

**Files:**
- Modify: `frontend/components/layout/MobileNav.tsx`
- Modify: `frontend/components/layout/Sidebar.tsx`

**Step 1: MobileNav 加入导入入口**

找到 `drawerItems` 数组：
```tsx
const drawerItems = [
  { href: '/settings', icon: Settings, label: '设置' },
];
```

改为：
```tsx
const drawerItems = [
  { href: '/import', icon: Upload, label: '导入记忆' },
  { href: '/settings', icon: Settings, label: '设置' },
];
```

同时在 import 中加上 `Upload`：
```tsx
import {
  MessageCircle,
  Database,
  MoreHorizontal,
  LogOut,
  X,
  Settings,
  Upload,
} from 'lucide-react';
```

**Step 2: Sidebar 加入导入链接**

在 `Sidebar.tsx` 的导航区，`设置` 前加一行：
```tsx
<SidebarItem href="/import" icon={Upload} label="导入记忆" />
```

并在 import 中加 `Upload`：
```tsx
import { MessageCircle, Database, Settings, Upload } from 'lucide-react';
```

**Step 3: Commit**

```bash
git add frontend/components/layout/MobileNav.tsx frontend/components/layout/Sidebar.tsx
git commit -m "feat: add import entry to sidebar and mobile nav"
```

---

### Task 6: 推送部署

```bash
git push origin master
```

等 Railway 部署完成后，访问 `/import` 页面验证：
- 页面能正常加载
- 上传一个符合格式的 JSON 文件，能看到成功摘要
- 错误格式的文件能看到友好报错