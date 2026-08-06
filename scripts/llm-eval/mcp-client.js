import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const executable = fileURLToPath(new URL("../../bin/ggaction-mcp.js", import.meta.url));

export function createLocalMcpKnowledgeClient({
  command = process.execPath,
  args = [executable],
  cwd = root
} = {}) {
  let client;
  let transport;
  let connecting;

  async function connection() {
    if (client) return client;
    if (!connecting) {
      connecting = (async () => {
        transport = new StdioClientTransport({ command, args, cwd, stderr: "pipe" });
        const next = new Client({ name: "ggaction-evaluation", version: "1.0.0" });
        await next.connect(transport);
        client = next;
        return next;
      })();
    }
    return connecting;
  }

  return Object.freeze({
    async search({ query, limit }) {
      const result = await (await connection()).callTool({
        name: "search_ggaction",
        arguments: { query, ...(limit === undefined ? {} : { limit }) }
      });
      if (result.isError) throw new Error(result.content?.[0]?.text ?? "MCP search failed.");
      const text = result.content?.find(item => item.type === "text")?.text;
      if (typeof text !== "string") throw new Error("MCP search returned no text content.");
      return text;
    },
    async read(uri) {
      const result = await (await connection()).readResource({ uri });
      const text = result.contents?.find(item => "text" in item)?.text;
      if (typeof text !== "string") throw new Error(`MCP resource ${uri} returned no text content.`);
      return text;
    },
    async close() {
      await client?.close();
      client = undefined;
      connecting = undefined;
      transport = undefined;
    }
  });
}
