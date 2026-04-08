import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function runTest() {
  console.log("🚀 Testing recently published npx ai-model-advisor-mcp@latest...");
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "ai-model-advisor-mcp@latest"]
  });

  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  console.log("🔌 Connecting to MCP Server...");
  await client.connect(transport);

  console.log("🛠️  Fetching tools...");
  const tools = await client.listTools();
  console.log(`✅ Server exposes ${tools.tools.length} tools`);
  const toolNames = tools.tools.map(t => t.name);
  console.log(`   Tools: ${toolNames.join(", ")}`);
  
  if (!toolNames.includes("find_cheapest_provider")) {
    throw new Error("Missing 'find_cheapest_provider' tool!");
  }

  console.log("🤖 Asking server for pricing of 'openai/gpt-4o'...");
  const result = await client.callTool({
    name: "get_model_info",
    arguments: { model_id: "openai/gpt-4o" }
  });

  const text = result.content[0].text;
  if (!text || !text.includes("GPT-4o")) {
    throw new Error("Tool call failed or returned unexpected response.");
  }
  
  console.log("✅ Tool executed successfully! Response preview:");
  console.log(text.split('\n').slice(0, 4).join('\n'));

  // Disconnect
  await transport.close();
  console.log("\n🎉 ALL TESTS PASSED! The npm package works flawlessly.");
}

runTest().catch((e) => {
  console.error("❌ Test failed:", e);
  process.exit(1);
});
