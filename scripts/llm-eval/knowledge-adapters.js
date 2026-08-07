import { readKnowledge, searchKnowledge } from "../knowledge-search.js";
import { readCurrentDoc, searchCurrentDocs } from "./current-docs.js";
import { createLocalMcpKnowledgeClient } from "./mcp-client.js";

const startingCommit = "9414d07179c9e7c6bbfdf00b762fc35de0ff25ec";

const currentDocTools = Object.freeze([
  {
    type: "function",
    name: "search_docs",
    description: "Search the current public ggaction documentation and return a small ranked list of routes and summaries.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["query"],
      properties: { query: { type: "string", minLength: 1 } }
    }
  },
  {
    type: "function",
    name: "read_doc",
    description: "Read one current public ggaction documentation route. Use routes returned by search_docs or docs/llms.txt.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["route"],
      properties: { route: { type: "string", minLength: 1 } }
    }
  }
]);

export const structuredKnowledgeTools = Object.freeze([
  {
    type: "function",
    name: "search_ggaction",
    description: "Search bounded structured ggaction action, recipe, and documentation knowledge.",
    strict: false,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["query"],
      properties: {
        query: { type: "string", minLength: 1, maxLength: 500 },
        limit: { type: "integer", minimum: 1, maximum: 10 }
      }
    }
  },
  {
    type: "function",
    name: "read_ggaction",
    description: "Read one exact action, recipe, or documentation record returned by search_ggaction.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["kind", "id"],
      properties: {
        kind: { enum: ["action", "recipe", "docs"] },
        id: { type: "string", pattern: "^[A-Za-z][A-Za-z0-9-]*$" }
      }
    }
  }
]);

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function resourceTemplatePattern(template) {
  if (typeof template !== "string" || !template.startsWith("ggaction://")) {
    throw new Error("Condition C only accepts discovered ggaction resource templates.");
  }
  const placeholder = /\{[A-Za-z][A-Za-z0-9]*\}/gu;
  let source = "^";
  let cursor = 0;
  let match;
  while ((match = placeholder.exec(template)) !== null) {
    source += escapeRegularExpression(template.slice(cursor, match.index));
    source += "[A-Za-z][A-Za-z0-9-]*";
    cursor = match.index + match[0].length;
  }
  source += `${escapeRegularExpression(template.slice(cursor))}$`;
  return source;
}

function discoveredMcpSurface(discovery) {
  if (typeof discovery.instructions !== "string" || discovery.instructions.length === 0) {
    throw new Error("The local MCP server did not advertise instructions.");
  }
  const tools = discovery.tools.map(tool => {
    if (
      typeof tool.name !== "string" ||
      typeof tool.description !== "string" ||
      tool.inputSchema?.type !== "object" ||
      tool.annotations?.readOnlyHint !== true
    ) {
      throw new Error("Condition C requires discovered read-only MCP tools with descriptions and object schemas.");
    }
    const propertyNames = Object.keys(tool.inputSchema.properties ?? {});
    const required = new Set(tool.inputSchema.required ?? []);
    return Object.freeze({
      type: "function",
      name: tool.name,
      description: tool.description,
      strict: tool.inputSchema.additionalProperties === false &&
        propertyNames.every(name => required.has(name)),
      parameters: tool.inputSchema
    });
  });
  const templates = discovery.resourceTemplates.filter(template =>
    typeof template.uriTemplate === "string" && template.uriTemplate.startsWith("ggaction://")
  );
  if (tools.length === 0 || templates.length === 0) {
    throw new Error("The local MCP server must advertise a search tool and ggaction resource templates.");
  }
  const patternSources = templates.map(template => resourceTemplatePattern(template.uriTemplate));
  const readTool = Object.freeze({
    type: "function",
    name: "read_mcp_resource",
    description: `Read one exact resource advertised by the local MCP server. Allowed templates: ${templates.map(template => template.uriTemplate).join(", ")}`,
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["uri"],
      properties: {
        uri: { type: "string", pattern: `(?:${patternSources.join("|")})` }
      }
    }
  });
  const overview = discovery.resources.find(resource => resource.uri === "ggaction://overview");
  if (!overview) throw new Error("The local MCP server did not advertise ggaction://overview.");
  return Object.freeze({
    discovery,
    tools: Object.freeze([...tools, readTool]),
    toolNames: new Set(tools.map(tool => tool.name)),
    resourcePatterns: Object.freeze(patternSources.map(source => new RegExp(source, "u"))),
    overview
  });
}

