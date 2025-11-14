# CODEBUDDY.md This file provides guidance to CodeBuddy Code when working with code in this repository.

## Common Commands

### Development
```bash
npm install              # Install dependencies
npm run dev             # Start development server with tsx
npm run build           # Compile TypeScript to dist/
npm start               # Run compiled server from dist/server.js
./start.sh              # Production startup script with checks
./start.sh dev          # Development mode via start script
```

### Environment Setup
```bash
cp .env.example .env    # Create environment configuration
# Edit .env with supervisord connection details
```

## Architecture Overview

This is a **Model Context Protocol (MCP) server** that provides an interface to manage supervisord processes through its REST API. The server acts as a bridge between MCP clients and the supervisord daemon.

### Core Components

1. **server.ts** - Main MCP server with Express HTTP transport
   - Handles MCP protocol initialization and tool calls
   - Implements Basic Authentication middleware
   - Provides `/health` endpoint for monitoring
   - Integrates Morgan middleware for HTTP request logging

2. **supervisordClient.ts** - HTTP client for supervisord REST API
   - Maps supervisord endpoints to MCP tools
   - Handles process management operations (start/stop/status)
   - Manages authentication with supervisord

3. **configManager.ts** - INI configuration file management
   - Uses npm's official `ini` library for parsing
   - Provides safe configuration updates with automatic backups
   - Handles section-based configuration operations

4. **logReader.ts** - Log file reading with pagination support
   - Supports byte-based offset/length reading
   - Provides tail functionality for recent log entries
   - Handles both stdout and stderr log files

### MCP Tools Available

**Process Management:**
- `list_programs` - Get all managed processes and their status
- `start_program` / `stop_program` - Control individual processes
- `start_programs` / `stop_programs` - Batch operations
- `get_program_status` - Detailed status for single process

**Log Management:**
- `read_log` - Read logs with pagination options:
  - `offset`/`length` for byte-range reading
  - `tail: true, lines: N` for recent entries
  - `type: 'stdout'|'stderr'` for log type selection

**Configuration Management:**
- `get_config` - Retrieve full config or specific sections
- `update_config` - Safely update configuration values
- `reload_supervisor` - Reload supervisord configuration

### Environment Configuration

Required environment variables:
- `SUPERVISORD_HOST` - supervisord daemon address (default: 127.0.0.1)
- `SUPERVISORD_PORT` - supervisord HTTP port (default: 9001)
- `SUPERVISORD_USERNAME/PASSWORD` - Optional supervisord authentication
- `SUPERVISORD_CONFIG_FILE` - Path to supervisord.conf
- `MCP_PORT` - MCP server listening port (default: 3000)

### Key Design Patterns

1. **MCP Protocol Integration** - Uses StreamableHTTPServerTransport from the MCP SDK
2. **Type Safety** - Comprehensive TypeScript interfaces and Zod validation
3. **Error Handling** - All operations return structured error responses
4. **Configuration Safety** - Automatic backups before config modifications
5. **HTTP Request Logging** - Morgan middleware in Apache combined format

### supervisord Prerequisites

The supervisord daemon must be configured with HTTP server:
```ini
[inet_http_server]
port=127.0.0.1:9001
username=admin
password=password
```

### File Structure

```
src/
├── server.ts              # Main MCP server and Express setup
├── supervisordClient.ts   # supervisord REST API client
├── configManager.ts       # INI configuration file manager
└── logReader.ts          # Log file reader with pagination
```

### Technology Stack

- **@modelcontextprotocol/sdk** - Official MCP TypeScript SDK
- **Express** - HTTP server with Morgan logging middleware
- **Axios** - HTTP client for supervisord API calls
- **ini** - Official npm INI parsing library
- **TypeScript** - ES2020 target with strict mode
- **Zod** - Runtime type validation

### Deployment Notes

- Requires Node.js 18+ (checked in start script)
- Built JavaScript output goes to `dist/` directory
- Start script includes dependency checks and configuration validation
- Health check endpoint available at `/health`