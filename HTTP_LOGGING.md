# HTTP 日志功能说明

本文档描述了 Supervisor MCP Server 中集成的 HTTP 请求日志功能。

## 概述

项目已集成 **Morgan** HTTP 请求日志中间件，用于记录所有传入的 HTTP
请求和响应信息。Morgan 是 Node.js 生态系统中最流行和可靠的 HTTP 请求日志记录库。

## 技术特性

### 集成方式

1. **依赖安装**
   - `morgan`: HTTP 日志中间件主库
   - `@types/morgan`: TypeScript 类型定义

2. **代码集成**
   ```typescript
   import morgan from "morgan";

   // 配置 Morgan 中间件
   app.use(morgan("combined"));
   ```

3. **配置位置**
   - 位于 Express 应用初始化后、JSON 解析器前
   - 确保所有请求都会被记录

### 日志格式

项目使用 **Apache Combined** 格式，这是最完整的日志格式：

```
127.0.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /mcp HTTP/1.1" 200 2326 "http://www.example.com/start.html" "Mozilla/4.08 [en] (Win98; I ;Nav)"
```

#### 日志字段说明

- **远程地址**: 客户端 IP 地址 (127.0.0.1)
- **身份信息**: 远程用户标识 (-) 或认证用户名
- **时间戳**: [10/Oct/2000:13:55:36 -0700]
- **请求信息**: "GET /mcp HTTP/1.1"
  - 请求方法: GET
  - 请求路径: /mcp
  - HTTP 版本: HTTP/1.1
- **响应状态**: 200
- **响应大小**: 2326 bytes
- **Referer**: "http://www.example.com/start.html"
- **User Agent**: "Mozilla/4.08 [en] (Win98; I ;Nav)"

### MCP 服务器请求日志示例

当客户端连接到 MCP 服务器时，日志会类似：

```
::1 - - [27/Nov/2024:06:21:42 +0000] "POST /mcp HTTP/1.1" 200 512 "-" "curl/8.7.1"
::1 - - [27/Nov/2024:06:21:43 +0000] "GET /mcp HTTP/1.1" 200 1024 "-" "curl/8.7.1"
127.0.0.1 - - [27/Nov/2024:06:21:44 +0000] "POST /mcp HTTP/1.1" 200 2048 "http://localhost:3000/" "Mozilla/5.0"
```

## 输出目的地

### 1. 控制台输出

默认情况下，Morgan 日志输出到 **标准输出 (stdout)**：

```
Supervisor MCP Server listening on port 3000
HTTP Request Logging: Morgan middleware enabled (combined format)
127.0.0.1 - - [14/Nov/2025:15:44:51 +0000] "POST /mcp HTTP/1.1" 200 234
```

### 2. 文件输出（可选）

如需将日志写入文件，可以修改 `src/server.ts`：

```typescript
import fs from "fs";
import path from "path";

// 创建写入流
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "../logs/access.log"),
  { flags: "a" },
);

// 配置 Morgan 使用文件流
app.use(morgan("combined", { stream: accessLogStream }));
```

### 3. 日志轮转（高级）

如需日志轮转功能：

```bash
# 安装日志轮转依赖
npm install rotating-file-stream

import rfs from 'rotating-file-stream';

// 创建轮转写入流
const accessLogStream = rfs.createStream('access.log', {
  interval: '1d', // 每天轮转
  path: path.join(__dirname, '../logs')
});

app.use(morgan('combined', { stream: accessLogStream }));
```

## 替代日志格式

如需使用其他日志格式，可以在 `src/server.ts` 中修改：

```typescript
// 简洁格式
app.use(morgan("tiny"));

// 开发环境格式（带颜色）
app.use(morgan("dev"));

// 自定义格式
app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms"),
);

// 标准格式
app.use(morgan("common"));

// 短格式
app.use(morgan("short"));
```

## MCP 特定日志分析

### 初始化请求

```
POST /mcp HTTP/1.1" 200 1024
```

- 通常较大响应（1024+ bytes）
- 包含服务器元数据和可用工具列表

### 工具调用

```
POST /mcp HTTP/1.1" 200 256
```

- 通常较小响应（256-512 bytes）
- 包含工具执行结果

### 健康检查

```
GET /health HTTP/1.1" 200 64
```

- 小响应（64 bytes 左右）
- 返回 JSON 格式的服务器状态

### SSE 流

```
GET /mcp HTTP/1.1" 200 4096
```

- 大响应（>4096 bytes）
- 包含服务器发送的事件数据

## 调试和故障排除

### 检查日志是否工作

1. **启动服务器**
   ```bash
   npm start
   ```

2. **发送测试请求**
   ```bash
   curl http://localhost:3000/health
   ```

3. **查看控制台日志**
   ```
   127.0.0.1 - - [14/Nov/2025:15:45:00 +0000] "GET /health HTTP/1.1" 200 85 "-" "curl/8.7.1"
   ```

### 常见问题

1. **没有日志输出**
   - 检查 Morgan 导入是否正确
   - 确认中间件配置在 `app.use(express.json())` 之前

2. **日志格式不正确**
   - 验证格式字符串是否有效
   - 检查 Morgan 文档中的可用格式

3. **性能影响**
   - Morgan 是高性能的，但可以配置跳过某些请求
   ```typescript
   // 只记录错误响应
   app.use(morgan("combined", {
     skip: (req, res) => res.statusCode < 400,
   }));
   ```

## 安全考虑

- **敏感信息**: 默认日志可能包含请求路径和用户代理
- **IP地址**: 日志记录客户端 IP，考虑隐私保护
- **日志文件**: 如果写入文件，确保文件权限和安全

## 配置选项

Morgan 支持多种配置选项：

```typescript
// 立即记录（请求开始时）
app.use(morgan("combined", { immediate: true }));

// 条件记录
app.use(morgan("combined", {
  skip: (req, res) => req.url === "/health",
}));

// 自定义流
app.use(morgan("combined", { stream: customStream }));
```

## 总结

Morgan HTTP 日志功能为 Supervisor MCP Server 提供了：

- ✅ **完整的请求追踪**: 所有 HTTP 请求都被记录
- ✅ **标准格式**: Apache Combined 格式便于分析
- ✅ **高性能**: 异步日志记录不影响响应性能
- ✅ **灵活配置**: 支持多种格式和自定义选项
- ✅ **生产就绪**: 稳定可靠的日志记录解决方案

通过这个功能，系统管理员可以：

- 监控服务器请求模式
- 分析性能问题
- 进行安全审计
- 排除故障

这个日志功能已经完整集成到项目中，无需额外配置即可使用。
