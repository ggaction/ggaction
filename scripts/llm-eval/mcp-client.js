import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const executable = fileURLToPath(new URL("../../bin/ggaction-mcp.js", import.meta.url));

export function createLocalMcpKnowledgeClient({
  command = process.execPath,
  args = [executable],
  cwd = root,
  artifact = null
} = {}) {
  let client;
  let transport;
  let connecting;
  let startupStartedAt;
  let startupDurationMs;
  const operations = {
    initialize: 0,
    listResources: 0,
    listResourceTemplates: 0,
    listTools: 0,
    readResource: 0,
    callTool: 0
  };

  const count = name => {
    operations[name] += 1;
  };

  const snapshot = () => Object.freeze({
    ...operations,
    total: Object.values(operations).reduce((sum, value) => sum + value, 0)
  });

  async function connection() {
    if (client) return client;
    if (!connecting) {
      connecting = (async () => {
        startupStartedAt = Date.now();
        transport = new StdioClientTransport({ command, args, cwd, stderr: "pipe" });
        const next = new Client({ name: "ggaction-evaluation", version: "1.0.0" });
        count("initialize");
        await next.connect(transport);
        startupDurationMs = Date.now() - startupStartedAt;
        client = next;
        return next;
      })();
    }
    return connecting;
  }

  async function callTool(name, arguments_) {
    count("callTool");
    const result = await (await connection()).callTool({ name, arguments: arguments_ });
    if (result.isError) throw new Error(result.content?.[0]?.text ?? `MCP tool ${name} failed.`);
    const text = result.content?.find(item => item.type === "text")?.text;
    if (typeof text !== "string") throw new Error(`MCP tool ${name} returned no text content.`);
    return text;
  }

  return Object.freeze({
    async discover() {
      const connected = await connection();
      count("listResources");
      count("listResourceTemplates");
      count("listTools");
      const [resources, templates, tools] = await Promise.all([
        connected.listResources(),
        connected.listResourceTemplates(),
        connected.listTools()
      ]);
      return Object.freeze({
        server: connected.getServerVersion(),
        instructions: connected.getInstructions(),
        resources: Object.freeze(resources.resources),
        resourceTemplates: Object.freeze(templates.resourceTemplates),
        tools: Object.freeze(tools.tools)
      });
    },
    callTool,
    async read(uri) {
      count("readResource");
      const result = await (await connection()).readResource({ uri });
      const text = result.contents?.find(item => "text" in item)?.text;
      if (typeof text !== "string") throw new Error(`MCP resource ${uri} returned no text content.`);
      return text;
    },
    operationSnapshot: snapshot,
    lifecycleSnapshot() {
      return Object.freeze({
        connected: client !== undefined,
        startupStartedAt: startupStartedAt ?? null,
        startupDurationMs: startupDurationMs ?? null,
        artifact
      });
    },
    async close() {
      await client?.close();
      client = undefined;
      connecting = undefined;
      transport = undefined;
    }
  });
}
