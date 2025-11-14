#!/bin/bash

echo "=================================="
echo "Supervisor MCP Server 安装验证"
echo "=================================="
echo

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在 supervisor-mcp-server 目录下运行此脚本"
    exit 1
fi

echo "✅ 目录检查通过"

# 检查 Node.js 版本
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未安装 Node.js"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ 错误: Node.js 版本过低 (需要 >= 18.0.0, 当前: $(node -v))"
    exit 1
fi

echo "✅ Node.js 版本检查通过: $(node -v)"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未安装 npm"
    exit 1
fi

echo "✅ npm 版本: $(npm -v)"

echo
echo "📦 安装依赖包..."
npm install

echo
echo "🔧 构建项目..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ 项目构建成功"
else
    echo "❌ 项目构建失败"
    exit 1
fi

echo
echo "🔍 检查关键文件..."

# 检查核心源文件
FILES=(
    "src/server.ts"
    "src/supervisordClient.ts" 
    "src/configManager.ts"
    "src/logReader.ts"
    "package.json"
    "tsconfig.json"
    "HTTP_LOGGING.md"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file 存在"
    else
        echo "❌ $file 缺失"
        exit 1
    fi
done

echo
echo "🎯 检查 HTTP 日志功能..."

# 检查 Morgan 集成
if grep -q "import morgan from 'morgan'" src/server.ts; then
    echo "✅ Morgan 导入检查通过"
else
    echo "❌ Morgan 导入缺失"
    exit 1
fi

if grep -q "app.use(morgan('combined'))" src/server.ts; then
    echo "✅ Morgan 中间件配置检查通过"
else
    echo "❌ Morgan 中间件配置缺失"
    exit 1
fi

# 检查依赖
if npm ls morgan &> /dev/null; then
    echo "✅ Morgan 依赖检查通过"
else
    echo "⚠️  Morgan 依赖可能未正确安装"
fi

if npm ls @types/morgan &> /dev/null; then
    echo "✅ Morgan 类型定义检查通过"
else
    echo "⚠️  Morgan 类型定义可能未正确安装"
fi

echo
echo "=================================="
echo "✅ 安装验证完成！"
echo "=================================="
echo
echo "🚀 使用方法:"
echo "  启动开发模式: npm run dev"
echo "  构建项目:      npm run build"  
echo "  生产启动:      npm start"
echo
echo "📖 文档:"
echo "  README.md         - 项目总体说明"
echo "  HTTP_LOGGING.md   - HTTP 日志功能详细说明"
echo "  QUICK_START.md    - 快速开始指南"
echo "  PROJECT_OVERVIEW.md - 项目架构概览"
echo
echo "🌐 HTTP 日志:"
echo "  项目已集成 Morgan 中间件"
echo "  使用 Apache combined 格式记录所有 HTTP 请求"
echo "  日志直接输出到控制台"
echo
echo "系统已准备就绪，可以开始使用！"
echo