import express, { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import morgan from "morgan";
import { spawn } from "child_process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import {
  CallToolResult,
  isInitializeRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { InMemoryEventStore } from "@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js";
import { SupervisordClient } from "./supervisordClient.js";
import { LogReader, LogReadOptions } from "./logReader.js";
import { ConfigManager } from "./configManager.js";

// 环境配置
const SUPERVISORD_HOST = process.env.SUPERVISORD_HOST || "127.0.0.1";
const SUPERVISORD_PORT = process.env.SUPERVISORD_PORT || "9001";
const SUPERVISORD_USERNAME = process.env.SUPERVISORD_USERNAME;
const SUPERVISORD_PASSWORD = process.env.SUPERVISORD_PASSWORD;
const SUPERVISORD_EXECUTABLE_PATH = process.env.SUPERVISORD_EXECUTABLE_PATH; // supervisord 可执行文件路径
const CONFIG_FILE_PATH = process.env.CONFIG_FILE_PATH ||
  process.env.SUPERVISORD_CONFIG_FILE ||
  "/etc/supervisord.conf";
/** Supervisord 运行命令所在目录（用于查找日志文件） */
const SUPERVISORD_COMMAND_DIR = process.env.SUPERVISORD_COMMAND_DIR ||
  "/var/log/supervisor";
const MCP_PORT = process.env.MCP_PORT
  ? parseInt(process.env.MCP_PORT, 10)
  : 3000;

// 创建配置管理器
const configManager = new ConfigManager(CONFIG_FILE_PATH);

// 基本 HTTP 身份验证中间件
const basicAuthMiddleware = (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="MCP Server"');
    res.status(401).json({ error: "身份验证失败" });
    return;
  }

  try {
    const base64Credentials = authHeader.split(" ")[1];
    const credentials = Buffer.from(base64Credentials, "base64").toString(
      "utf8",
    );
    const [username, password] = credentials.split(":");

    if (
      username === SUPERVISORD_USERNAME &&
      password === SUPERVISORD_PASSWORD
    ) {
      next();
    } else {
      res.setHeader("WWW-Authenticate", 'Basic realm="MCP Server"');
      res.status(401).json({ error: "用户名或密码错误" });
    }
  } catch (error) {
    res.setHeader("WWW-Authenticate", 'Basic realm="MCP Server"');
    res.status(401).json({ error: "身份验证格式错误" });
  }
};

