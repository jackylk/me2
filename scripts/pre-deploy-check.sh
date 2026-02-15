#!/bin/bash
# Me2 Railway 部署前检查脚本

set -e

echo "🔍 Me2 Railway 部署前检查"
echo "================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查计数
PASSED=0
FAILED=0
WARNINGS=0

# 检查函数
check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

echo "📦 1. 检查项目结构"
echo "--------------------------------"

if [ -d "backend" ]; then
    check_pass "后端目录存在"
else
    check_fail "后端目录不存在"
fi

if [ -d "frontend" ]; then
    check_pass "前端目录存在"
else
    check_fail "前端目录不存在"
fi

if [ -f "backend/requirements.txt" ]; then
    check_pass "后端依赖文件存在"
else
    check_fail "后端 requirements.txt 不存在"
fi

if [ -f "frontend/package.json" ]; then
    check_pass "前端依赖文件存在"
else
    check_fail "前端 package.json 不存在"
fi

echo ""
echo "⚙️  2. 检查配置文件"
echo "--------------------------------"

if [ -f "backend/railway.json" ]; then
    check_pass "后端 railway.json 存在"
else
    check_warn "后端 railway.json 不存在（Railway 会使用默认配置）"
fi

if [ -f "frontend/railway.json" ]; then
    check_pass "前端 railway.json 存在"
else
    check_warn "前端 railway.json 不存在（Railway 会使用默认配置）"
fi

if [ -f "backend/.env.example" ]; then
    check_pass "后端环境变量示例存在"
else
    check_fail "backend/.env.example 不存在"
fi

if [ -f "frontend/.env.local.example" ]; then
    check_pass "前端环境变量示例存在"
else
    check_fail "frontend/.env.local.example 不存在"
fi

echo ""
echo "🔑 3. 检查环境变量（示例文件）"
echo "--------------------------------"

# 检查后端必需变量
required_backend_vars=("DEEPSEEK_API_KEY" "DATABASE_URL" "SECRET_KEY" "JWT_SECRET")
for var in "${required_backend_vars[@]}"; do
    if grep -q "$var" backend/.env.example 2>/dev/null; then
        check_pass "后端 $var 已定义"
    else
        check_fail "后端 $var 未定义"
    fi
done

# 检查前端必需变量
if grep -q "NEXT_PUBLIC_API_URL" frontend/.env.local.example 2>/dev/null; then
    check_pass "前端 NEXT_PUBLIC_API_URL 已定义"
else
    check_fail "前端 NEXT_PUBLIC_API_URL 未定义"
fi

echo ""
echo "📱 4. 检查 PWA 文件"
echo "--------------------------------"

if [ -f "frontend/public/manifest.json" ]; then
    check_pass "PWA manifest.json 存在"
else
    check_warn "PWA manifest.json 不存在"
fi

if [ -f "frontend/public/sw.js" ]; then
    check_pass "Service Worker 存在"
else
    check_warn "Service Worker 不存在"
fi

if [ -d "frontend/public/icons" ]; then
    icon_count=$(ls frontend/public/icons/*.png 2>/dev/null | wc -l)
    if [ "$icon_count" -ge 5 ]; then
        check_pass "PWA 图标文件存在 ($icon_count 个)"
    else
        check_warn "PWA 图标文件较少 ($icon_count 个)"
    fi
else
    check_warn "PWA 图标目录不存在"
fi

echo ""
echo "🔒 5. 安全检查"
echo "--------------------------------"

# 检查是否有 .env 文件（不应该提交）
if [ -f "backend/.env" ]; then
    check_warn "backend/.env 存在 - 确保已添加到 .gitignore"
else
    check_pass "backend/.env 不存在（正确）"
fi

if [ -f "frontend/.env.local" ]; then
    check_warn "frontend/.env.local 存在 - 确保已添加到 .gitignore"
else
    check_pass "frontend/.env.local 不存在（正确）"
fi

# 检查 .gitignore
if [ -f ".gitignore" ]; then
    if grep -q ".env" .gitignore; then
        check_pass ".gitignore 包含 .env"
    else
        check_fail ".gitignore 未包含 .env"
    fi
else
    check_fail ".gitignore 不存在"
fi

echo ""
echo "📝 6. 检查文档"
echo "--------------------------------"

if [ -f "README.md" ]; then
    check_pass "README.md 存在"
else
    check_warn "README.md 不存在"
fi

if [ -f "RAILWAY_DEPLOYMENT_GUIDE.md" ]; then
    check_pass "部署指南存在"
else
    check_warn "RAILWAY_DEPLOYMENT_GUIDE.md 不存在"
fi

echo ""
echo "🔧 7. 检查 Git 状态"
echo "--------------------------------"

# 检查是否在 git 仓库中
if git rev-parse --git-dir > /dev/null 2>&1; then
    check_pass "在 Git 仓库中"

    # 检查是否有未提交的更改
    if git diff-index --quiet HEAD -- 2>/dev/null; then
        check_pass "没有未提交的更改"
    else
        check_warn "有未提交的更改 - 建议先提交"
    fi

    # 检查远程仓库
    if git remote -v | grep -q "origin"; then
        check_pass "已配置 Git 远程仓库"
    else
        check_fail "未配置 Git 远程仓库"
    fi
else
    check_fail "不在 Git 仓库中"
fi

echo ""
echo "================================"
echo "📊 检查结果汇总"
echo "================================"
echo -e "${GREEN}✅ 通过: $PASSED${NC}"
echo -e "${RED}❌ 失败: $FAILED${NC}"
echo -e "${YELLOW}⚠️  警告: $WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 所有必需检查通过！可以开始部署。${NC}"
    echo ""
    echo "📋 下一步："
    echo "1. 提交所有更改: git add . && git commit -m 'Ready for Railway deployment'"
    echo "2. 推送到 GitHub: git push origin master"
    echo "3. 访问 Railway: https://railway.app/"
    echo "4. 按照 RAILWAY_DEPLOYMENT_GUIDE.md 进行部署"
    exit 0
else
    echo -e "${RED}❌ 检查失败！请修复上述问题后再部署。${NC}"
    exit 1
fi
