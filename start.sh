#!/bin/bash

# Supervisor MCP Server 启动脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Supervisor MCP Server${NC}"
echo -e "${BLUE}========================================${NC}"

# 检查 Node.js 版本
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: 未找到 Node.js，请先安装 Node.js 18+${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}错误: Node.js 版本过低 ($NODE_VERSION)，需要 18+${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js 版本检查通过: $(node -v)${NC}"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}正在安装依赖...${NC}"
    npm install
fi

echo -e "${GREEN}✓ 依赖检查完成${NC}"

# 检查配置文件
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}未找到 .env 文件，从 .env.example 复制...${NC}"
        cp .env.example .env
        echo -e "${YELLOW}请编辑 .env 文件以配置 supervisord 连接信息${NC}"
    else
        echo -e "${RED}错误: 未找到 .env 配置文件${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ 配置文件检查完成${NC}"

# 加载环境变量
source .env

# 显示配置信息
echo ""
echo -e "${BLUE}配置信息:${NC}"
echo -e "  supervisord 地址: ${GREEN}${SUPERVISORD_HOST:-127.0.0.1}:${SUPERVISORD_PORT:-9001}${NC}"
echo -e "  MCP 服务器端口: ${GREEN}${MCP_PORT:-3000}${NC}"
echo -e "  配置文件路径: ${GREEN}${SUPERVISORD_CONFIG_FILE:-/etc/supervisord.conf}${NC}"
echo ""

# 检查 supervisord 连接
echo -e "${YELLOW}检查 supervisord 连接...${NC}"
if command -v curl &> /dev/null; then
    if curl -f -s "http://${SUPERVISORD_HOST:-127.0.0.1}:${SUPERVISORD_PORT:-9001}/program/list" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ supervisord 连接正常${NC}"
    else
        echo -e "${YELLOW}⚠ 无法连接到 supervisord，请确保 supervisord 正在运行且配置正确${NC}"
    fi
else
    echo -e "${YELLOW}⚠ 未安装 curl，无法检查 supervisord 连接${NC}"
fi

echo ""
echo -e "${BLUE}启动 MCP 服务器...${NC}"

# 启动服务器
if [ "$1" == "dev" ] || [ "$1" == "development" ]; then
    echo -e "${YELLOW}以开发模式启动（使用 tsx）${NC}"
    npm run dev
elif [ "$1" == "build" ]; then
    echo -e "${YELLOW}编译 TypeScript...${NC}"
    npm run build
    echo -e "${GREEN}✓ 编译完成，启动服务器...${NC}"
    npm start
else
    echo -e "${GREEN}默认启动模式${NC}"
    if [ -f "dist/server.js" ]; then
        npm start
    else
        echo -e "${YELLOW}首次运行，先编译 TypeScript...${NC}"
        npm run build
        npm start
    fi
fi