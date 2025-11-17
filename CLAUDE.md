# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server for supervisord process
management, providing a REST API interface to manage and monitor
supervisord-controlled processes. The server is built with TypeScript and uses
the official MCP SDK.

## Development Commands

### Building and Running

```bash
# Development mode (with tsx hot reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

### Environment Configuration

Copy `.env.example` to `.env` and configure the following key variables:

**Required:**

- `SUPERVISORD_HOST` - supervisord HTTP server host (default: 127.0.0.1)
- `SUPERVISORD_PORT` - supervisord HTTP server port (default: 9001)
- `CONFIG_FILE_PATH` or `SUPERVISORD_CONFIG_FILE` - path to supervisord.conf file
- `SUPERVISORD_COMMAND_DIR` - supervisord command directory for log file resolution

**Optional:**

- `SUPERVISORD_USERNAME/PASSWORD` - supervisord authentication
- `SUPERVISORD_EXECUTABLE_PATH` - path to supervisord binary for advanced features
- `MCP_PORT` - MCP server port (default: 3000)

## Architecture

### Core Components

1. **server.ts** - Main MCP server with HTTP transport
   - Registers all MCP tools for process management
   - Handles HTTP requests with Morgan logging
   - Implements basic authentication middleware
   - Contains `supervisordUtils` for log path resolution using INI parsing

2. **supervisordClient.ts** - HTTP client for supervisord REST API
   - Wraps supervisord's XML-RPC/HTTP interface
   - Provides methods for process control (start/stop/status)
   - Handles relative log path resolution using `SUPERVISORD_COMMAND_DIR`

3. **configManager.ts** - INI configuration file management
   - Uses the official `ini` npm library for parsing
   - Provides CRUD operations on supervisord.conf sections
   - Includes automatic backup functionality
   - Exposes `getParsedConfig()` for structured access

4. **logReader.ts** - Log file reading utilities
   - Handles paginated log reading with offset/length
   - Supports tail reading for recent log entries
   - Provides file accessibility checks

### Key Patterns

**Log Path Resolution:** Both supervisord and program log paths are resolved
using `SUPERVISORD_COMMAND_DIR` as the base directory for relative paths. The
system properly handles comma-separated paths and Windows/Linux path formats.

**INI Parsing:** Always use `configManager.getParsedConfig()` or
`configManager.getSection()` rather than regex patterns for configuration
parsing. The supervisord configuration uses standard INI format with sections
like `[supervisord]`, `[program:appname]`, etc.

**MCP Tool Structure:** All tools follow the same pattern with Zod validation,
detailed error handling, and structured responses containing program state, log
paths, and operation results.

**Environment-based Configuration:** The server is designed to work across
different environments (Windows/Linux/macOS) with environment variable-based
path resolution and optional authentication.

### Available MCP Tools

The server exposes tools for:

- Process management (list/start/stop programs)
- Log reading (stdout/stderr with pagination)
- Configuration management (read/modify supervisord.conf)
- System control (reload config, health checks)
- Advanced operations (signal sending, version info)

## Configuration File Structure

The supervisord.conf follows standard INI format with key sections:

- `[supervisord]` - main daemon configuration including `logfile` path
- `[program:name]` - individual process configurations with stdout/stderr log
  files
- `[inet_http_server]` - HTTP server configuration for remote access

Relative log paths in configuration are automatically resolved relative to
`SUPERVISORD_COMMAND_DIR`.

## Recent Fixes and Improvements

### Bug Fixes (2025-11-17)

1. **PID Reading Issue Fixed**
   - Problem: `get_supervisor_info` returned "PID: Unknown"
   - Solution: Fixed PID file path resolution using INI library instead of regex
   - Result: Now correctly displays supervisord PID (e.g., "PID: 4168")

2. **ES Module Syntax Issues Fixed**
   - Problem: `require("fs")` usage causing "require is not defined" errors
   - Files Fixed:
     - `logReader.ts`: Replaced `require("fs")` with proper ES module imports
     - `configManager.ts`: Replaced `require("fs").statSync()` with `import { statSync }`
   - Result: All log reading and configuration management features work properly

3. **Environment Variable Configuration Fixed**
   - Problem: `CONFIG_FILE_PATH` environment variable not being read
   - Solution: Added support for both `CONFIG_FILE_PATH` and `SUPERVISORD_CONFIG_FILE`
   - Result: Configuration file path resolution works correctly

4. **Port Configuration Fixed**
   - Problem: Server running on wrong port (3000 instead of 30000)
   - Solution: Ensured proper environment variable inheritance from PowerShell script
   - Result: Server runs on configured port (30000) and connects to supervisord on port 9002

### Test Results

All MCP tools are now fully functional:
- ✅ **get_supervisor_info**: Returns correct PID (4168), version, and system info
- ✅ **get_supervisor_log**: Successfully reads supervisord daemon logs
- ✅ **list_programs**: Shows all managed programs with correct status
- ✅ **start/stop_programs**: Process management works correctly
- ✅ **Configuration Management**: Read/modify supervisord.conf functionality
- ✅ **All 14 MCP Tools**: Working without errors

### Production Deployment

For production use, ensure:
1. Set proper environment variables (see `start.ps1` for example)
2. Configure supervisord with correct log and PID file paths
3. Use appropriate authentication credentials
4. Monitor server logs for any connection issues

The server is now production-ready with all critical bugs fixed.
