import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

import {
  docsFallbackResources,
  KnowledgeResourceError,
  listKnowledgeResources,
  listKnowledgeResourceTemplates,
  readKnowledgeResource,
  SEARCH_TOOL,
  SEARCH_TOOL_NAME,
  searchGgactionText
} from "./adapter.js";

const SERVER_INFO = Object.freeze({ name: "ggaction", version: "1.0.0" });

function toolError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text", text: JSON.stringify({ error: message }) }],
    isError: true
  };
}

function validateToolArguments(args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw new TypeError("search_ggaction arguments must be an object with one query string.");
  }
  const names = Object.keys(args);
  if (names.length !== 1 || names[0] !== "query") {
    throw new TypeError("search_ggaction accepts exactly one argument: query.");
  }
  return args.query;
}

export function createGgactionMcpServer() {
  const server = new Server(SERVER_INFO, {
    capabilities: { tools: {}, resources: {} },
    instructions: "Call search_ggaction once with only the exact user task; do not append dataset contents, code scaffolding, or evaluator instructions. Use authoring imports, initialization, and immutable steps in order. Read a docs resource only when that call reports unresolved constraints and recommends the section. The server is read-only and does not execute chart code."
  });
  let allowedDocs = new Set();

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [SEARCH_TOOL]
  }));

  server.setRequestHandler(CallToolRequestSchema, async request => {
    if (request.params.name !== SEARCH_TOOL_NAME) {
      throw new McpError(ErrorCode.InvalidParams, `Unknown tool: ${request.params.name}`);
    }
    try {
      const query = validateToolArguments(request.params.arguments);
      const text = searchGgactionText(query);
      const packet = JSON.parse(text);
      allowedDocs = new Set(docsFallbackResources(packet).map(resource => resource.uri));
      return { content: [{ type: "text", text }] };
    } catch (error) {
      allowedDocs = new Set();
      return toolError(error);
    }
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: listKnowledgeResources()
  }));

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: listKnowledgeResourceTemplates()
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async request => {
    try {
      const resource = readKnowledgeResource(request.params.uri, {
        allowedDocs: [...allowedDocs]
      });
      return { contents: [resource] };
    } catch (error) {
      if (error instanceof KnowledgeResourceError) {
        throw new McpError(ErrorCode.InvalidParams, error.message);
      }
      throw error;
    }
  });

  return server;
}

export async function runGgactionMcpServer() {
  const server = createGgactionMcpServer();
  await server.connect(new StdioServerTransport());
  return server;
}
