#!/usr/bin/env node

import fetch from 'node-fetch';

// Test script for MCP server CLI functionality
async function testMCPServer() {
    console.log('🧪 Testing MCP Server via CLI approach...\n');
    
    const serverUrl = 'http://localhost:3000/mcp';
    
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    try {
        const healthResponse = await fetch('http://localhost:3000/health');
        const healthData = await healthResponse.json();
        console.log('✅ Health check:', healthData);
    } catch (error) {
        console.log('❌ Health check failed:', error.message);
    }
    
    // Test 2: MCP Initialize
    console.log('\n2. Testing MCP initialize...');
    try {
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
        
        const initResponse = await fetch(serverUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(initRequest)
        });
        
        const initData = await initResponse.json();
        console.log('✅ MCP Initialize response:', JSON.stringify(initData, null, 2));
    } catch (error) {
        console.log('❌ MCP Initialize failed:', error.message);
    }
    
    // Test 3: List Tools
    console.log('\n3. Testing tools/list...');
    try {
        const toolsRequest = {
            jsonrpc: "2.0",
            id: 2,
            method: "tools/list",
            params: {}
        };
        
        const toolsResponse = await fetch(serverUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(toolsRequest)
        });
        
        const toolsData = await toolsResponse.json();
        console.log('✅ Tools list response:', JSON.stringify(toolsData, null, 2));
        
        if (toolsData.result && toolsData.result.tools) {
            console.log(`\n📋 Available tools (${toolsData.result.tools.length}):`);
            toolsData.result.tools.forEach((tool, index) => {
                console.log(`   ${index + 1}. ${tool.name}: ${tool.description}`);
            });
        }
    } catch (error) {
        console.log('❌ Tools list failed:', error.message);
    }
    
    // Test 4: Call a simple tool
    console.log('\n4. Testing tool call (get_supervisor_info)...');
    try {
        const callRequest = {
            jsonrpc: "2.0",
            id: 3,
            method: "tools/call",
            params: {
                name: "get_supervisor_info",
                arguments: {}
            }
        };
        
        const callResponse = await fetch(serverUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(callRequest)
        });
        
        const callData = await callResponse.json();
        console.log('✅ Tool call response:', JSON.stringify(callData, null, 2));
    } catch (error) {
        console.log('❌ Tool call failed:', error.message);
    }
    
    console.log('\n🎉 MCP Server CLI testing completed!');
}

// Run the test
testMCPServer().catch(console.error);