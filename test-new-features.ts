#!/usr/bin/env node

/**
 * 测试新增的 create_program 和 delete_program 功能
 */

import { ConfigManager } from './dist/configManager.js';

// 创建配置管理器实例，使用项目中的示例配置文件
const configManager = new ConfigManager('./example-supervisord.conf');

// 测试配置管理器的新功能
async function testConfigManager() {
  console.log('\n=== 测试 ConfigManager 的 addSection 和 deleteSection 功能 ===\n');

  try {
    // 测试添加新程序配置
    console.log('1. 测试添加新程序配置...');
    const addResult = configManager.addSection('program:test-program', {
      command: 'echo "Hello from test program"',
      autostart: true,
      autorestart: true,
      startsecs: 1,
      stdout_logfile: '/var/log/supervisor/test-program.log',
      stderr_logfile: '/var/log/supervisor/test-program.error.log'
    });

    console.log('添加结果:', addResult);
    if (addResult.success) {
      console.log('✅ 添加程序配置成功\n');
    } else {
      console.log('❌ 添加程序配置失败\n');
      return;
    }

    // 验证添加的程序配置
    console.log('2. 验证添加的程序配置...');
    const programConfig = configManager.getSection('program:test-program');
    console.log('程序配置:', JSON.stringify(programConfig, null, 2));
    console.log('✅ 获取程序配置成功\n');

    // 测试删除程序配置
    console.log('3. 测试删除程序配置...');
    const deleteResult = configManager.deleteSection('program:test-program');
    console.log('删除结果:', deleteResult);
    if (deleteResult.success) {
      console.log('✅ 删除程序配置成功\n');
    } else {
      console.log('❌ 删除程序配置失败\n');
      return;
    }

    // 验证删除
    console.log('4. 验证删除结果...');
    const checkDeleted = configManager.getSection('program:test-program');
    console.log('检查删除后的配置:', checkDeleted);
    if (checkDeleted === null) {
      console.log('✅ 删除验证成功\n');
    } else {
      console.log('❌ 删除验证失败，程序配置仍然存在\n');
      return;
    }

    console.log('🎉 所有测试通过！');

  } catch (error: any) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
testConfigManager();
