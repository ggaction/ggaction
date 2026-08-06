import { readKnowledge, searchKnowledge } from "../knowledge-search.js";
import { readCurrentDoc, searchCurrentDocs } from "./current-docs.js";

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

const structuredKnowledgeTools = Object.freeze([
  {
    type: "function",
    name: "search_ggaction",
    description: "Search bounded structured ggaction action, recipe, and documentation knowledge.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["query"],
      properties: { query: { type: "string", minLength: 1, maxLength: 500 } }
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
    tools: structuredKnowledgeTools,
    instruction: "Use only public ggaction APIs found through the provided structured-knowledge tools.",
    routingLabel: "Structured ggaction knowledge overview",
    async routingText() {
      return JSON.stringify(await readKnowledge({ kind: "docs", id: "overview" }));
    },
    async handle(call) {
      const args = JSON.parse(call.arguments);
      if (call.name === "search_ggaction") return JSON.stringify(await searchKnowledge({ query: args.query }));
      if (call.name === "read_ggaction") return JSON.stringify(await readKnowledge({ kind: args.kind, id: args.id }));
      throw new Error(`Unknown structured-knowledge tool ${call.name}.`);
    }
  });
}
