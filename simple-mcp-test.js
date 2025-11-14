#!/usr/bin/env node

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Use Node.js built-in modules only
import { createServer } from 'http';
import { URL } from 'url';

async function testMCPServerCLI() {
    console.log('🧪 Testing MCP Server with CLI approach...\n');
    
    const serverUrl = 'http://localhost:3000/mcp';
    
    // Helper function to make HTTP requests
    function makeRequest(url, data) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const postData = JSON.stringify(data);
            
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: urlObj.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };
            
            const req = createServer(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(responseData));
                    } catch (e) {
                        resolve(responseData);
                    }
                });
            });
            
            req.on('error', reject);
            req.write(postData);
            req.end();
        });
    }
    
    try {
        // Test 1: Health check
        console.log('1. 🔍 Testing health endpoint...');
        const healthUrl = 'http://localhost:3000/health';
        const healthData = await makeRequest(healthUrl, {});
        console.log('✅ Health check passed:', healthData);
        
        // Test 2: MCP Initialize
        console.log('\n2. 🔧 Testing MCP initialize...');
        const initRequest = {
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
                protocolVersion: "2024-11-05",
                capabilities: {},
                clientInfo: {
                    name: "cli-test-client",
                    version: "1.0.0"
                }
            }
        };
        
        const initResponse = await makeRequest(serverUrl, initRequest);
        console.log('✅ MCP Initialize response:', JSON.stringify(initResponse, null, 2));
        
        // Test 3: List Tools
        console.log('\n3. 📋 Testing tools/list...');
        const toolsRequest = {
            jsonrpc: "2.0",
            id: 2,
            method: "tools/list",
            params: {}
        };
        
        const toolsResponse = await makeRequest(serverUrl, toolsRequest);
        console.log('✅ Tools list response:', JSON.stringify(toolsResponse, null, 2));
        
        if (toolsResponse.result && toolsResponse.result.tools) {
            console.log(`\n📋 Available tools (${toolsResponse.result.tools.length}):`);
            toolsResponse.result.tools.forEach((tool, index) => {
                console.log(`   ${index + 1}. ${tool.name}: ${tool.description}`);
            });
            
            // Test 4: Call first available tool
            const firstTool = toolsResponse.result.tools[0];
            if (firstTool) {
                console.log(`\n4. 🔧 Testing tool call: ${firstTool.name}`);
                const callRequest = {
                    jsonrpc: "2.0",
                    id: 3,
                    method: "tools/call",
                    params: {
                        name: firstTool.name,
                        arguments: firstTool.inputSchema ? {} : {} // Empty arguments for testing
                    }
                };
                
                const callResponse = await makeRequest(serverUrl, callRequest);
                console.log('✅ Tool call response:', JSON.stringify(callResponse, null, 2));
            }
        }
        
        console.log('\n🎉 MCP Server CLI testing completed successfully!');
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Make sure the MCP server is running on port 3000');
        }
    }
}

// Start server and run tests
async function main() {
    console.log('Starting MCP server for CLI testing...\n');
    
    // We expect the server to be started separately
    // Just run the tests
    await testMCPServerCLI();
}

main();