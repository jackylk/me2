# Me2 测试指南

## 概述

本文档描述 Me2 项目的测试策略、框架和最佳实践。

## 测试架构

```
测试层次：
┌─────────────────────────────────────┐
│ E2E 测试 (Playwright) - 未实现      │
├─────────────────────────────────────┤
│ 前端组件测试 (Jest + RTL)           │
├─────────────────────────────────────┤
│ API 集成测试 (pytest + httpx)       │
├─────────────────────────────────────┤
│ 服务单元测试 (pytest + mock)        │
└─────────────────────────────────────┘
```

## 后端测试

### 目录结构

```
backend/tests/
├── conftest.py              # pytest fixtures
├── api/                     # API 测试
│   ├── test_chat.py
│   ├── test_memories.py
│   └── ...
├── services/                # 服务层测试
│   ├── test_conversation_engine.py
│   ├── test_mimic_engine.py
│   └── ...
└── utils/                   # 工具测试
```

### 运行测试

```bash
cd backend

# 运行所有测试
make test

# 运行单元测试
make test-unit

# 运行 API 测试
make test-api

# 生成覆盖率报告
make test-coverage

# 快速测试（跳过慢速测试）
make test-quick
```

### 或使用脚本

```bash
# 所有测试
./run_tests.sh all

# 单元测试
./run_tests.sh unit

# 集成测试
./run_tests.sh integration

# API 测试
./run_tests.sh api

# 覆盖率报告
./run_tests.sh coverage
```

### Pytest 标记

使用标记来分类测试：

```python
@pytest.mark.unit           # 单元测试（快速，无外部依赖）
@pytest.mark.integration    # 集成测试（需要数据库）
@pytest.mark.api            # API 测试
@pytest.mark.slow           # 慢速测试
@pytest.mark.requires_db    # 需要数据库
@pytest.mark.requires_llm   # 需要 LLM API（跳过 CI）
```

运行特定标记的测试：

```bash
pytest -m unit              # 只运行单元测试
pytest -m "not slow"        # 跳过慢速测试
pytest -m "not requires_llm"  # 跳过需要 LLM 的测试
```

### Fixtures

常用 fixtures（定义在 `conftest.py`）：

- `db_session` - 测试数据库会话
- `client` - HTTP 测试客户端
- `test_user_id` - 测试用户 ID
- `sample_messages` - 示例消息列表
- `mock_llm_response` - Mock LLM 响应
- `mock_neuromemory` - Mock NeuroMemory 客户端
- `create_test_user` - 创建测试用户
- `create_test_profile` - 创建测试画像

使用示例：

```python
async def test_example(db_session, test_user_id, mock_llm_response):
    # 使用 fixtures...
    pass
```

### 编写测试

#### 单元测试示例

```python
@pytest.mark.unit
@pytest.mark.asyncio
async def test_mimic_engine_learn(db_session, test_user_id):
    """测试思维模仿引擎学习功能"""
    engine = MimicEngine(db_session)

    await engine.learn_from_message(
        user_id=test_user_id,
        message="测试消息"
    )

    profile = await engine.get_profile(test_user_id)
    assert profile is not None
```

#### API 测试示例

```python
@pytest.mark.api
@pytest.mark.asyncio
async def test_chat_endpoint(client, test_user_id):
    """测试聊天 API"""
    with patch('app.services.llm_client.llm_client.generate',
               new=AsyncMock(return_value="回复")):
        response = await client.post(
            "/api/v1/chat",
            json={"user_id": test_user_id, "message": "你好"}
        )

    assert response.status_code == 200
    data = response.json()
    assert "response" in data
```

### Mock 策略

1. **Mock 外部服务**：
   - LLM API（DeepSeek, Gemini）
   - NeuroMemory API
   - 图片存储（S3）

2. **使用内存数据库**：
   - SQLite in-memory 用于测试

3. **Mock 示例**：

```python
# Mock LLM
with patch('app.services.llm_client.llm_client.generate',
           new=AsyncMock(return_value="mock response")):
    # 测试代码...
    pass

# Mock NeuroMemory
with patch.object(engine, 'neuromemory_client', mock_neuromemory):
    # 测试代码...
    pass
```

## 前端测试

### 目录结构

```
frontend/__tests__/
├── components/              # 组件测试
│   ├── Navigation.test.tsx
│   ├── ChatInterface.test.tsx
│   └── ...
├── lib/                     # 工具函数测试
│   └── api-client.test.ts
└── integration/             # 集成测试
```

### 运行测试

```bash
cd frontend

# 安装依赖（首次）
npm install

# 运行所有测试
npm test

# 监视模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# CI 模式
npm run test:ci
```

### 编写组件测试

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import Navigation from '@/components/Navigation'

describe('Navigation', () => {
  it('renders navigation links', () => {
    render(<Navigation />)

    expect(screen.getByText('聊天')).toBeInTheDocument()
    expect(screen.getByText('画像')).toBeInTheDocument()
  })

  it('handles click events', async () => {
    render(<Navigation />)

    const chatLink = screen.getByText('聊天')
    fireEvent.click(chatLink)

    // 验证导航...
  })
})
```

### Mock Next.js

Next.js 路由和功能已在 `jest.setup.js` 中自动 mock：

```javascript
// 已自动 mock，无需手动配置
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), ... }),
  usePathname: () => '/',
}))
```

### Mock API 调用

```typescript
// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ response: 'mock' }),
    ok: true,
    status: 200,
  })
)

