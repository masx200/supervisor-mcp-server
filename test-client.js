#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

async function testMcpServer() {
  console.log('Starting MCP Server test...');

  try {
    // Create transport to connect to our running server
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/server.js'],
      env: {
        ...process.env,
        SUPERVISORD_HOST: '127.0.0.1',
        SUPERVISORD_PORT: '9002',
        SUPERVISORD_COMMAND_DIR: 'E:\\projects\\refactor-the-project',
        SUPERVISORD_USERNAME: 'b18b935c-1551-4b6f-b70c-4d6a3e833adf',
        SUPERVISORD_PASSWORD: '8tn6y2o8hthggug600eswffzpo5bke',
        SUPERVISORD_EXECUTABLE_PATH: 'E:\\迅雷下载\\supervisord_0.7.3_Windows_64-bit\\supervisord_0.7.3_Windows_64-bit\\supervisord.exe',
        CONFIG_FILE_PATH: 'E:\\projects\\refactor-the-project\\supervisord.conf',
        MCP_PORT: '30000'
      }
    });

    // Create and connect client
    const client = new Client({
      name: 'test-client',
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });

    await client.connect(transport);
    console.log('✅ Connected to MCP server successfully');

    // List available tools
    const toolsResult = await client.listTools();
    console.log('\n📋 Available tools:');
    toolsResult.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });

    // Test a simple tool - list programs
    console.log('\n🔍 Testing list_programs tool...');
    try {
      const listResult = await client.callTool({
        name: 'list_programs',
        arguments: {}
      });
      console.log('✅ list_programs result:', JSON.stringify(listResult.content, null, 2));
    } catch (error) {
      console.error('❌ Error calling list_programs:', error.message);
    }

    // Test get_supervisor_info tool
    console.log('\n🔍 Testing get_supervisor_info tool...');
    try {
      const infoResult = await client.callTool({
        name: 'get_supervisor_info',
        arguments: {}
      });
      console.log('✅ get_supervisor_info result:', JSON.stringify(infoResult.content, null, 2));
    } catch (error) {
      console.error('❌ Error calling get_supervisor_info:', error.message);
    }

    // Close connection
    await client.close();
    console.log('\n✅ Test completed successfully');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testMcpServer();