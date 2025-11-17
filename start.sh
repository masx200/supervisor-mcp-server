#!/bin/bash

# Supervisor MCP Server Linux/macOS Startup Script
# This script builds the project and starts the server with environment variables

set -e  # Exit on any error

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Supervisor MCP Server${NC}"
echo -e "${BLUE}========================================${NC}"

echo -e "${YELLOW}🚀 Building Supervisor MCP Server...${NC}"

# Build the project
npm run build

echo -e "${GREEN}✅ Build completed successfully${NC}"

# Set environment variables for Linux/macOS
export SUPERVISORD_HOST="127.0.0.1"
export SUPERVISORD_PORT="9002"
export SUPERVISORD_COMMAND_DIR="/var/log/supervisor"
export SUPERVISORD_USERNAME="admin"
export SUPERVISORD_PASSWORD="password"
export SUPERVISORD_EXECUTABLE_PATH="/usr/local/bin/supervisord"
export CONFIG_FILE_PATH="/etc/supervisord.conf"
export MCP_PORT="30000"

echo ""
echo -e "${BLUE}🔧 Environment variables configured:${NC}"
echo -e "  SUPERVISORD_HOST=${GREEN}$SUPERVISORD_HOST${NC}"
echo -e "  SUPERVISORD_PORT=${GREEN}$SUPERVISORD_PORT${NC}"
echo -e "  SUPERVISORD_COMMAND_DIR=${GREEN}$SUPERVISORD_COMMAND_DIR${NC}"
echo -e "  SUPERVISORD_USERNAME=${GREEN}$SUPERVISORD_USERNAME${NC}"
echo -e "  SUPERVISORD_PASSWORD=${GREEN}[REDACTED]${NC}"
echo -e "  SUPERVISORD_EXECUTABLE_PATH=${GREEN}$SUPERVISORD_EXECUTABLE_PATH${NC}"
echo -e "  CONFIG_FILE_PATH=${GREEN}$CONFIG_FILE_PATH${NC}"
echo -e "  MCP_PORT=${GREEN}$MCP_PORT${NC}"

echo ""
echo -e "${BLUE}📡 Connecting to supervisord at ${GREEN}$SUPERVISORD_HOST:$SUPERVISORD_PORT${NC}"
echo -e "${BLUE}📁 Using config file: ${GREEN}$CONFIG_FILE_PATH${NC}"
echo ""

# Check supervisord connection (optional)
if command -v curl &> /dev/null; then
    echo -e "${YELLOW}🔍 Checking supervisord connection...${NC}"
    if curl -f -s "http://$SUPERVISORD_HOST:$SUPERVISORD_PORT/program/list" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Supervisord connection successful${NC}"
    else
        echo -e "${YELLOW}⚠️  Cannot connect to supervisord. Please ensure supervisord is running.${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  curl not available, skipping connection check${NC}"
fi

echo ""
echo -e "${BLUE}🚀 Starting Supervisor MCP Server on port ${GREEN}$MCP_PORT${NC}..."

# Start the server
npm start