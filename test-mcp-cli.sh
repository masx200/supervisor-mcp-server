#!/bin/bash

echo "🧪 Testing MCP Server CLI functionality..."
echo ""

# Check if server is running
echo "1. 🔍 Checking server status..."
if pgrep -f "node dist/server.js" > /dev/null; then
    echo "✅ MCP Server is running"
else
    echo "❌ MCP Server is not running"
    echo "💡 Please start the server first: cd /workspace/supervisor-mcp-server && SUPERVISORD_HOST=127.0.0.1 SUPERVISORD_PORT=9002 SUPERVISORD_USERNAME=testuser SUPERVISORD_PASSWORD=testpass MCP_PORT=3000 node dist/server.js"
    exit 1
fi

# Test health endpoint using basic network tools
echo ""
echo "2. 🔧 Testing health endpoint..."

# Try to use bash built-in /dev/tcp if available
if exec 3<>/dev/tcp/localhost/3000; then
    echo "✅ Port 3000 is accessible"
    
    # Send HTTP request
    echo -e "GET /health HTTP/1.1\r\nHost: localhost:3000\r\nConnection: close\r\n\r\n" >&3
    
    # Read response (first few lines)
    response=$(head -5 <&3)
    echo "📊 Health response preview:"
    echo "$response"
    
    exec 3>&-
else
    echo "❌ Cannot connect to localhost:3000"
fi

# Test MCP endpoint
echo ""
echo "3. 🔧 Testing MCP endpoint..."

if exec 4<>/dev/tcp/localhost/3000; then
    echo "✅ MCP endpoint is accessible"
    
    # Send MCP initialize request
    mcp_request='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"cli-test","version":"1.0.0"}}}'
    
    echo -e "POST /mcp HTTP/1.1\r\nHost: localhost:3000\r\nContent-Type: application/json\r\nContent-Length: ${#mcp_request}\r\nConnection: close\r\n\r\n$mcp_request" >&4
    
    # Read response
    mcp_response=$(head -10 <&4)
    echo "📊 MCP Initialize response preview:"
    echo "$mcp_response"
    
    exec 4>&-
else
    echo "❌ Cannot connect to MCP endpoint"
fi

# Test tools/list
echo ""
echo "4. 📋 Testing tools/list..."

if exec 5<>/dev/tcp/localhost/3000; then
    echo "✅ Tools endpoint is accessible"
    
    tools_request='{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
    
    echo -e "POST /mcp HTTP/1.1\r\nHost: localhost:3000\r\nContent-Type: application/json\r\nContent-Length: ${#tools_request}\r\nConnection: close\r\n\r\n$tools_request" >&5
    
    tools_response=$(head -20 <&5)
    echo "📊 Tools list response:"
    echo "$tools_response"
    
    exec 5>&-
else
    echo "❌ Cannot connect to tools endpoint"
fi

echo ""
echo "🎉 MCP Server CLI testing completed!"
echo ""
echo "💡 Note: This is a basic connectivity test. For full MCP protocol testing,"
echo "   you would typically use the official MCP Inspector CLI tool."
echo ""
echo "📋 Available test commands you can run manually:"
echo "   - Health check: curl http://localhost:3000/health"
echo "   - List tools: curl -X POST http://localhost:3000/mcp -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}'"
echo ""