// 测试代码...
```

## CI/CD 集成

### GitHub Actions 示例

创建 `.github/workflows/test.yml`：

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt

      - name: Run tests
        run: |
          cd backend
          pytest tests/ -m "not requires_llm" --cov=app --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage.xml

  frontend-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd frontend
          npm install

      - name: Run tests
        run: |
          cd frontend
          npm run test:ci
```

## 测试覆盖率

### 查看覆盖率

后端：
```bash
cd backend
make test-coverage
# 打开 htmlcov/index.html
```

前端：
```bash
cd frontend
npm run test:coverage
# 打开 coverage/lcov-report/index.html
```

### 覆盖率目标

| 层次 | 当前 | 目标 |
|------|------|------|
| 后端单元测试 | 40% | 80% |
| 后端集成测试 | 0% | 60% |
| 前端组件测试 | 0% | 70% |
| 总体覆盖率 | 20% | 75% |

## 测试最佳实践

### 1. 测试命名

```python
# ✓ 好的命名
def test_learn_from_message_updates_profile():
    pass

def test_chat_api_returns_response():
    pass

# ✗ 不好的命名
def test_1():
    pass

def test_function():
    pass
```

### 2. AAA 模式

```python
async def test_example():
    # Arrange（准备）
    engine = MimicEngine(db_session)

    # Act（执行）
    result = await engine.learn_from_message(...)

    # Assert（断言）
    assert result is not None
```

### 3. 一个测试一个断言（理想情况）

```python
# ✓ 好
def test_profile_has_user_id():
    assert profile.user_id == "test"

def test_profile_has_confidence():
    assert profile.confidence > 0

# ✗ 不推荐（但有时可以接受）
def test_profile_structure():
    assert profile.user_id == "test"
    assert profile.confidence > 0
    assert profile.sample_count > 0
```

### 4. 隔离测试

```python
# ✓ 好 - 使用 fixture 隔离
@pytest.fixture
async def clean_db(db_session):
    # 清理数据库
    yield
    # 回滚事务

async def test_with_isolation(clean_db):
    # 测试在干净的环境中运行
    pass

# ✗ 不好 - 依赖全局状态
global_user = None

async def test_creates_user():
    global global_user
    global_user = create_user()

async def test_uses_user():
    # 依赖上一个测试
    assert global_user is not None
```

### 5. 测试边界条件

```python
async def test_empty_input():
    with pytest.raises(ValueError):
        await engine.process("")

async def test_very_long_input():
    long_text = "x" * 10000
    result = await engine.process(long_text)
    # 应该处理或拒绝

async def test_null_input():
    with pytest.raises(TypeError):
        await engine.process(None)
```

### 6. 使用参数化测试

```python
@pytest.mark.parametrize("message,expected_intent", [
    ("你好", "CHAT"),
    ("我很难过", "EMOTIONAL"),
    ("你觉得我应该怎么做？", "ADVICE"),
])
async def test_intent_analysis(message, expected_intent):
    intent = await analyze(message)
    assert intent == expected_intent
```

## 调试测试

### 1. 运行单个测试

```bash
# 运行特定文件
pytest tests/services/test_mimic_engine.py

# 运行特定测试
pytest tests/services/test_mimic_engine.py::test_learn_from_message

# 运行特定类
pytest tests/services/test_mimic_engine.py::TestMimicEngine
```

### 2. 使用 pdb 调试

```python
def test_example():
    result = some_function()

    import pdb; pdb.set_trace()  # 断点

    assert result == expected
```

### 3. 查看详细输出

```bash
# 显示 print 输出
pytest -s

# 显示详细错误
pytest -vv

# 显示局部变量
pytest --showlocals
```

## 常见问题

### Q: 测试运行很慢？

A: 使用快速测试模式：
```bash
make test-quick
# 或
pytest -m "not slow"
```

### Q: 如何跳过需要 API Key 的测试？

A: 测试会自动检查 API Key，如果不存在会跳过：
```python
@pytest.mark.requires_llm
async def test_with_llm(skip_if_no_api_key):
    skip_if_no_api_key("deepseek")
    # 测试代码...
```

### Q: 数据库测试相互干扰？

A: 使用事务隔离（conftest.py 中已配置）：
```python
@pytest.fixture
async def db_session(test_engine):
    async with async_session() as session:
        yield session
        await session.rollback()  # 自动回滚
```

### Q: 前端测试报错 "Cannot find module"？

A: 检查 jest.config.js 中的 moduleNameMapper 配置。

## 下一步

- [ ] 提高单元测试覆盖率至 80%
- [ ] 添加更多 API 集成测试
- [ ] 添加前端组件测试
- [ ] 设置 CI/CD 自动化测试
- [ ] 添加 E2E 测试（Playwright）
- [ ] 性能测试和压力测试

## 参考资源

- [Pytest 文档](https://docs.pytest.org/)
- [Testing Library 文档](https://testing-library.com/)
- [Jest 文档](https://jestjs.io/)
- [Next.js 测试指南](https://nextjs.org/docs/testing)