// Supervisord 工具函数
const supervisordUtils = {
  // 获取 supervisord PID
  async getSupervisordPid(): Promise<string | null> {
    try {
      // 使用 ini 库解析配置文件，而不是正则表达式
      const config = configManager.getParsedConfig();

      // 查找 supervisord 节中的 pidfile 配置
      if (config["supervisord"] && config["supervisord"].pidfile) {
        let pidFilePath = config["supervisord"].pidfile as string;

        // 处理多个路径（用逗号分隔的情况）
        pidFilePath = pidFilePath.split(",")[0].trim();

        // 如果是相对路径，则加上基础目录
        if (
          pidFilePath &&
          !pidFilePath.startsWith("/") &&
          !pidFilePath.match(/^[A-Za-z]:/)
        ) {
          pidFilePath = `${SUPERVISORD_COMMAND_DIR}/${pidFilePath}`;
        }

        const fs = await import("fs");
        if (fs.existsSync(pidFilePath)) {
          return fs.readFileSync(pidFilePath, "utf8").trim();
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  },

  // 获取 supervisord 版本
  async getSupervisordVersion(): Promise<string | null> {
    if (!SUPERVISORD_EXECUTABLE_PATH) {
      return null;
    }

    return new Promise((resolve) => {
      const process = spawn(SUPERVISORD_EXECUTABLE_PATH, ["version"]);
      let output = "";

      process.stdout.on("data", (data) => {
        output += data.toString();
      });

      process.on("close", (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          resolve(null);
        }
      });

      process.on("error", () => {
        resolve(null);
      });
    });
  },

  // 发送信号给程序
  async sendSignal(programName: string, signal: string): Promise<boolean> {
    if (!SUPERVISORD_EXECUTABLE_PATH) {
      return false;
    }

    return new Promise((resolve) => {
      const args = ["ctl", "signal", signal, programName];
      if (CONFIG_FILE_PATH) {
        args.unshift("-c", `${CONFIG_FILE_PATH}`);
      }

      const processSUPERVISORD = spawn(SUPERVISORD_EXECUTABLE_PATH, args);
      console.log(
        `Executing: ${SUPERVISORD_EXECUTABLE_PATH} ${args.join(" ")}`,
      );
      const lsSUPERVISORD = processSUPERVISORD;
      lsSUPERVISORD.stdout.on("data", (data) => {
        console.log(`stdout: ${data}`);
      });

      lsSUPERVISORD.stderr.on("data", (data) => {
        console.error(`stderr: ${data}`);
      });
      processSUPERVISORD.on("close", (code) => {
        resolve(code === 0);
      });

      processSUPERVISORD.on("error", () => {
        resolve(false);
      });
    });
  },

  // 获取 supervisord 日志路径
  getSupervisordLogPath(): string | null {
    try {
      // 使用 ini 库解析配置文件
      const config = configManager.getParsedConfig();

      // 查找 supervisord 节中的 logfile 配置
      if (config["supervisord"] && config["supervisord"].logfile) {
        let logPath = config["supervisord"].logfile as string;

        // 处理多个路径（用逗号分隔的情况）
        logPath = logPath.split(",")[0].trim();

        // 如果是相对路径，则加上基础目录
        if (
          logPath &&
          !logPath.startsWith("/") &&
          !logPath.match(/^[A-Za-z]:/)
        ) {
          logPath = `${SUPERVISORD_COMMAND_DIR}/${logPath}`;
        }

        return logPath;
      }

      // 如果没有找到 supervisord 节，使用环境变量指定的目录作为默认路径
      return `${SUPERVISORD_COMMAND_DIR}/supervisord.log`;
    } catch (error) {
      // 如果解析失败，使用环境变量指定的目录作为默认路径
      return `${SUPERVISORD_COMMAND_DIR}/supervisord.log`;
    }
  },
};

// 创建 supervisord 客户端
const supervisordClient = new SupervisordClient(
  `http://${SUPERVISORD_HOST}:${SUPERVISORD_PORT}`,
  SUPERVISORD_USERNAME,
  SUPERVISORD_PASSWORD,
  SUPERVISORD_COMMAND_DIR,
);

// 创建 MCP 服务器
const createServer = () => {
  const server = new McpServer(
    {
      name: "supervisor-mcp-server",
      version: "1.0.0",
      websiteUrl:
        "https://github.com/modelcontextprotocol/supervisor-mcp-server",
    },
    { capabilities: { logging: {} } },
  );

  // 1. 列出所有程序
  server.registerTool(
    "list_programs",
    {
      title: "List Programs",
      description: "List all managed programs and their current status",
      inputSchema: {},
    },
    async (): Promise<CallToolResult> => {
      try {
        const programs = await supervisordClient.getAllProcessInfo();

        const content = programs
          .map(
            (prog) =>
              `Program: ${prog.name}\n` +
              `  Status: ${prog.statename}\n` +
              `  PID: ${prog.pid}\n` +
              `  Description: ${prog.description}\n` +
              `  Group: ${prog.group}\n` +
              `  Started: ${new Date(prog.start * 1000).toISOString()}\n` +
              `  Log File: ${prog.logfile}\n`,
          )
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: `Found ${programs.length} programs:\n\n${content}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error listing programs: ${error.message}`,
            },
          ],
        };
      }
    },
  );

  // 2. 启动单个程序
  server.registerTool(
    "start_program",
    {
      title: "Start Program",
      description: "Start a single program by name",
      inputSchema: {
        name: z.string().describe("Name of the program to start"),
      },
    },
    async ({ name }): Promise<CallToolResult> => {
      try {
        const result = await supervisordClient.startProgram(name);

        return {
          content: [
            {
              type: "text",
              text: `Start program '${name}': ${
                result.success ? "Success" : "Failed"
              }`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error starting program '${name}': ${error.message}`,
            },
          ],
        };
      }
    },
  );

  // 3. 停止单个程序
  server.registerTool(
    "stop_program",
    {
      title: "Stop Program",
      description: "Stop a single program by name",
      inputSchema: {
        name: z.string().describe("Name of the program to stop"),
      },
    },
    async ({ name }): Promise<CallToolResult> => {
      try {
        const result = await supervisordClient.stopProgram(name);

        return {
          content: [
            {
              type: "text",
              text: `Stop program '${name}': ${
                result.success ? "Success" : "Failed"
              }`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error stopping program '${name}': ${error.message}`,
            },
          ],
        };
      }
    },
  );

  // 4. 批量启动程序
  server.registerTool(
    "start_programs",
    {
      title: "Start Multiple Programs",
      description:
        "Start multiple programs by providing a list of program names",
      inputSchema: {
        names: z.array(z.string()).describe("Array of program names to start"),
      },
    },
    async ({ names }): Promise<CallToolResult> => {
      try {
        const result = await supervisordClient.startPrograms(names);

        return {
          content: [
            {
              type: "text",
              text: `Batch start programs [${
                names.join(", ")
              }]: ${result.message}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error starting programs: ${error.message}`,
            },
          ],
        };
      }
    },
  );

  // 5. 批量停止程序
  server.registerTool(
    "stop_programs",
    {
      title: "Stop Multiple Programs",
      description:
        "Stop multiple programs by providing a list of program names",
      inputSchema: {
        names: z.array(z.string()).describe("Array of program names to stop"),
      },
    },
    async ({ names }): Promise<CallToolResult> => {
      try {
        const result = await supervisordClient.stopPrograms(names);

        return {
          content: [
            {
              type: "text",
              text: `Batch stop programs [${
                names.join(", ")
              }]: ${result.message}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error stopping programs: ${error.message}`,
            },
          ],
        };
      }
    },
  );

  // 6. 读取程序日志
  server.registerTool(
    "read_log",
    {
      title: "Read Program Log",
      description:
        "Read stdout or stderr log of a program with optional pagination",
      inputSchema: {
        name: z.string().describe("Name of the program"),
        type: z
          .enum(["stdout", "stderr"])
          .default("stdout")
          .describe("Log type"),
        offset: z
          .number()
          .optional()
          .describe("Byte offset to start reading from"),
        length: z.number().optional().describe("Number of bytes to read"),
        lines: z
          .number()
          .optional()
          .describe("Number of lines to read (for tail reading)"),
        tail: z.boolean().default(false).describe("Read from end of file"),
      },
    },
    async ({
      name,
      type = "stdout",
      offset,
      length,
      lines,
      tail,
    }): Promise<CallToolResult> => {
      try {
        const logPath = await supervisordClient.getProgramLogPath(
          name,
          type as "stdout" | "stderr" | undefined,
        );

        if (!logPath) {
          return {
            content: [
              {
                type: "text",
                text: `Log file not found for program '${name}' (${type})`,
              },
            ],
          };
        }

        if (!LogReader.isFileReadable(logPath)) {
          return {
            content: [
              {
                type: "text",
                text: `Cannot read log file: ${logPath}`,
              },
            ],
          };
        }

        const options: LogReadOptions = { offset, length, lines, tail };
        const logContent = await LogReader.readLog(logPath, options);

        const fileSize = LogReader.getFileSize(logPath);

        return {
          content: [
            {
              type: "text",
              text: `Log content from ${logPath}:\n` +
                `File size: ${fileSize} bytes\n` +
                `Read: ${logContent.readSize} bytes\n` +
                `Offset: ${logContent.offset}\n` +
                `Truncated: ${logContent.isTruncated ? "Yes" : "No"}\n\n` +
                logContent.content,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error reading log for program '${name}': ${error.message}`,
            },
          ],
        };
      }
    },
  );

  // 7. 获取配置文件
  server.registerTool(
    "get_config",
    {
      title: "Get Configuration",
      description:
        "Get the current supervisord configuration or a specific section",
      inputSchema: {
        section: z
          .string()
          .optional()
          .describe("Section name to get (optional)"),
      },
    },
    async ({ section }): Promise<CallToolResult> => {
      try {
        if (section) {
          const sectionConfig = configManager.getSection(section);
          if (!sectionConfig) {
            return {
              content: [
                {
                  type: "text",
                  text: `Section '${section}' not found`,
                },
              ],
            };
          }
          return {
            content: [
              {
                type: "text",
                text: `[${section}]\n` +
                  Object.entries(sectionConfig)
                    .map(([key, value]) => `${key}=${value}`)
                    .join("\n"),
              },
            ],
          };
        } else {
          const configContent = configManager.readConfig();
          return {
            content: [
              {
                type: "text",
                text: `Current supervisord configuration:\n\n${configContent}`,
              },
            ],
          };
        }
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error getting configuration: ${error.message}`,
            },
          ],
        };
      }
    },
  );

  // 8. 更新配置
  server.registerTool(
    "update_config",
    {
      title: "Update Configuration",
      description: "Update a specific configuration value",
      inputSchema: {
        section: z.string().describe("Section name"),
        key: z.string().describe("Configuration key"),
        value: z
          .union([z.string(), z.number(), z.boolean()])
          .describe("Configuration value"),
      },
    },
    async ({ section, key, value }): Promise<CallToolResult> => {
      try {
        const result = configManager.updateConfig(section, key, value);

        return {
          content: [
            {
              type: "text",
              text: `Update configuration: ${result.message}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error updating configuration: ${error.message}`,
            },
          ],
        };
      }
    },
  );

  // 9. 重载 supervisord
  server.registerTool(
    "reload_supervisor",
    {
      title: "Reload Supervisor Configuration",
      description: "Reload supervisord configuration without restarting",
      inputSchema: {},
    },
    async (): Promise<CallToolResult> => {
      try {
        const result = await supervisordClient.reload();

        return {
          content: [
            {
              type: "text",
              text: `Reload configuration: ${
                result.success ? "Success" : "Failed"
              }`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error reloading configuration: ${error.message}`,
            },
          ],
        };
      }
    },
  );

  // 10. 程序状态检查
  server.registerTool(
    "get_program_status",
    {
      title: "Get Program Status",
      description: "Get detailed status information for a specific program",
      inputSchema: {
        name: z.string().describe("Name of the program"),
      },
    },
    async ({ name }): Promise<CallToolResult> => {
      try {
        const programs = await supervisordClient.getAllProcessInfo();
        const program = programs.find((p) => p.name === name);

        if (!program) {
          return {
            content: [
              {
                type: "text",
                text: `Program '${name}' not found`,
              },
            ],
          };
        }

        const status = `Program: ${program.name}\n` +
          `Status: ${program.statename}\n` +
          `PID: ${program.pid}\n` +
          `Group: ${program.group}\n` +
          `Description: ${program.description}\n` +
          `Started: ${new Date(program.start * 1000).toISOString()}\n` +
          `Stopped: ${
            program.stop > 0
              ? new Date(program.stop * 1000).toISOString()
              : "N/A"
          }\n` +
          `Exit Status: ${program.exitstatus}\n` +
          `Spawn Error: ${program.spawnerr || "None"}\n` +
          `Log File: ${program.logfile}\n` +
          `Stdout Log: ${program.stdout_logfile}\n` +
          `Stderr Log: ${program.stderr_logfile}`;

        return {
          content: [
            {
              type: "text",
              text: status,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error getting program status: ${error.message}`,
            },
          ],
        };
      }
    },
  );

  // 11. 获取 supervisord PID 和版本信息
  server.registerTool(
    "get_supervisor_info",
    {
      title: "Get Supervisor Information",
      description: "Get supervisord PID, version, and system information",
      inputSchema: {},
    },
    async (): Promise<CallToolResult> => {
      try {
        const pid = await supervisordUtils.getSupervisordPid();
        const version = await supervisordUtils.getSupervisordVersion();
        const logPath = supervisordUtils.getSupervisordLogPath();

        const info = `Supervisor System Information:\n` +
          `PID: ${pid || "Unknown"}\n` +
          `Version: ${version || "Unknown"}\n` +
          `Executable Path: ${
            SUPERVISORD_EXECUTABLE_PATH || "Not configured"
          }\n` +
          `Config File: ${CONFIG_FILE_PATH}\n` +
          `Log File: ${logPath || "Unknown"}\n` +
          `HTTP Server: ${SUPERVISORD_HOST}:${SUPERVISORD_PORT}`;

        return {
          content: [
            {
              type: "text",
              text: info,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error getting supervisor information: ${error.message}`,
            },
          ],
        };
      }
    },
  );

  // 12. 查看 supervisord 本身日志
  server.registerTool(
    "get_supervisor_log",
    {
      title: "Get Supervisor Log",
      description: "Read supervisord daemon log with optional pagination",
      inputSchema: {
        offset: z
          .number()
          .optional()
          .describe("Byte offset to start reading from"),
        length: z.number().optional().describe("Number of bytes to read"),
        lines: z
          .number()
          .optional()
          .describe("Number of lines to read (for tail reading)"),
        tail: z.boolean().default(false).describe("Read from end of file"),
      },
    },
    async ({ offset, length, lines, tail }): Promise<CallToolResult> => {
      try {
        const logPath = supervisordUtils.getSupervisordLogPath();

        if (!logPath) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "Supervisor log file path not found in configuration",
              },
            ],
          };
        }

        if (!LogReader.isFileReadable(logPath)) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Cannot read supervisor log file: ${logPath}`,
              },
            ],
          };
        }

        const options: LogReadOptions = { offset, length, lines, tail };
        const logContent = await LogReader.readLog(logPath, options);

        const fileSize = LogReader.getFileSize(logPath);

        return {
          content: [
            {
              type: "text",
              text: `Supervisor Log Content from ${logPath}:\n` +
                `File size: ${fileSize} bytes\n` +
                `Read: ${logContent.readSize} bytes\n` +
                `Offset: ${logContent.offset}\n` +
                `Truncated: ${logContent.isTruncated ? "Yes" : "No"}\n\n` +
                logContent.content,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error reading supervisor log: ${error.message}`,
            },
          ],
        };
      }
    },
  );

  // 13. 发送信号给程序
  server.registerTool(
    "send_signal",
    {
      title: "Send Signal to Program",
      description:
        "Send Unix signal to a specific program (e.g., SIGHUP, SIGTERM, SIGKILL)",
      inputSchema: {
        name: z.string().describe("Name of the program to send signal to"),
        signal: z
          .string()
          .describe("Signal to send (e.g., SIGHUP, SIGTERM, SIGKILL, USR1)"),
      },
    },
    async ({ name, signal }): Promise<CallToolResult> => {
      try {
        if (!SUPERVISORD_EXECUTABLE_PATH) {
          return {
            content: [
              {
                type: "text",
                text:
                  `Error: SUPERVISORD_EXECUTABLE_PATH environment variable not configured`,
              },
            ],
          };
        }

        const success = await supervisordUtils.sendSignal(name, signal);

        return {
          content: [
            {
              type: "text",
              text: `Send signal '${signal}' to program '${name}': ${
                success ? "Success" : "Failed"
              }`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                `Error sending signal to program '${name}': ${error.message}`,
            },
          ],
        };
      }
    },
  );

  // 14. 获取单个程序详细信息
  server.registerTool(
    "get_program_info",
    {
      title: "Get Program Information",
      description:
        "Get detailed information about a specific program including PID and status",
      inputSchema: {
        name: z.string().describe("Name of the program"),
      },
    },
    async ({ name }): Promise<CallToolResult> => {
      try {
        const programs = await supervisordClient.getAllProcessInfo();
        const program = programs.find((p) => p.name === name);

        if (!program) {
          return {
            content: [
              {
                type: "text",
                text: `Program '${name}' not found`,
              },
            ],
          };
        }

        // 计算运行时间
        const now = Math.floor(Date.now() / 1000);
        const runtime = now - program.start;
        const hours = Math.floor(runtime / 3600);
        const minutes = Math.floor((runtime % 3600) / 60);
        const seconds = runtime % 60;
        const uptime = `${hours}:${
          minutes
            .toString()
            .padStart(2, "0")
        }:${seconds.toString().padStart(2, "0")}`;

        const info = `Program: ${program.name}\n` +
          `Status: ${program.statename}\n` +
          `PID: ${program.pid}\n` +
          `Group: ${program.group}\n` +
          `Uptime: ${uptime}\n` +
          `Started: ${new Date(program.start * 1000).toISOString()}\n` +
          `Description: ${program.description}\n` +
          `Log File: ${program.logfile}\n` +
          `Stdout Log: ${program.stdout_logfile || "Not configured"}\n` +
          `Stderr Log: ${program.stderr_logfile || "Not configured"}`;

        return {
          content: [
            {
              type: "text",
              text: info,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error getting program information: ${error.message}`,
            },
          ],
        };
      }
    },
  );

  // 15. 创建新程序
  server.registerTool(
    "create_program",
    {
      title: "Create Program",
      description: "Create a new program/service in supervisord configuration",
      inputSchema: {
        name: z.string().describe("Name of the program to create"),
        command: z.string().describe("Command to execute"),
        directory: z
          .string()
          .optional()
          .describe("Working directory for the program"),
        user: z.string().optional().describe("User to run the program as"),
        autostart: z
          .boolean()
          .default(true)
          .describe("Start program automatically when supervisord starts"),
        autorestart: z
          .boolean()
          .default(true)
          .describe("Restart program automatically if it crashes"),
        startsecs: z
          .number()
          .default(1)
          .describe(
            "Number of seconds program needs to stay running to consider it successfully started",
          ),
        startretries: z
          .number()
          .default(3)
          .describe("Number of retries during start before giving up"),
        stopwaitsecs: z
          .number()
          .default(10)
          .describe("Number of seconds to wait for SIGKILL before giving up"),
        stopsignal: z
          .string()
          .default("TERM")
          .describe("Signal to send to stop the program"),
        stdout_logfile: z
          .string()
          .optional()
          .describe("Path to stdout log file (default: auto-generated)"),
        stderr_logfile: z
          .string()
          .optional()
          .describe("Path to stderr log file (default: auto-generated)"),
        environment: z
          .string()
          .optional()
          .describe("Environment variables (format: KEY1=VALUE1,KEY2=VALUE2)"),
        priority: z
          .number()
          .optional()
          .describe("Startup priority (lower numbers start first)"),
        numprocs: z
          .number()
          .default(1)
          .describe("Number of processes to start"),
        process_name: z
          .string()
          .optional()
          .describe("Process name pattern (use with numprocs)"),
      },
    },
    async ({
      name,
      command,
      directory,
      user,
      autostart = true,
      autorestart = true,
      startsecs = 1,
      startretries = 3,
      stopwaitsecs = 10,
      stopsignal = "TERM",
      stdout_logfile,
      stderr_logfile,
      environment,
      priority,
      numprocs = 1,
      process_name,
    }): Promise<CallToolResult> => {
      try {
        // 检查程序是否已存在
        const programs = await supervisordClient.getAllProcessInfo();
        const existingProgram = programs.find((p) => p.name === name);

        if (existingProgram) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Program '${name}' already exists`,
              },
            ],
          };
        }

        // 构建程序配置
        const programConfig: any = {
          command: command,
          autostart: autostart,
          autorestart: autorestart,
          startsecs: startsecs,
          startretries: startretries,
          stopwaitsecs: stopwaitsecs,
          stopsignal: stopsignal,
          numprocs: numprocs,
        };

        // 添加可选参数
        if (directory) programConfig.directory = directory;
        if (user) programConfig.user = user;
        if (priority !== undefined) programConfig.priority = priority;
        if (process_name) programConfig.process_name = process_name;

        // 自动生成日志文件路径（如果未提供）
        if (!stdout_logfile) {
          stdout_logfile = `${SUPERVISORD_COMMAND_DIR}/${name}.log`;
        }
        if (!stderr_logfile) {
          stderr_logfile = `${SUPERVISORD_COMMAND_DIR}/${name}.error.log`;
        }

        programConfig.stdout_logfile = stdout_logfile;
        programConfig.stderr_logfile = stderr_logfile;

        // 解析环境变量
        if (environment) {
          const envVars: { [key: string]: string } = {};
          environment.split(",").forEach((pair) => {
            const [key, value] = pair.split("=");
            if (key && value) {
              envVars[key.trim()] = value.trim();
            }
          });
          programConfig.environment = envVars;
        }

        // 添加程序节到配置
        const sectionName = `program:${name}`;
        const result = configManager.addSection(sectionName, programConfig);

        if (!result.success) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Failed to create program: ${result.message}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Successfully created program '${name}':\n` +
                `Command: ${command}\n` +
                `Directory: ${directory || "Default"}\n` +
                `User: ${user || "Default"}\n` +
                `Autostart: ${autostart}\n` +
                `Autorestart: ${autorestart}\n` +
                `Stdout Log: ${stdout_logfile}\n` +
                `Stderr Log: ${stderr_logfile}\n\n` +
                `Note: Use 'reload_supervisor' to apply the new configuration.`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error creating program '${name}': ${error.message}`,
            },
          ],
        };
      }
    },
  );

  // 16. 删除程序
  server.registerTool(
    "delete_program",
    {
      title: "Delete Program",
      description: "Delete a program/service from supervisord configuration",
      inputSchema: {
        name: z.string().describe("Name of the program to delete"),
        force: z
          .boolean()
          .default(false)
          .describe("Force delete even if program is running"),
      },
    },
    async ({ name, force = false }): Promise<CallToolResult> => {
      try {
        // 检查程序是否存在
        const programs = await supervisordClient.getAllProcessInfo();
        const program = programs.find((p) => p.name === name);

        if (!program) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Program '${name}' does not exist`,
              },
            ],
          };
        }

        // 检查程序是否正在运行
        if (program.statename === "RUNNING" && !force) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text:
                  `Program '${name}' is currently running (PID: ${program.pid}). ` +
                  `Stop it first or use force=true to delete anyway.`,
              },
            ],
          };
        }

        // 如果程序正在运行，先停止它
        if (program.statename === "RUNNING" && force) {
          try {
            await supervisordClient.stopProgram(name);
          } catch (error) {
            // 忽略停止失败，继续删除
          }
        }

        // 删除程序节
        const sectionName = `program:${name}`;
        const result = configManager.deleteSection(sectionName);

        if (!result.success) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Failed to delete program: ${result.message}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Successfully deleted program '${name}'\n` +
                `The program configuration has been removed from supervisord.conf\n` +
                `Note: Use 'reload_supervisor' to apply the changes.`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error deleting program '${name}': ${error.message}`,
            },
          ],
        };
      }
    },
  );

  return server;
};

