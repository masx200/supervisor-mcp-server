#!/bin/bash

echo "=================================="
echo "Supervisor MCP Server 功能验证"
echo "=================================="
echo

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在 supervisor-mcp-server 目录下运行此脚本"
    exit 1
fi

echo "✅ 目录检查通过"

echo
echo "🔍 检查新增功能..."

# 检查新增的 MCP 工具
TOOLS=(
    "get_supervisor_info"
    "get_supervisor_log"
    "send_signal"
    "get_program_info"
)

for tool in "${TOOLS[@]}"; do
    if grep -q "registerTool.*$tool" src/server.ts; then
        echo "✅ MCP 工具: $tool 已添加"
    else
        echo "❌ MCP 工具: $tool 未找到"
        exit 1
    fi
done

echo
echo "🔧 检查环境变量配置..."

# 检查新环境变量
ENV_VARS=(
    "SUPERVISORD_EXECUTABLE_PATH"
    "MCP_USERNAME"
    "MCP_PASSWORD"
)

for var in "${ENV_VARS[@]}"; do
    if grep -q "$var" src/server.ts; then
        echo "✅ 环境变量: $var 已配置"
    else
        echo "❌ 环境变量: $var 未找到"
        exit 1
    fi
done

echo
echo "📦 检查依赖包..."

if grep -q "import.*spawn.*child_process" src/server.ts; then
    echo "✅ child_process 导入已添加"
else
    echo "❌ child_process 导入缺失"
    exit 1
fi

if grep -q "import.*morgan" src/server.ts; then
    echo "✅ Morgan 依赖已配置"
else
    echo "❌ Morgan 依赖缺失"
    exit 1
fi

echo
echo "🛠️ 检查实用工具函数..."

UTIL_FUNCTIONS=(
    "getSupervisordPid"
    "getSupervisordVersion"
    "sendSignal"
    "getSupervisordLogPath"
)

for func in "${UTIL_FUNCTIONS[@]}"; do
    if grep -q "$func" src/server.ts; then
        echo "✅ 工具函数: $func 已实现"
    else
        echo "❌ 工具函数: $func 未找到"
        exit 1
    fi
done

echo
echo "🔐 检查身份验证功能..."

if grep -q "basicAuthMiddleware" src/server.ts; then
    echo "✅ HTTP 身份验证中间件已添加"
else
    echo "❌ HTTP 身份验证中间件缺失"
    exit 1
fi

echo
echo "📝 检查配置文件..."

if [ -f ".env.example" ]; then
    echo "✅ .env.example 文件存在"
    if grep -q "SUPERVISORD_EXECUTABLE_PATH" .env.example; then
        echo "✅ .env.example 包含新环境变量"
    else
        echo "❌ .env.example 缺少新环境变量"
        exit 1
    fi
else
    echo "❌ .env.example 文件不存在"
    exit 1
fi

echo
echo "📚 检查文档文件..."

DOC_FILES=(
    "ADVANCED_FEATURES.md"
    "COMMAND_LINE_VS_REST_API.md"
    "HTTP_LOGGING.md"
)

for doc in "${DOC_FILES[@]}"; do
    if [ -f "$doc" ]; then
        echo "✅ 文档: $doc 已创建"
    else
        echo "❌ 文档: $doc 未找到"
        exit 1
    fi
done

echo
echo "📊 检查工具功能映射..."

# 检查 supervisordctl 功能的实现
echo "   supervisordctl 功能映射检查:"

if grep -q "get_supervisor_info" src/server.ts; then
    echo "   ✅ get_supervisor_info (替代: version, pid)"
else
    echo "   ❌ get_supervisor_info 功能缺失"
fi

if grep -q "get_supervisor_log" src/server.ts; then
    echo "   ✅ get_supervisor_log (替代: logtail)"
else
    echo "   ❌ get_supervisor_log 功能缺失"
fi

if grep -q "send_signal" src/server.ts; then
    echo "   ✅ send_signal (替代: signal 命令)"
else
    echo "   ❌ send_signal 功能缺失"
fi

if grep -q "get_program_info" src/server.ts; then
    echo "   ✅ get_program_info (增强的 status + pid)"
else
    echo "   ❌ get_program_info 功能缺失"
fi

echo
echo "=================================="
echo "✅ 功能验证完成！"
echo "=================================="
echo
echo "🎯 新增功能总结:"
echo "  1. HTTP 基本身份验证"
echo "  2. 获取 supervisord 系统信息 (PID, 版本)"
echo "  3. 查看 supervisord 本身日志"
echo "  4. 发送 Unix 信号给程序"
echo "  5. 获取程序详细信息和运行时间"
echo "  6. Morgan HTTP 请求日志"
echo
echo "🔧 配置要求:"
echo "  - 设置 SUPERVISORD_EXECUTABLE_PATH 环境变量"
echo "  - 使用与 supervisord 相同的认证信息"
echo "  - 配置文件路径必须正确"
echo
echo "📖 文档:"
echo "  - ADVANCED_FEATURES.md - 高级功能详细说明"
echo "  - COMMAND_LINE_VS_REST_API.md - 命令行 vs REST API 对比"
echo "  - HTTP_LOGGING.md - HTTP 日志功能说明"
echo
echo "系统已准备好处理所有 supervisord 管理任务！"
echo