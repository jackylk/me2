#!/bin/bash
# 运行测试套件

set -e

echo "================================"
echo "Me2 测试套件"
echo "================================"
echo ""

# 进入后端目录
cd "$(dirname "$0")"

# 激活虚拟环境（如果存在）
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# 检查 pytest 是否安装
if ! command -v pytest &> /dev/null; then
    echo "Error: pytest 未安装"
    echo "请运行: pip install -r requirements.txt"
    exit 1
fi

# 解析参数
MODE="${1:-all}"

case "$MODE" in
    unit)
        echo "运行单元测试..."
        pytest tests/ -m unit -v
        ;;

    integration)
        echo "运行集成测试..."
        pytest tests/ -m integration -v
        ;;

    api)
        echo "运行 API 测试..."
        pytest tests/api/ -v
        ;;

    services)
        echo "运行服务层测试..."
        pytest tests/services/ -v
        ;;

    coverage)
        echo "运行测试并生成覆盖率报告..."
        pytest tests/ -v --cov=app --cov-report=html --cov-report=term-missing
        echo ""
        echo "覆盖率报告已生成: htmlcov/index.html"
        ;;

    quick)
        echo "快速测试（跳过慢速测试）..."
        pytest tests/ -v -m "not slow and not requires_llm"
        ;;

    watch)
        echo "监视模式（文件变化时自动重新测试）..."
        pytest-watch tests/ -v
        ;;

    all)
        echo "运行所有测试..."
        pytest tests/ -v
        ;;

    *)
        echo "Usage: $0 {unit|integration|api|services|coverage|quick|watch|all}"
        echo ""
        echo "选项说明:"
        echo "  unit        - 只运行单元测试"
        echo "  integration - 只运行集成测试"
        echo "  api         - 只运行 API 测试"
        echo "  services    - 只运行服务层测试"
        echo "  coverage    - 运行测试并生成覆盖率报告"
        echo "  quick       - 快速测试（跳过慢速和需要 LLM 的测试）"
        echo "  watch       - 监视模式"
        echo "  all         - 运行所有测试（默认）"
        exit 1
        ;;
esac

exit_code=$?

echo ""
echo "================================"
if [ $exit_code -eq 0 ]; then
    echo "✓ 测试通过"
else
    echo "✗ 测试失败"
fi
echo "================================"

exit $exit_code
