#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function testMcpServerWithSDK() {
  console.log('🚀 Starting MCP Server test using @modelcontextprotocol/sdk...');

  try {
    // Create client
    const client = new Client({
      name: 'supervisor-test-client',
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });

    // Create HTTP transport to connect to our running server with authentication
    const serverUrl = new URL('http://localhost:30000/mcp');
    const transport = new StreamableHTTPClientTransport(serverUrl, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from('b18b935c-1551-4b6f-b70c-4d6a3e833adf:8tn6y2o8hthggug600eswffzpo5bke').toString('base64')
      }
    });

    // Connect to the server
    await client.connect(transport);
    console.log('✅ Connected to MCP server successfully');

    // List available tools
    const toolsResult = await client.listTools();
    console.log(`\n📋 Available tools (${toolsResult.tools.length}):`);
    toolsResult.tools.forEach((tool, index) => {
      console.log(`  ${index + 1}. ${tool.name}: ${tool.description}`);
    });

    // Test 1: List programs
    console.log('\n🔍 Testing list_programs tool...');
    try {
      const listResult = await client.callTool({
        name: 'list_programs',
        arguments: {}
      });

      if (listResult.content && listResult.content.length > 0) {
        const content = listResult.content[0];
        if (content.type === 'text') {
          const data = JSON.parse(content.text);
          console.log('✅ list_programs result:');
          console.log(`   Total programs: ${data.totalPrograms || 0}`);
          if (data.programs && data.programs.length > 0) {
            data.programs.forEach((program, i) => {
              console.log(`   ${i + 1}. ${program.name} - ${program.state} (${program.pid || 'N/A'})`);
            });
          }
        }
      }
    } catch (error) {
      console.error('❌ Error calling list_programs:', error.message);
    }

    // Test 2: Get supervisor info
    console.log('\n🔍 Testing get_supervisor_info tool...');
    try {
      const infoResult = await client.callTool({
        name: 'get_supervisor_info',
        arguments: {}
      });

      if (infoResult.content && infoResult.content.length > 0) {
        const content = infoResult.content[0];
        if (content.type === 'text') {
          const data = JSON.parse(content.text);
          console.log('✅ get_supervisor_info result:');
          console.log(`   PID: ${data.supervisorInfo?.pid || 'N/A'}`);
          console.log(`   Version: ${data.supervisorInfo?.version || 'N/A'}`);
          console.log(`   API Version: ${data.supervisorInfo?.apiVersion || 'N/A'}`);
        }
      }
    } catch (error) {
      console.error('❌ Error calling get_supervisor_info:', error.message);
    }

    // Test 3: Get supervisor log
    console.log('\n🔍 Testing get_supervisor_log tool...');
    try {
      const logResult = await client.callTool({
        name: 'get_supervisor_log',
        arguments: {
          offset: 0,
          length: 50
        }
      });

      if (logResult.content && logResult.content.length > 0) {
        const content = logResult.content[0];
        if (content.type === 'text') {
          const data = JSON.parse(content.text);
          console.log('✅ get_supervisor_log result:');
          console.log(`   Log file: ${data.logPath || 'N/A'}`);
          console.log(`   Content length: ${data.content?.length || 0} characters`);
          if (data.content && data.content.length > 0) {
            console.log('   First 200 chars:', data.content.substring(0, 200) + '...');
          }
        }
      }
    } catch (error) {
      console.error('❌ Error calling get_supervisor_log:', error.message);
    }

    // Test 4: Try to start a program (if any exists)
    console.log('\n🔍 Testing start_program tool...');
    try {
      const startResult = await client.callTool({
        name: 'start_program',
        arguments: {
          program: 'test'  // This might fail if program doesn't exist
        }
      });

      if (startResult.content && startResult.content.length > 0) {
        const content = startResult.content[0];
        if (content.type === 'text') {
          const data = JSON.parse(content.text);
          console.log('✅ start_program result:', data);
        }
      }
    } catch (error) {
      console.error('⚠️ Expected error calling start_program (test program may not exist):', error.message);
    }

    // Close connection
    await client.close();
    console.log('\n✅ MCP SDK test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testMcpServerWithSDK();