import { createRequire } from "node:module";

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { knowledgeOverview, readKnowledge, searchKnowledge } from "./knowledge.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

const jsonResource = (uri, value) => ({
  contents: [{
    uri: uri.href,
    mimeType: "application/json",
    text: JSON.stringify(value)
  }]
});

function knowledgeTemplate(pattern) {
  return new ResourceTemplate(pattern, { list: undefined });
}

export function createGgactionMcpServer() {
  const server = new McpServer(
    { name: "ggaction", version },
    {
      instructions: "Search once for the chart task. Read the best matching primary action or recipe and, only when a composite task clearly needs another chart family, read at most one dependency recipe in the same model response. Then write public ggaction code without another search or resource read. This server is read-only and does not execute or render charts."
    }
  );

  server.registerResource(
    "ggaction-overview",
    "ggaction://overview",
    {
      title: "ggaction Knowledge Overview",
      description: "Routing instructions, available knowledge resources, counts, and bounded search limits.",
      mimeType: "application/json"
    },
    async uri => jsonResource(uri, await knowledgeOverview())
  );

  server.registerResource(
    "ggaction-action",
    knowledgeTemplate("ggaction://actions/{name}"),
    {
      title: "ggaction Action Knowledge",
      description: "Self-contained signatures, option types, call example, and structured metadata for one public or extension action.",
      mimeType: "application/json"
    },
    async (uri, { name }) => jsonResource(uri, await readKnowledge({ kind: "action", id: name }))
  );

  server.registerResource(
    "ggaction-recipe",
    knowledgeTemplate("ggaction://recipes/{id}"),
    {
      title: "ggaction Task Recipe",
      description: "Ordered actions, alternatives, pitfalls, and public JavaScript source for one chart task.",
      mimeType: "application/json"
    },
    async (uri, { id }) => jsonResource(uri, await readKnowledge({ kind: "recipe", id }))
  );

  server.registerResource(
    "ggaction-docs",
    knowledgeTemplate("ggaction://docs/{section}"),
    {
      title: "ggaction Documentation Router",
      description: "One bounded LLM documentation section: overview, actions, recipes, or docs.",
      mimeType: "application/json"
    },
    async (uri, { section }) => jsonResource(uri, await readKnowledge({ kind: "docs", id: section }))
  );

  server.registerTool(
    "search_ggaction",
    {
      title: "Search ggaction Knowledge",
      description: "Search bounded action, recipe, and documentation knowledge using deterministic local ranking.",
      inputSchema: z.strictObject({
        query: z.string().min(1).max(500).describe("A chart task, capability, lifecycle operation, or exact action name."),
        limit: z.number().int().min(1).max(10).optional().describe("Maximum ranked results; defaults to 6.")
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ query, limit }) => {
      const results = await searchKnowledge({ query, ...(limit === undefined ? {} : { limit }) });
      return { content: [{ type: "text", text: JSON.stringify(results) }] };
    }
  );

  return server;
}

export async function startGgactionMcpServer() {
  const server = createGgactionMcpServer();
  await server.connect(new StdioServerTransport());
  return server;
}
