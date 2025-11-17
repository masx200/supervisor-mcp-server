# Supervisor MCP Server 高级功能指南

本文档介绍 Supervisor MCP Server 新增的高级功能，包括身份验证、supervisord
系统信息、信号发送等功能。

## 🔐 身份验证功能

### 基本 HTTP 身份验证

MCP 服务器现在支持基本 HTTP 身份验证，认证信息与 supervisord 配置一致：

```bash
# 认证信息（与 supervisord 相同）
SUPERVISORD_USERNAME=admin
SUPERVISORD_PASSWORD=password
```

### 配置身份验证

```bash
# .env 文件中配置
export SUPERVISORD_USERNAME="your_username"
export SUPERVISORD_PASSWORD="your_password"
```

## 🔧 新增 MCP 工具

### 1. 获取 supervisord 系统信息

**工具名称**: `get_supervisor_info`

**描述**: 获取 supervisord 的 PID、版本信息和系统状态

**使用方法**:

```json
{
  "tool": "get_supervisor_info"
}
```

**返回示例**:

```
Supervisor System Information:
PID: 1234
Version: v0.6.8
Executable Path: /usr/local/bin/supervisord
Config File: /etc/supervisord.conf
Log File: logs/supervisord.log
HTTP Server: 127.0.0.1:9002
```

### 2. 查看 supervisord 本身日志

**工具名称**: `get_supervisor_log`

**描述**: 读取 supervisord 守护进程的日志文件

**参数**:

- `offset` (可选): 字节偏移量
- `length` (可选): 读取字节数
- `lines` (可选): 读取行数（适用于尾部读取）
- `tail` (可选): 从文件末尾读取

**使用方法**:

```json
{
  "tool": "get_supervisor_log",
  "arguments": {
    "tail": true,
    "lines": 50
  }
}
```

**返回示例**:

```
Supervisor Log Content from logs/supervisord.log:
File size: 1048576 bytes
Read: 2048 bytes
Offset: 1046528
Truncated: No

time="2025-11-14T16:34:00+08:00" level=info msg="load configuration from file"
time="2025-11-14T16:34:00+08:00" level=info msg="create process:intelligentanalysis-web"
```

### 3. 发送信号给程序

**工具名称**: `send_signal`

**描述**: 向指定程序发送 Unix 信号

**参数**:

- `name`: 程序名称
- `signal`: 信号名称（如 SIGHUP, SIGTERM, SIGKILL, USR1）

**支持的信号**:

- `SIGHUP`: 重新加载配置
- `SIGTERM`: 优雅停止
- `SIGKILL`: 强制终止
- `SIGUSR1`: 自定义信号 1
- `SIGUSR2`: 自定义信号 2

**使用方法**:

```json
{
  "tool": "send_signal",
  "arguments": {
    "name": "intelligentanalysis-api",
    "signal": "SIGHUP"
  }
}
```

**返回示例**:

```
Send signal 'SIGHUP' to program 'intelligentanalysis-api': Success
```

### 4. 获取程序详细信息

**工具名称**: `get_program_info`

**描述**: 获取指定程序的详细信息，包括运行时间和 PID

**参数**:

- `name`: 程序名称

**使用方法**:

```json
{
  "tool": "get_program_info",
  "arguments": {
    "name": "intelligentanalysis-api"
  }
}
```

**返回示例**:

```
Program: intelligentanalysis-api
Status: RUNNING
PID: 23748
Group: intelligentanalysis-programs
Uptime: 0:11:27
Started: 2025-11-14T16:23:15.000Z
Description: intelligentanalysis API server
Log File: /var/log/supervisor/intelligentanalysis-api.log
Stdout Log: logs/intelligentanalysis-api.log
Stderr Log: logs/intelligentanalysis-api-error.log
```

## ⚙️ 环境变量配置

### 新增环境变量

```bash
# supervisord 可执行文件路径（必需的高级功能）
export SUPERVISORD_EXECUTABLE_PATH="/path/to/supervisord"

# Windows 示例
export SUPERVISORD_EXECUTABLE_PATH="C:\\Program Files\\supervisord\\supervisord.exe"

# Linux/macOS 示例
export SUPERVISORD_EXECUTABLE_PATH="/usr/local/bin/supervisord"
```