// 设置 Express 应用
const app = express();

// 配置 Morgan HTTP 日志中间件
app.use(morgan("combined")); // 使用 Apache combined 格式记录所有请求日志

// 配置基本 HTTP 身份验证中间件
// 对于 MCP 请求，不应用身份验证（由 MCP 协议处理）
// 对于健康检查和其他端点，根据环境变量配置决定是否启用身份验证
app.use((req, res, next) => {
  // // 跳过 MCP 端点的身份验证
  // if (req.path.startsWith("/mcp")) {
  //   return next();
  // }

  // 只有配置了用户名和密码才启用基本身份验证
  if (SUPERVISORD_USERNAME && SUPERVISORD_PASSWORD) {
    return basicAuthMiddleware(req, res, next);
  }

  // 未配置身份验证则直接通过
  next();
});

app.use(express.json());

// 配置 CORS
app.use(
  cors({
    origin: "*", // Allow all origins for demo purposes
    exposedHeaders: ["Mcp-Session-Id"],
  }),
);

// 传输映射
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// MCP 请求处理
const mcpPostHandler = async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (sessionId) {
    console.log(`Received MCP request for session: ${sessionId}`);
  } else {
    console.log("Request body:", req.body);
  }

  try {
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      // 重用现有传输
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // 新的初始化请求
      const eventStore = new InMemoryEventStore();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        eventStore,
        onsessioninitialized: (sid: string) => {
          console.log(`Session initialized with ID: ${sid}`);
          transports[sid] = transport;
        },
      });

      // 设置传输关闭时的清理
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          console.log(
            `Transport closed for session ${sid}, removing from transports map`,
          );
          delete transports[sid];
        }
      };

      // 连接传输到 MCP 服务器
      const server = createServer();
      await server.connect(transport);

      await transport.handleRequest(req, res, req.body);
      return;
    } else {
      // 无效请求
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
        id: null,
      });
      return;
    }

    // 使用现有传输处理请求
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
};

