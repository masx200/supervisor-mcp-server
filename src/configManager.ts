import { readFileSync, writeFileSync, existsSync } from 'fs';
import { stringify, parse } from 'ini';

// 配置文件节接口
export interface ConfigSection {
  [key: string]: string | number | boolean;
}

// 完整配置文件接口
export interface SupervisordConfig {
  [section: string]: ConfigSection;
}

// 配置文件管理结果
export interface ConfigOperationResult {
  success: boolean;
  message: string;
  data?: any;
}

// INI 配置文件管理器
export class ConfigManager {
  private configPath: string;

  constructor(configPath: string = '/etc/supervisord.conf') {
    this.configPath = configPath;
  }

  /**
   * 读取配置文件原始内容
   */
  readConfig(): string {
    try {
      if (!existsSync(this.configPath)) {
        throw new Error(`Configuration file not found: ${this.configPath}`);
      }
      return readFileSync(this.configPath, 'utf8');
    } catch (error: any) {
      throw new Error(`Failed to read config file: ${error.message}`);
    }
  }

  /**
   * 解析 INI 格式配置（使用官方 ini 库）
   */
  parseConfig(content: string): SupervisordConfig {
    try {
      const config = parse(content) as any;
      
      // 转换 ini 库的输出格式为我们的接口格式
      const result: SupervisordConfig = {};
      for (const [key, value] of Object.entries(config)) {
        if (typeof value === 'object' && value !== null) {
          // 这是一个节 [section]
          result[key] = value as ConfigSection;
        } else {
          // 这是一个全局值（无节的键值对）
          if (!result.__GLOBAL__) {
            result.__GLOBAL__ = {};
          }
          result.__GLOBAL__[key] = value as string;
        }
      }
      
      return result;
    } catch (error: any) {
      throw new Error(`Failed to parse config: ${error.message}`);
    }
  }

  /**
   * 序列化配置为 INI 格式（使用官方 ini 库）
   */
  serializeConfig(config: SupervisordConfig): string {
    try {
      // 转换我们的格式为 ini 库的输入格式
      const iniFormat: any = {};
      
      for (const [sectionName, section] of Object.entries(config)) {
        if (sectionName === '__GLOBAL__') {
          // 处理全局配置项
          Object.assign(iniFormat, section);
        } else {
          // 处理有节的配置
          iniFormat[sectionName] = section;
        }
      }
      
      return stringify(iniFormat, {
        whitespace: false,
        align: false,
        newline: false
      });
    } catch (error: any) {
      throw new Error(`Failed to serialize config: ${error.message}`);
    }
  }

  /**
   * 获取指定节的所有配置
   */
  getSection(sectionName: string): ConfigSection | null {
    try {
      const configContent = this.readConfig();
      const config = this.parseConfig(configContent);
      return config[sectionName] || null;
    } catch (error: any) {
      throw new Error(`Failed to get section '${sectionName}': ${error.message}`);
    }
  }

  /**
   * 更新配置项
   */
  updateConfig(sectionName: string, key: string, value: string | number | boolean): ConfigOperationResult {
    try {
      const configContent = this.readConfig();
      const config = this.parseConfig(configContent);
      
      if (!config[sectionName]) {
        config[sectionName] = {};
      }
      
      config[sectionName][key] = value;
      const newContent = this.serializeConfig(config);
      
      // 备份原文件
      this.backupConfig();
      
      writeFileSync(this.configPath, newContent, 'utf8');
      
      return {
        success: true,
        message: `Updated ${sectionName}.${key} = ${value}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to update config: ${error.message}`
      };
    }
  }

  /**
   * 添加新的配置节
   */
  addSection(sectionName: string, sectionConfig: ConfigSection = {}): ConfigOperationResult {
    try {
      const configContent = this.readConfig();
      const config = this.parseConfig(configContent);
      
      if (config[sectionName]) {
        return {
          success: false,
          message: `Section '${sectionName}' already exists`
        };
      }
      
      config[sectionName] = sectionConfig;
      const newContent = this.serializeConfig(config);
      
      // 备份原文件
      this.backupConfig();
      
      writeFileSync(this.configPath, newContent, 'utf8');
      
      return {
        success: true,
        message: `Added new section '${sectionName}'`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to add section: ${error.message}`
      };
    }
  }

  /**
   * 删除配置节
   */
  deleteSection(sectionName: string): ConfigOperationResult {
    try {
      const configContent = this.readConfig();
      const config = this.parseConfig(configContent);
      
      if (!config[sectionName]) {
        return {
          success: false,
          message: `Section '${sectionName}' does not exist`
        };
      }
      
      delete config[sectionName];
      const newContent = this.serializeConfig(config);
      
      // 备份原文件
      this.backupConfig();
      
      writeFileSync(this.configPath, newContent, 'utf8');
      
      return {
        success: true,
        message: `Deleted section '${sectionName}'`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to delete section: ${error.message}`
      };
    }
  }