### 完整配置示例

```bash
# .env 文件
MCP_PORT=3000

# Supervisord 连接
SUPERVISORD_HOST=127.0.0.1
SUPERVISORD_PORT=9002
SUPERVISORD_USERNAME=b18b935c-1551-4b6f-b70c-4d6a3e833adf
SUPERVISORD_PASSWORD=8tn6y2o8hthggug600eswffzpo5bke

# 配置文件
SUPERVISORD_CONFIG_FILE=/path/to/supervisord.conf

# 高级功能
SUPERVISORD_EXECUTABLE_PATH=/path/to/supervisord
```

## 🛠️ 高级功能使用场景

### 场景 1: 程序配置重载

```bash
# 发送 SIGHUP 信号重载配置
{
  "tool": "send_signal",
  "arguments": {
    "name": "my-application",
    "signal": "SIGHUP"
  }
}
```

### 场景 2: 监控系统状态

```bash
# 定期检查 supervisord 状态
{
  "tool": "get_supervisor_info"
}
```

### 场景 3: 调试程序问题

```bash
# 查看程序详细状态
{
  "tool": "get_program_info",
  "arguments": {
    "name": "problematic-program"
  }
}

# 查看 supervisord 本身的日志
{
  "tool": "get_supervisor_log",
  "arguments": {
    "tail": true,
    "lines": 100
  }
}
```

### 场景 4: 强制重启程序

```bash
# 发送 SIGTERM 信号优雅停止
{
  "tool": "send_signal",
  "arguments": {
    "name": "application",
    "signal": "SIGTERM"
  }
}

# 等待后发送 SIGKILL 强制终止（如需要）
{
  "tool": "send_signal",
  "arguments": {
    "name": "application",
    "signal": "SIGKILL"
  }
}
```

## 📋 完整工具列表

### 基础工具（原有）

1. `list_programs` - 列出所有程序
2. `start_program` - 启动单个程序
3. `stop_program` - 停止单个程序
4. `start_programs` - 批量启动程序
5. `stop_programs` - 批量停止程序
6. `get_program_status` - 获取程序状态
7. `read_log` - 读取程序日志
8. `get_config` - 获取配置
9. `update_config` - 更新配置
10. `reload_supervisor` - 重载配置

### 高级工具（新增）

11. `get_supervisor_info` - 获取 supervisord 系统信息
12. `get_supervisor_log` - 查看 supervisord 日志
13. `send_signal` - 发送信号给程序
14. `get_program_info` - 获取程序详细信息

## 🚀 使用建议

### 配置建议

1. **设置可执行文件路径**: 对于信号发送等功能，`SUPERVISORD_EXECUTABLE_PATH`
   是必需的
2. **统一认证**: 使用与 supervisord 相同的认证信息
3. **日志监控**: 定期检查 supervisord 本身的日志

### 安全建议

1. **强密码**: 使用复杂的用户名和密码
2. **网络限制**: 限制访问来源
3. **日志审核**: 定期审查访问日志

### 性能建议

1. **日志轮转**: 配置适当的日志轮转策略
2. **资源监控**: 定期检查 supervisord 资源使用情况
3. **错误处理**: 妥善处理信号发送失败的情况

## 🔍 故障排除

### 常见问题

1. **SUPERVISORD_EXECUTABLE_PATH 未设置**
   - 症状: `send_signal` 功能不可用
   - 解决: 设置正确的可执行文件路径

2. **无法读取 supervisord 日志**
   - 症状: 日志文件不存在或权限不足
   - 解决: 检查文件路径和权限

3. **信号发送失败**
   - 症状: 返回 "Failed" 状态
   - 解决: 检查程序名称和信号名称是否正确

### 调试方法

1. **启用详细日志**: 使用 Morgan 日志查看请求详情
2. **检查配置文件**: 验证 supervisord 配置是否正确
3. **权限验证**: 确保程序有足够的文件访问权限

这些高级功能大大增强了 MCP 服务器的能力，使其能够处理更复杂的 supervisord
管理任务。
