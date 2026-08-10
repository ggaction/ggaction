#!/usr/bin/env node

import { runGgactionMcpServer } from "./server.js";

try {
  await runGgactionMcpServer();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`ggaction MCP failed: ${message}\n`);
  process.exitCode = 1;
}
