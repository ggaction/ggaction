#!/usr/bin/env node

try {
  const { runGgactionMcpServer } = await import("./server.js");
  await runGgactionMcpServer();
} catch (error) {
  const message = error.code === "ERR_MODULE_NOT_FOUND" &&
    error.message.includes("@modelcontextprotocol/sdk")
    ? "MCP requires @modelcontextprotocol/sdk. Install it with: npm install ggaction @modelcontextprotocol/sdk"
    : error instanceof Error ? error.message : String(error);
  process.stderr.write(`ggaction MCP failed: ${message}\n`);
  process.exitCode = 1;
}
