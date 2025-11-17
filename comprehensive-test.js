#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

async function comprehensiveMcpTest() {
  console.log("🚀 Starting Comprehensive MCP Server Test...");

  try {
    // Create client
    const client = new Client({
      name: "comprehensive-test-client",
      version: "1.0.0",
    }, {
      capabilities: {
        tools: {},
      },
    });

    // Create HTTP transport with authentication
    const serverUrl = new URL("http://localhost:30000/mcp");
    const transport = new StreamableHTTPClientTransport(serverUrl, {
      requestInit: {
        headers: {
          "Authorization": "Basic " +
            Buffer.from(
              "b18b935c-1551-4b6f-b70c-4d6a3e833adf:8tn6y2o8hthggug600eswffzpo5bke",
            ).toString("base64"),
        },
      },
    });

    await client.connect(transport);
    console.log("✅ Connected to MCP server successfully");

    // Test 1: List programs
    console.log("\n📋 Test 1: List Programs");
    const listResult = await client.callTool({
      name: "list_programs",
      arguments: {},
    });

    if (listResult.content && listResult.content.length > 0) {
      const content = listResult.content[0];
      if (content.type === "text") {
        console.log("✅ Programs listed successfully");
        console.log(content.text);
      }
    }

    // Test 2: Get detailed program info for first running program
    console.log("\n📋 Test 2: Get Program Info");
    try {
      const infoResult = await client.callTool({
        name: "get_program_info",
        arguments: {
          name: "intelligentanalysis-api", // Use a known program name
        },
      });

      if (infoResult.content && infoResult.content.length > 0) {
        const content = infoResult.content[0];
        if (content.type === "text") {
          console.log("✅ Program info retrieved:");
          console.log(content.text);
        }
      }
    } catch (error) {
      console.error("❌ Error getting program info:", error.message);
    }

    // Test 3: Read program log
    console.log("\n📋 Test 3: Read Program Log");
    try {
      const logResult = await client.callTool({
        name: "read_log",
        arguments: {
          name: "intelligentanalysis-api",
          logType: "stdout",
          offset: 0,
          length: 20,
        },
      });

      if (logResult.content && logResult.content.length > 0) {
        const content = logResult.content[0];
        if (content.type === "text") {
          console.log("✅ Program log retrieved:");
          console.log(content.text.substring(0, 500) + "...");
        }
      }
    } catch (error) {
      console.error("❌ Error reading program log:", error.message);
    }

    // Test 4: Get configuration
    console.log("\n📋 Test 4: Get Configuration");
    try {
      const configResult = await client.callTool({
        name: "get_config",
        arguments: {
          section: "supervisord",
        },
      });

      if (configResult.content && configResult.content.length > 0) {
        const content = configResult.content[0];
        if (content.type === "text") {
          console.log("✅ Configuration retrieved:");
          console.log(content.text);
        }
      }
    } catch (error) {
      console.error("❌ Error getting configuration:", error.message);
    }

    // Test 5: Test process stop/start (with a safe program)
    console.log("\n📋 Test 5: Process Management");
    try {
      // First check status
      const statusResult = await client.callTool({
        name: "get_program_status",
        arguments: {
          name: "intelligentanalysis-api",
        },
      });

      if (statusResult.content && statusResult.content.length > 0) {
        const content = statusResult.content[0];
        if (content.type === "text") {
          console.log("✅ Program status retrieved:");
          console.log(content.text);
        }
      }
    } catch (error) {
      console.error("❌ Error getting program status:", error.message);
    }

    // Test 6: Test signal sending
    console.log("\n📋 Test 6: Signal Sending");
    try {
      const signalResult = await client.callTool({
        name: "send_signal",
        arguments: {
          name: "intelligentanalysis-api",
          signal: "SIGHUP",
        },
      });

      if (signalResult.content && signalResult.content.length > 0) {
        const content = signalResult.content[0];
        if (content.type === "text") {
          console.log("✅ Signal sent successfully:");
          console.log(content.text);
        }
      }
    } catch (error) {
      console.error("⚠️ Signal sending test (may fail on Windows):", error.message);
    }

    await client.close();
    console.log("\n🎉 Comprehensive MCP test completed!");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

// Run the comprehensive test
comprehensiveMcpTest();