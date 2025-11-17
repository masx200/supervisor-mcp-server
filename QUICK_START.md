# 🚀 Supervisor MCP Server - 快速开始指南

## 立即使用官方 ini 库的配置管理器

我们已经升级项目，使用 **npm 官方维护的 `ini` 库**，这提供了：

- ✅ **更可靠的解析** - 处理复杂的 INI 格式和边缘情况
- ✅ **更好的性能** - 优化的 C++ 实现，比手写解析器更快
- ✅ **完整功能支持** - 注释、数组、嵌套节等高级特性
- ✅ **社区验证** - 每周千万下载量，经过大量项目验证
- ✅ **类型安全** - 完整的 TypeScript 类型定义

## ⚡ 一键启动

```bash
# 1. 进入项目目录
cd supervisor-mcp-server

# 2. 安装依赖（包含 ini 库）
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件配置 supervisord 连接信息

# 4. 启动服务器
npm run build
npm start
```

## 📦 核心依赖

```
@modelcontextprotocol/sdk    # MCP 官方 SDK
ini                          # npm 官方 INI 解析库 ⭐
express                      # HTTP 服务器
axios                        # HTTP 客户端
```

## 🎯 主要 MCP 工具

### 进程管理

- `list_programs` - 列出所有程序
- `start_program` / `stop_program` - 程序控制
- `start_programs` / `stop_programs` - 批量操作
- `get_program_status` - 程序状态详情

### 日志管理

- `read_log` - **支持分页读取**的日志查看
  - `tail: true, lines: 100` - 查看最后 100 行
  - `offset: 1024, length: 2048` - 指定字节范围读取
  - `type: 'stderr'` - 读取错误日志

### 配置管理

- `get_config` - 查看配置文件
- `update_config` - **安全的配置更新**（自动备份）
- `reload_supervisor` - 重载配置

## 🔧 配置 supervisord

在 `/etc/supervisord.conf` 中添加：

```ini
[inet_http_server]
port=127.0.0.1:9001
username=admin
password=password
```

## 📊 健康检查

```bash
curl http://localhost:3000/health
```

## 🎉 优势对比

| 特性         | 手写解析器 | **官方 ini 库**    |
| ------------ | ---------- | ------------------ |
| 解析准确性   | 基础实现   | 经过验证的稳定算法 |
| INI 特性支持 | 基本键值对 | 注释、数组、嵌套节 |
| 错误处理     | 基础处理   | 完善的错误报告     |
| 性能         | 纯 JS 实现 | C++ 优化实现       |
| 社区支持     | 无         | 活跃的社区维护     |
| 类型安全     | 手动定义   | 官方类型定义       |

## 📖 完整文档

- [`README.md`](./README.md) - 详细使用文档
- [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md) - 项目技术概览
- [`.env.example`](./.env.example) - 环境配置示例
- [`example-supervisord.conf`](./example-supervisord.conf) - supervisord
  配置示例

**项目已完成并可直接使用！** 🎊
