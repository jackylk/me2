.PHONY: test test-unit test-integration test-api test-coverage test-quick install clean

# 默认目标
.DEFAULT_GOAL := help

help:
	@echo "Me2 后端测试命令"
	@echo ""
	@echo "make install       - 安装依赖"
	@echo "make test          - 运行所有测试"
	@echo "make test-unit     - 运行单元测试"
	@echo "make test-integration - 运行集成测试"
	@echo "make test-api      - 运行 API 测试"
	@echo "make test-coverage - 运行测试并生成覆盖率报告"
	@echo "make test-quick    - 快速测试（跳过慢速测试）"
	@echo "make clean         - 清理测试文件"

install:
	pip install -r requirements.txt

test:
	./run_tests.sh all

test-unit:
	./run_tests.sh unit

test-integration:
	./run_tests.sh integration

test-api:
	./run_tests.sh api

test-services:
	./run_tests.sh services

test-coverage:
	./run_tests.sh coverage

test-quick:
	./run_tests.sh quick

clean:
	rm -rf .pytest_cache
	rm -rf htmlcov
	rm -rf .coverage
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
