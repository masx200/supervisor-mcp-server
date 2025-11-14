# Supervisor MCP Server

一个使用 TypeScript 开发的 Model Context Protocol (MCP) 服务器，用于通过 supervisord 的 REST API 进行进程管理和监控。

## 🚀 技术特色

- **官方 INI 解析** - 使用 npm 官方维护的 `ini` 库进行配置文件解析
- **HTTP 请求日志** - 集成 Morgan 中间件，记录所有 HTTP 请求（Apache combined 格式）
- **Streamable HTTP** - 基于 MCP SDK 的标准 Streamable HTTP 传输协议  
- **类型安全** - 完整的 TypeScript 类型定义和验证
- **生产就绪** - 包含错误处理、日志记录、健康检查等功能

## 功能特性

### 进程管理
- ✅ **列出程序** - 获取所有被管理程序的状态信息
- ✅ **启动程序** - 启动单个程序
- ✅ **停止程序** - 停止单个程序  
- ✅ **批量操作** - 批量启动/停止多个程序
- ✅ **状态查询** - 获取单个程序的详细状态信息

### 日志管理
- ✅ **日志查看** - 读取程序 stdout/stderr 日志
- ✅ **分页读取** - 支持指定偏移和长度的分页读取
- ✅ **末尾读取** - 从文件末尾读取指定行数
- ✅ **文件检查** - 自动检测可读日志文件

### 配置管理
- ✅ **配置查看** - 查看完整配置文件或指定节
- ✅ **配置更新** - 更新配置项的值
- ✅ **配置节管理** - 添加、删除配置节
- ✅ **配置备份** - 自动备份配置文件

### 系统控制
- ✅ **配置重载** - 重载 supervisord 配置
- ✅ **健康检查** - 监控与 supervisord 的连接状态

### HTTP 日志记录
- ✅ **请求日志** - 使用 Morgan 中间件记录所有 HTTP 请求
- ✅ **标准格式** - Apache combined 格式，支持日志分析工具
- ✅ **实时输出** - 日志直接输出到控制台，便于实时监控
- ✅ **高性能** - 异步日志记录，不影响服务器响应性能

## 安装依赖

```bash
cd supervisor-mcp-server
npm install
```

## 配置环境变量

创建 `.env` 文件或设置以下环境变量：

```bash
# Supervisord 连接配置
SUPERVISORD_HOST=127.0.0.1          # supervisord 主机地址
SUPERVISORD_PORT=9001               # supervisord HTTP 端口
SUPERVISORD_USERNAME=admin          # supervisord 用户名（可选）
SUPERVISORD_PASSWORD=password       # supervisord 密码（可选）

# 配置文件路径
SUPERVISORD_CONFIG_FILE=/etc/supervisord.conf  # supervisord 配置文件路径

# MCP 服务器配置
MCP_PORT=3000                       # MCP 服务器监听端口
```

## 启动服务器

### 开发模式
```bash
npm run dev
```

### 生产模式
```bash
npm run build
npm start
```

## supervisord 配置

确保 supervisord 已配置 HTTP 服务器：

```ini
# /etc/supervisord.conf
[inet_http_server]
port=127.0.0.1:9001
username=admin
password=password

[supervisorctl]
serverurl=http://127.0.0.1:9001
```

## 可用的 MCP 工具

### 进程管理

#### 1. list_programs
列出所有程序及其状态。

```typescript
// 使用示例
const programs = await callTool('list_programs', {});
```

#### 2. start_program
启动指定程序。

```typescript
const result = await callTool('start_program', {
  name: 'my_program'
});
```

#### 3. stop_program
停止指定程序。

```typescript
const result = await callTool('stop_program', {
  name: 'my_program'
});
```

#### 4. start_programs
批量启动程序。

```typescript
const result = await callTool('start_programs', {
  names: ['program1', 'program2', 'program3']
});
```

#### 5. stop_programs
批量停止程序。

```typescript
const result = await callTool('stop_programs', {
  names: ['program1', 'program2', 'program3']
});
```

#### 6. get_program_status
获取单个程序的详细状态。

```typescript
const status = await callTool('get_program_status', {
  name: 'my_program'
});
```

### 日志管理

#### 7. read_log
读取程序日志。

```typescript
// 读取完整日志
const fullLog = await callTool('read_log', {
  name: 'my_program',
  type: 'stdout'
});

// 从文件末尾读取最近 50 行
const recentLog = await callTool('read_log', {
  name: 'my_program',
  type: 'stdout',
  tail: true,
  lines: 50
});

// 从指定位置读取 1KB 数据
const partialLog = await callTool('read_log', {
  name: 'my_program',
  type: 'stdout',
  offset: 1024,
  length: 1024
});
```

参数说明：
- `name`: 程序名称
- `type`: 日志类型 ('stdout' | 'stderr')
- `offset`: 字节偏移（可选）
- `length`: 读取字节数（可选）
- `lines`: 读取行数（可选）
- `tail`: 是否从文件末尾读取（默认 false）

### 配置管理

#### 8. get_config
获取配置文件。

```typescript
// 获取完整配置
const fullConfig = await callTool('get_config', {});

// 获取指定节
const programSection = await callTool('get_config', {
  section: 'program:my_program'
});
```

#### 9. update_config
更新配置项。

```typescript
const result = await callTool('update_config', {
  section: 'program:my_program',
  key: 'command',
  value: '/usr/bin/myapp --flag value'
});
```

### 系统控制

#### 10. reload_supervisor
重载 supervisord 配置。

```typescript
const result = await callTool('reload_supervisor', {});
```

## API 接口

服务器还提供了一些 HTTP API 端点：

### 健康检查
```bash
GET /health
```

返回 supervisord 连接状态和服务器健康状况。

## 项目结构

```
supervisor-mcp-server/
├── src/
│   ├── supervisordClient.ts    # supervisord REST API 客户端
│   ├── logReader.ts            # 日志文件读取器
│   ├── configManager.ts        # 配置文件管理器
│   └── server.ts               # 主服务器文件
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

## 开发说明

### 架构设计

1. **supervisordClient.ts** - 封装 supervisord REST API 调用
2. **logReader.ts** - 处理日志文件的分页读取和文件系统操作
3. **configManager.ts** - 管理 INI 格式配置文件的解析和修改
4. **server.ts** - 主 MCP 服务器，整合所有功能

### 技术栈

- **MCP SDK** - Model Context Protocol TypeScript SDK
- **Express** - HTTP 服务器框架
- **Axios** - HTTP 客户端
- **TypeScript** - 类型安全的 JavaScript

### 错误处理

所有工具都包含完整的错误处理，会返回详细的错误信息而不是崩溃。

### 日志记录

服务器会记录：
- MCP 请求处理
- supervisord 连接状态
- 错误和异常情况

## 安全考虑

1. **认证** - 支持 supervisord 的用户名/密码认证
2. **权限** - 依赖 supervisord 的访问控制
3. **配置保护** - 配置文件修改前自动备份
4. **输入验证** - 所有输入参数都经过 zod 验证

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！