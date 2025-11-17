import axios, { AxiosInstance } from "axios";

// Supervisord 进程信息接口
export interface ProcessInfo {
  name: string;
  group: string;
  description: string;
  start: number;
  stop: number;
  now: number;
  state: number;
  statename: string;
  spawnerr: string;
  exitstatus: number;
  logfile: string;
  stdout_logfile: string;
  stderr_logfile: string;
  pid: number;
}

// 操作结果接口
export interface OperationResult {
  success: boolean;
  message?: string;
  data?: any;
}

// Supervisord HTTP 客户端
export class SupervisordClient {
  private httpClient: AxiosInstance;
  private baseURL: string;
  private commandDir: string;

  constructor(
    baseURL: string = "http://127.0.0.1:9001",
    username?: string,
    password?: string,
    commandDir?: string
  ) {
    this.baseURL = baseURL;
    this.commandDir =
      commandDir ||
      process.env.SUPERVISORD_COMMAND_DIR ||
      "/var/log/supervisor";

    const auth = username && password ? { username, password } : undefined;

    this.httpClient = axios.create({
      baseURL,
      auth,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 10000, // 10秒超时
    });
  }

  /**
   * 获取所有程序状态列表
   */
  async getAllProcessInfo(): Promise<ProcessInfo[]> {
    try {
      const response = await this.httpClient.get("/program/list");
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error(
          "Unauthorized: Invalid username or password for supervisord API"
        );
      }
      throw new Error(`Failed to get process list: ${error.message}`);
    }
  }

  /**
   * 启动单个程序
   */
  async startProgram(name: string): Promise<OperationResult> {
    try {
      const response = await this.httpClient.post(`/program/start/${name}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to start program '${name}': ${error.message}`);
    }
  }

  /**
   * 停止单个程序
   */
  async stopProgram(name: string): Promise<OperationResult> {
    try {
      const response = await this.httpClient.post(`/program/stop/${name}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to stop program '${name}': ${error.message}`);
    }
  }

  /**
   * 批量启动程序
   */
  async startPrograms(names: string[]): Promise<OperationResult> {
    try {
      const response = await this.httpClient.post(
        "/program/startPrograms",
        names
      );
      return {
        success: true,
        message: response.data,
      };
    } catch (error: any) {
      throw new Error(`Failed to start programs: ${error.message}`);
    }
  }

  /**
   * 批量停止程序
   */
  async stopPrograms(names: string[]): Promise<OperationResult> {
    try {
      const response = await this.httpClient.post(
        "/program/stopPrograms",
        names
      );
      return {
        success: true,
        message: response.data,
      };
    } catch (error: any) {
      throw new Error(`Failed to stop programs: ${error.message}`);
    }
  }

  /**
   * 读取程序 stdout 日志（由调用方实现文件系统读取）
   */
  async getProgramLogPath(
    name: string,
    type: "stdout" | "stderr" = "stdout"
  ): Promise<string | null> {
    try {
      const programs = await this.getAllProcessInfo();
      const program = programs.find((p) => p.name === name);

      if (!program) {
        throw new Error(`Program '${name}' not found`);
      }

      let logPath =
        type === "stdout" ? program.stdout_logfile : program.stderr_logfile;

      // 处理多个路径（用逗号分隔的情况）
      if (logPath && logPath.includes(",")) {
        logPath = logPath.split(",")[0].trim();
      }

      // 如果是相对路径，则加上基础目录
      if (
        logPath &&
        logPath !== "AUTO" &&
        !logPath.startsWith("/") &&
        !logPath.match(/^[A-Za-z]:/)
      ) {
        logPath = `${this.commandDir}/${logPath}`;
      }

      return logPath;
    } catch (error: any) {
      throw new Error(
        `Failed to get log path for program '${name}': ${error.message}`
      );
    }
  }

  /**
   * 重载 supervisord 配置
   */
  async reload(): Promise<OperationResult> {
    try {
      const response = await this.httpClient.post("/supervisor/reload");
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to reload configuration: ${error.message}`);
    }
  }

  /**
   * 关闭 supervisord 系统
   */
  async shutdown(): Promise<OperationResult> {
    try {
      const response = await this.httpClient.post("/supervisor/shutdown");
      return {
        success: true,
        message: response.data,
      };
    } catch (error: any) {
      throw new Error(`Failed to shutdown supervisord: ${error.message}`);
    }
  }

  /**
   * 检查与 supervisord 的连接
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getAllProcessInfo();
      return true;
    } catch {
      return false;
    }
  }
}
