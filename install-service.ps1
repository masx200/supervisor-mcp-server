# 安装 supervisor-mcp-server 为 Windows 服务 (使用 NSSM)

# 设置项目路径
$PROJECT_PATH = "c:\Users\Administrator\Downloads\package (5)\supervisor-mcp-server"

# 设置 NSSM 路径
$NSSM_PATH = "E:\迅雷下载\nssm-2.24-101-g897c7ad\nssm-2.24-101-g897c7ad\win64\nssm.exe"

# 设置 Node.js 路径 (根据你的系统调整)
$NODE_PATH = "C:\Program Files\nodejs\node.exe"

# 设置服务名称
$SERVICE_NAME = "SupervisorMCPServer"

Write-Host "正在安装 supervisor-mcp-server 服务..." -ForegroundColor Green

# 检查 NSSM 是否存在
if (-not (Test-Path $NSSM_PATH)) {
    Write-Host "错误: NSSM 不存在于路径: $NSSM_PATH" -ForegroundColor Red
    Write-Host "请下载并安装 NSSM: https://nssm.cc/download" -ForegroundColor Yellow
    exit 1
}

# 检查 Node.js 是否存在
if (-not (Test-Path $NODE_PATH)) {
    Write-Host "错误: Node.js 不存在于路径: $NODE_PATH" -ForegroundColor Red
    Write-Host "请安装 Node.js: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# 检查项目路径是否存在
if (-not (Test-Path $PROJECT_PATH)) {
    Write-Host "错误: 项目路径不存在: $PROJECT_PATH" -ForegroundColor Red
    exit 1
}

# 如果服务已存在，先停止并删除
Write-Host "检查现有服务..." -ForegroundColor Yellow
$service = Get-Service -Name $SERVICE_NAME -ErrorAction SilentlyContinue
if ($service) {
    Write-Host "停止现有服务..." -ForegroundColor Yellow
    Stop-Service -Name $SERVICE_NAME -Force -ErrorAction SilentlyContinue
    Write-Host "删除现有服务..." -ForegroundColor Yellow
    & $NSSM_PATH remove $SERVICE_NAME confirm
}

# 创建日志目录
$LOG_DIR = "$PROJECT_PATH\logs"
if (-not (Test-Path $LOG_DIR)) {
    New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null
    Write-Host "创建日志目录: $LOG_DIR" -ForegroundColor Green
}

# 安装服务
Write-Host "安装服务: $SERVICE_NAME" -ForegroundColor Green
& $NSSM_PATH install $SERVICE_NAME $NODE_PATH

# 设置服务参数
Write-Host "配置服务参数..." -ForegroundColor Green
& $NSSM_PATH set $SERVICE_NAME AppParameters "dist/server.js"
& $NSSM_PATH set $SERVICE_NAME AppDirectory $PROJECT_PATH
& $NSSM_PATH set $SERVICE_NAME AppExit Default Restart

# 设置环境变量
Write-Host "设置环境变量..." -ForegroundColor Green
& $NSSM_PATH set $SERVICE_NAME AppEnvironmentExtra "SUPERVISORD_HOST=127.0.0.1" "SUPERVISORD_PORT=9002" "SUPERVISORD_COMMAND_DIR=E:\projects\refactor-the-project" "SUPERVISORD_USERNAME=b18b935c-1551-4b6f-b70c-4d6a3e833adf" "SUPERVISORD_PASSWORD=8tn6y2o8hthggug600eswffzpo5bke" "SUPERVISORD_EXECUTABLE_PATH=E:\迅雷下载\supervisord_0.7.3_Windows_64-bit\supervisord_0.7.3_Windows_64-bit\supervisord.exe" "CONFIG_FILE_PATH=E:\projects\refactor-the-project\supervisord.conf" "MCP_PORT=30000"

# 设置日志文件
& $NSSM_PATH set $SERVICE_NAME AppStdout "$LOG_DIR\supervisor-mcp-server.out.log"
& $NSSM_PATH set $SERVICE_NAME AppStderr "$LOG_DIR\supervisor-mcp-server.err.log"

# 设置服务描述
& $NSSM_PATH set $SERVICE_NAME Description "Supervisor MCP Server - Model Context Protocol server for supervisord process management"
& $NSSM_PATH set $SERVICE_NAME DisplayName "Supervisor MCP Server"

# 设置服务账户和启动类型
& $NSSM_PATH set $SERVICE_NAME ObjectName LocalSystem
& $NSSM_PATH set $SERVICE_NAME Start SERVICE_AUTO_START
& $NSSM_PATH set $SERVICE_NAME Type SERVICE_WIN32_OWN_PROCESS

Write-Host "服务安装完成!" -ForegroundColor Green
Write-Host "服务名称: $SERVICE_NAME" -ForegroundColor Cyan
Write-Host "项目路径: $PROJECT_PATH" -ForegroundColor Cyan
Write-Host "日志目录: $LOG_DIR" -ForegroundColor Cyan

# 启动服务
Write-Host "启动服务..." -ForegroundColor Green
Start-Service -Name $SERVICE_NAME

# 检查服务状态
Start-Sleep -Seconds 3
$serviceStatus = Get-Service -Name $SERVICE_NAME
if ($serviceStatus.Status -eq 'Running') {
    Write-Host "✅ 服务启动成功!" -ForegroundColor Green
    Write-Host "服务状态: $($serviceStatus.Status)" -ForegroundColor Green
    Write-Host "MCP 服务器端口: 30000" -ForegroundColor Cyan
    Write-Host "Supervisord 端口: 9002" -ForegroundColor Cyan
} else {
    Write-Host "❌ 服务启动失败!" -ForegroundColor Red
    Write-Host "服务状态: $($serviceStatus.Status)" -ForegroundColor Red
    Write-Host "请检查日志文件: $LOG_DIR\supervisor-mcp-server.err.log" -ForegroundColor Yellow
}

Write-Host "`n常用命令:" -ForegroundColor Yellow
Write-Host "启动服务: Start-Service $SERVICE_NAME" -ForegroundColor White
Write-Host "停止服务: Stop-Service $SERVICE_NAME" -ForegroundColor White
Write-Host "重启服务: Restart-Service $SERVICE_NAME" -ForegroundColor White
Write-Host "查看状态: Get-Service $SERVICE_NAME" -ForegroundColor White
Write-Host "查看日志: Get-Content '$LOG_DIR\supervisor-mcp-server.out.log'" -ForegroundColor White
Write-Host "删除服务: & '$NSSM_PATH' remove $SERVICE_NAME confirm" -ForegroundColor White