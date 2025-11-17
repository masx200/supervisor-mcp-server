import { closeSync, openSync, readFileSync, readSync, statSync } from "fs";
import { createReadStream } from "fs";
import { createInterface } from "readline";

// 日志读取配置
export interface LogReadOptions {
  offset?: number; // 起始位置（字节）
  length?: number; // 读取长度（字节）
  lines?: number; // 读取行数
  tail?: boolean; // 从文件末尾读取
}

// 日志内容接口
export interface LogContent {
  content: string;
  totalSize: number;
  readSize: number;
  isTruncated: boolean;
  offset: number;
}

// 日志读取器
export class LogReader {
  /**
   * 从文件指定位置读取日志内容（支持分页）
   */
  static async readLog(
    logFilePath: string,
    options: LogReadOptions = {},
  ): Promise<LogContent> {
    const { offset = 0, length, lines, tail = false } = options;

    try {
      const stats = statSync(logFilePath);
      const totalSize = stats.size;

      let content = "";
      let isTruncated = false;

      // 如果指定了 tail，从文件末尾开始读取
      if (tail && lines) {
        content = await this.readFromTail(logFilePath, lines);
      } else if (length) {
        // 按字节长度读取
        content = this.readByLength(logFilePath, offset, length);
      } else {
        // 读取整个文件或指定偏移后的内容
        const data = readFileSync(logFilePath, "utf8");
        if (offset > 0) {
          content = data.substring(offset);
        } else {
          content = data;
        }
      }

      // 检查内容是否被截断
      isTruncated = length ? content.length < length : false;

      return {
        content,
        totalSize,
        readSize: content.length,
        isTruncated,
        offset: tail ? Math.max(0, totalSize - content.length) : offset,
      };
    } catch (error: any) {
      throw new Error(
        `Failed to read log file '${logFilePath}': ${error.message}`,
      );
    }
  }

  /**
   * 按字节长度读取文件内容
   */
  private static readByLength(
    filePath: string,
    offset: number,
    length: number,
  ): string {
    const buffer = Buffer.alloc(length);
    const fileDescriptor = openSync(filePath, "r");

    try {
      readSync(fileDescriptor, buffer, 0, length, offset);
      return buffer.toString("utf8");
    } finally {
      closeSync(fileDescriptor);
    }
  }

  /**
   * 从文件末尾读取指定行数
   */
  private static async readFromTail(
    filePath: string,
    lines: number,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const fileStream = createReadStream(filePath, {
        start: 0,
        end: undefined,
      });
      const readline = createInterface({ input: fileStream });
      const lineBuffer: string[] = [];

      readline.on("line", (line: string) => {
        lineBuffer.push(line);
        // 只保留最后 N 行
        if (lineBuffer.length > lines) {
          lineBuffer.shift();
        }
      });

      readline.on("close", () => {
        resolve(lineBuffer.join("\n"));
      });

      readline.on("error", (error: any) => {
        reject(new Error(`Error reading file: ${error.message}`));
      });
    }).then((content) => content as string);
  }

  /**
   * 获取文件大小
   */
  static getFileSize(filePath: string): number {
    try {
      const stats = statSync(filePath);
      return stats.size;
    } catch (error: any) {
      throw new Error(`Failed to get file size: ${error.message}`);
    }
  }

  /**
   * 检查文件是否存在且可读
   */
  static isFileReadable(filePath: string): boolean {
    try {
      const stats = statSync(filePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * 读取文件的前 N 行
   */
  static async readFirstLines(
    filePath: string,
    lineCount: number,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const fileStream = createReadStream(filePath, {
        start: 0,
        end: undefined,
      });
      const readline = createInterface({ input: fileStream });
      const lines: string[] = [];

      readline.on("line", (line: string) => {
        lines.push(line);
        if (lines.length >= lineCount) {
          readline.close();
        }
      });

      readline.on("close", () => {
        resolve(lines.join("\n"));
      });

      readline.on("error", (error: any) => {
        reject(new Error(`Error reading first lines: ${error.message}`));
      });
    }).then((content) => content as string);
  }

  /**
   * 读取文件的后 N 行
   */
  static async readLastLines(
    filePath: string,
    lineCount: number,
  ): Promise<string> {
    return await LogReader.readFromTail(filePath, lineCount);
  }
}