// GET 请求处理（SSE 流）
const mcpGetHandler = async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  console.log(`Handling SSE stream for session ${sessionId}`);
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

// DELETE 请求处理（会话终止）
const mcpDeleteHandler = async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  console.log(`Received session termination request for session ${sessionId}`);

  try {
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error("Error handling session termination:", error);
    if (!res.headersSent) {
      res.status(500).send("Error processing session termination");
    }
  }
};

// 设置路由
app.post("/mcp", mcpPostHandler);
app.get("/mcp", mcpGetHandler);
app.delete("/mcp", mcpDeleteHandler);

// 健康检查端点
app.get("/health", async (req: Request, res: Response) => {
  try {
    const isHealthy = await supervisordClient.healthCheck();
    res.json({
      status: isHealthy ? "healthy" : "unhealthy",
      supervisord: isHealthy ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

// 启动服务器
app.listen(MCP_PORT, () => {
  console.log(`Supervisor MCP Server listening on port ${MCP_PORT}`);
  console.log(
    `HTTP Request Logging: Morgan middleware enabled (combined format)`,
  );
  console.log(
    `Connecting to supervisord at ${SUPERVISORD_HOST}:${SUPERVISORD_PORT}`,
  );
  console.log(`Configuration file: ${CONFIG_FILE_PATH}`);
  console.log(
    `Executable path: ${SUPERVISORD_EXECUTABLE_PATH || "Not configured"}`,
  );
  console.log(
    `Authentication: ${
      SUPERVISORD_USERNAME && SUPERVISORD_PASSWORD ? "Enabled" : "Disabled"
    }`,
  );
  console.log(
    `Available tools: 16 tools including create/delete programs, signal sending, supervisor info, and enhanced logging`,
  );
  console.log(`Logs will be output to console in Apache combined format`);
});

// 处理服务器关闭
process.on("SIGINT", async () => {
  console.log("Shutting down MCP server...");

  // 关闭所有活跃的传输
  for (const sessionId in transports) {
    try {
      console.log(`Closing transport for session ${sessionId}`);
      await transports[sessionId].close();
      delete transports[sessionId];
    } catch (error) {
      console.error(`Error closing transport for session ${sessionId}:`, error);
    }
  }

  console.log("MCP server shutdown complete");
  process.exit(0);
});