export const conditionAKnowledge = Object.freeze({
  condition: "A",
  mode: "current-docs",
  commit: startingCommit,
  tools: currentDocTools,
  instruction: "Use only public ggaction APIs documented through the provided current-doc tools.",
  routingLabel: "Current ggaction documentation routing index",
  async routingText() {
    return (await readCurrentDoc("llms.txt")).text;
  },
  async handle(call) {
    const args = JSON.parse(call.arguments);
    if (call.name === "search_docs") return JSON.stringify(await searchCurrentDocs(args.query));
    if (call.name === "read_doc") return JSON.stringify(await readCurrentDoc(args.route));
    throw new Error(`Unknown current-doc knowledge tool ${call.name}.`);
  }
});

export function conditionBKnowledge(commit) {
  if (typeof commit !== "string" || !/^[0-9a-f]{40}$/.test(commit)) {
    throw new TypeError("Condition B knowledge commit must be an exact 40-character lowercase Git SHA.");
  }
  return Object.freeze({
    condition: "B",
    mode: "structured-knowledge",
    commit,
    tools: Object.freeze([...currentDocTools, ...structuredKnowledgeTools]),
    instruction: "Use only public ggaction APIs. Search structured knowledge once. Read the best matching primary action or recipe and, only when a composite task clearly needs another chart family, read at most one dependency recipe in the same model response. Then submit without another structured search or read. The current-doc tools remain available.",
    routingLabel: "Current ggaction documentation routing index followed by the structured knowledge overview",
    async routingText() {
      const currentRouting = (await readCurrentDoc("llms.txt")).text;
      const structuredOverview = JSON.stringify(await readKnowledge({ kind: "docs", id: "overview" }));
      return `${currentRouting}\n\n--- Structured knowledge overview ---\n${structuredOverview}`;
    },
    async handle(call) {
      const args = JSON.parse(call.arguments);
      if (call.name === "search_docs") return JSON.stringify(await searchCurrentDocs(args.query));
      if (call.name === "read_doc") return JSON.stringify(await readCurrentDoc(args.route));
      if (call.name === "search_ggaction") {
        return JSON.stringify(await searchKnowledge({ query: args.query, limit: args.limit }));
      }
      if (call.name === "read_ggaction") return JSON.stringify(await readKnowledge({ kind: args.kind, id: args.id }));
      throw new Error(`Unknown structured-knowledge tool ${call.name}.`);
    }
  });
}

export function conditionCKnowledge(commit, clientOptions) {
  if (typeof commit !== "string" || !/^[0-9a-f]{40}$/.test(commit)) {
    throw new TypeError("Condition C knowledge commit must be an exact 40-character lowercase Git SHA.");
  }
  const mcp = createLocalMcpKnowledgeClient(clientOptions);
  let surface;
  const initialize = async () => {
    surface ??= discoveredMcpSurface(await mcp.discover());
    return surface;
  };
  return Object.freeze({
    condition: "C",
    mode: "local-mcp",
    commit,
    get tools() {
      if (!surface) throw new Error("Condition C MCP discovery must finish before reading its tools.");
      return surface.tools;
    },
    instruction: "Use only public ggaction APIs found through the discovered local MCP surface. Search once. Read the best matching primary action or recipe and, only when a composite task clearly needs another chart family, read at most one dependency recipe in the same model response. Then submit without another search or resource read.",
    routingLabel: "Discovered local ggaction MCP instructions, catalog, and overview resource",
    initialize,
    async routingText() {
      const current = await initialize();
      const overviewText = await mcp.read(current.overview.uri);
      return JSON.stringify({
        server: current.discovery.server,
        instructions: current.discovery.instructions,
        tools: current.discovery.tools,
        resources: current.discovery.resources,
        resourceTemplates: current.discovery.resourceTemplates,
        overview: JSON.parse(overviewText)
      });
    },
    async handle(call) {
      const current = await initialize();
      const args = JSON.parse(call.arguments);
      if (current.toolNames.has(call.name)) return mcp.callTool(call.name, args);
      if (call.name === "read_mcp_resource") {
        if (
          typeof args.uri !== "string" ||
          !current.resourcePatterns.some(pattern => pattern.test(args.uri))
        ) {
          throw new TypeError("MCP resource URI must match a discovered ggaction resource template.");
        }
        return mcp.read(args.uri);
      }
      throw new Error(`Unknown local MCP knowledge tool ${call.name}.`);
    },
    close() {
      return mcp.close();
    }
  });
}