  /**
   * 删除配置项
   */
  deleteConfigItem(sectionName: string, key: string): ConfigOperationResult {
    try {
      const configContent = this.readConfig();
      const config = this.parseConfig(configContent);
      
      if (!config[sectionName] || !(key in config[sectionName])) {
        return {
          success: false,
          message: `Config item '${sectionName}.${key}' does not exist`
        };
      }
      
      delete config[sectionName][key];
      const newContent = this.serializeConfig(config);
      
      // 备份原文件
      this.backupConfig();
      
      writeFileSync(this.configPath, newContent, 'utf8');
      
      return {
        success: true,
        message: `Deleted config item '${sectionName}.${key}'`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to delete config item: ${error.message}`
      };
    }
  }

  /**
   * 获取所有节名
   */
  getSectionNames(): string[] {
    try {
      const configContent = this.readConfig();
      const config = this.parseConfig(configContent);
      return Object.keys(config).filter(name => name !== '__GLOBAL__');
    } catch (error: any) {
      throw new Error(`Failed to get section names: ${error.message}`);
    }
  }

  /**
   * 备份配置文件
   */
  backupConfig(backupPath?: string): ConfigOperationResult {
    try {
      const backupFilePath = backupPath || `${this.configPath}.backup.${Date.now()}`;
      const configContent = this.readConfig();
      writeFileSync(backupFilePath, configContent, 'utf8');
      
      return {
        success: true,
        message: `Configuration backed up to ${backupFilePath}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to backup config: ${error.message}`
      };
    }
  }

  /**
   * 获取解析后的配置对象（用于高级操作）
   */
  getParsedConfig(): SupervisordConfig {
    try {
      const configContent = this.readConfig();
      return this.parseConfig(configContent);
    } catch (error: any) {
      throw new Error(`Failed to parse config: ${error.message}`);
    }
  }

  /**
   * 批量更新配置项
   */
  updateMultipleConfigs(updates: Array<{
    section: string;
    key: string;
    value: string | number | boolean;
  }>): ConfigOperationResult {
    try {
      const configContent = this.readConfig();
      const config = this.parseConfig(configContent);
      
      for (const { section, key, value } of updates) {
        if (!config[section]) {
          config[section] = {};
        }
        config[section][key] = value;
      }
      
      const newContent = this.serializeConfig(config);
      
      // 备份原文件
      this.backupConfig();
      
      writeFileSync(this.configPath, newContent, 'utf8');
      
      return {
        success: true,
        message: `Updated ${updates.length} configuration items`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to update multiple configs: ${error.message}`
      };
    }
  }

  /**
   * 验证配置文件格式
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    try {
      const configContent = this.readConfig();
      this.parseConfig(configContent);
      return {
        isValid: true,
        errors: []
      };
    } catch (error: any) {
      return {
        isValid: false,
        errors: [error.message]
      };
    }
  }

  /**
   * 获取配置统计信息
   */
  getConfigStats(): {
    totalSections: number;
    totalKeys: number;
    fileSize: number;
    lastModified: Date;
  } {
    try {
      const configContent = this.readConfig();
      const config = this.parseConfig(configContent);
      
      const totalSections = Object.keys(config).length;
      const totalKeys = Object.values(config).reduce(
        (count, section) => count + Object.keys(section).length,
        0
      );
      
      const stats = require('fs').statSync(this.configPath);
      
      return {
        totalSections,
        totalKeys,
        fileSize: stats.size,
        lastModified: stats.mtime
      };
    } catch (error: any) {
      throw new Error(`Failed to get config stats: ${error.message}`);
    }
  }
}