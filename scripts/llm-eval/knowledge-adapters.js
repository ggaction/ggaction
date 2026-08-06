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
    strict: true,
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
    instruction: "Use only public ggaction APIs. The current-doc tools remain available; prefer one structured search and one exact structured read when they directly match the task.",
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
  const resourceUri = ({ kind, id }) => {
    const families = { action: "actions", recipe: "recipes", docs: "docs" };
    if (!(kind in families)) throw new TypeError("MCP knowledge kind must be action, recipe, or docs.");
    if (typeof id !== "string" || !/^[A-Za-z][A-Za-z0-9-]*$/.test(id)) {
      throw new TypeError("MCP knowledge ID is invalid.");
    }
    return `ggaction://${families[kind]}/${id}`;
  };
  return Object.freeze({
    condition: "C",
    mode: "local-mcp",
    commit,
    tools: structuredKnowledgeTools,
    instruction: "Use only public ggaction APIs found through the provided local MCP knowledge tools.",
    routingLabel: "Local ggaction MCP overview resource",
    routingText() {
      return mcp.read("ggaction://overview");
    },
    async handle(call) {
      const args = JSON.parse(call.arguments);
      if (call.name === "search_ggaction") return mcp.search(args);
      if (call.name === "read_ggaction") return mcp.read(resourceUri(args));
      throw new Error(`Unknown local MCP knowledge tool ${call.name}.`);
    },
    close() {
      return mcp.close();
    }
  });
}
