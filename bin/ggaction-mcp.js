#!/usr/bin/env node

import { startGgactionMcpServer } from "../mcp/server.js";

try {
  await startGgactionMcpServer();
} catch (error) {
  process.stderr.write(`ggaction-mcp failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
