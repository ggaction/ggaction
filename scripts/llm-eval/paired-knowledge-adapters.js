import { isDeepStrictEqual } from "node:util";

import { readKnowledge, searchKnowledge } from "../knowledge-search.js";
import { readCurrentDoc, searchCurrentDocs } from "./current-docs.js";

const conditions = new Set(["A", "B", "C", "D"]);
const commitPattern = /^[0-9a-f]{40}$/u;
const resourcePattern = /^ggaction:\/\/(actions|recipes|docs)\/([A-Za-z][A-Za-z0-9-]*)$/u;

export const currentDocumentationTools = Object.freeze([
  Object.freeze({
    type: "function",
    name: "search_docs",
    description: "Search the pinned public ggaction documentation and return bounded routes and summaries.",
    strict: true,
    parameters: Object.freeze({
      type: "object",
      additionalProperties: false,
      required: Object.freeze(["query"]),
      properties: Object.freeze({ query: Object.freeze({ type: "string", minLength: 1 }) })
    })
  }),
  Object.freeze({
    type: "function",
    name: "read_doc",
    description: "Read one route from the pinned public ggaction documentation snapshot.",
    strict: true,
    parameters: Object.freeze({
      type: "object",
      additionalProperties: false,
      required: Object.freeze(["route"]),
      properties: Object.freeze({ route: Object.freeze({ type: "string", minLength: 1 }) })
    })
  })
]);

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function templatePattern(template) {
  if (typeof template !== "string" || !template.startsWith("ggaction://")) {
    throw new Error("Structured knowledge accepts only discovered ggaction resource templates.");
  }
  const placeholder = /\{[A-Za-z][A-Za-z0-9]*\}/gu;
  let source = "^";
  let cursor = 0;
  for (const match of template.matchAll(placeholder)) {
    source += escapeRegularExpression(template.slice(cursor, match.index));
    source += "[A-Za-z][A-Za-z0-9-]*";
    cursor = match.index + match[0].length;
  }
  return `${source}${escapeRegularExpression(template.slice(cursor))}$`;
}

function modelTool(tool) {
  const propertyNames = Object.keys(tool.inputSchema?.properties ?? {});
  const required = new Set(tool.inputSchema?.required ?? []);
  if (
    typeof tool.name !== "string" ||
    typeof tool.description !== "string" ||
    tool.inputSchema?.type !== "object" ||
    tool.annotations?.readOnlyHint !== true
  ) throw new Error("Structured knowledge requires discovered read-only tools with object schemas.");
  return Object.freeze({
    type: "function",
    name: tool.name,
    description: tool.description,
    strict: tool.inputSchema.additionalProperties === false && propertyNames.every(name => required.has(name)),
    parameters: tool.inputSchema
  });
}

function canonicalSurface(discovery, overview) {
  if (typeof discovery.instructions !== "string" || discovery.instructions.length === 0) {
    throw new Error("The local MCP server must advertise instructions.");
  }
  const templates = discovery.resourceTemplates
    .map(template => template.uriTemplate)
    .filter(template => typeof template === "string" && template.startsWith("ggaction://"));
  const resources = discovery.resources.map(resource => resource.uri).filter(Boolean);
  if (!resources.includes("ggaction://overview") || templates.length === 0 || discovery.tools.length === 0) {
    throw new Error("The local MCP server must advertise its overview, templates, and search tool.");
  }
  const patternSources = templates.map(templatePattern);
  const tools = discovery.tools.map(modelTool);
  tools.push(Object.freeze({
    type: "function",
    name: "read_mcp_resource",
    description: `Read one exact structured resource. Allowed templates: ${templates.join(", ")}`,
    strict: true,
    parameters: Object.freeze({
      type: "object",
      additionalProperties: false,
      required: Object.freeze(["uri"]),
      properties: Object.freeze({
        uri: Object.freeze({ type: "string", pattern: `(?:${patternSources.join("|")})` })
      })
    })
  }));
  const routing = Object.freeze({
    instructions: discovery.instructions,
    resources: Object.freeze(resources),
    resourceTemplates: Object.freeze(templates),
    overview
  });
  return Object.freeze({
    instructions: discovery.instructions,
    tools: Object.freeze(tools),
    routingText: JSON.stringify(routing),
    resourcePatterns: Object.freeze(patternSources.map(source => new RegExp(source, "u")))
  });
}

export async function captureStructuredKnowledgeSurface(mcp) {
  if (!mcp || typeof mcp.discover !== "function" || typeof mcp.read !== "function") {
    throw new TypeError("A local MCP client is required to capture the structured surface.");
  }
  const discovery = await mcp.discover();
  const overview = JSON.parse(await mcp.read("ggaction://overview"));
  return canonicalSurface(discovery, overview);
}

function directResource(uri, structuredKnowledge) {
  const match = uri.match(resourcePattern);
  if (!match) throw new TypeError("Structured resource URI is invalid.");
  const kind = match[1] === "actions" ? "action" : match[1] === "recipes" ? "recipe" : "docs";
  return structuredKnowledge.read({ kind, id: match[2] });
}

function zeroOperations() {
  return Object.freeze({
    initialize: 0,
    listResources: 0,
    listResourceTemplates: 0,
    listTools: 0,
    readResource: 0,
    callTool: 0,
    total: 0
  });
}

export function createPairedKnowledgeAdapter({
  condition,
  commit,
  structuredSurface,
  mcp,
  structuredKnowledge = { search: searchKnowledge, read: readKnowledge, artifact: null },
  documentation = { search: searchCurrentDocs, read: readCurrentDoc, route: "llms.txt" }
}) {
  if (!conditions.has(condition)) throw new TypeError("Paired knowledge condition must be A, B, C, or D.");
  if (!commitPattern.test(commit)) throw new TypeError("Knowledge commit must be an exact lowercase Git SHA.");
  if (condition !== "A" && structuredSurface === undefined) {
    throw new TypeError(`Condition ${condition} requires a captured structured knowledge surface.`);
  }
  if (["C", "D"].includes(condition) && mcp === undefined) {
    throw new TypeError(`Condition ${condition} requires a persistent local MCP client.`);
  }

  const includesDocs = ["A", "D"].includes(condition);
  const includesStructured = condition !== "A";
  const usesMcp = ["C", "D"].includes(condition);
  let routingText;
  let initialized = false;

  const initialize = async () => {
    if (initialized) return;
    if (usesMcp) {
      const actual = await captureStructuredKnowledgeSurface(mcp);
      if (!isDeepStrictEqual(actual, structuredSurface)) {
        throw new Error("Installed MCP model-visible surface differs from the pinned structured surface.");
      }
    }
    const parts = [];
    if (includesDocs) parts.push((await documentation.read(documentation.route)).text);
    if (includesStructured) parts.push(structuredSurface.routingText);
    routingText = parts.join("\n\n--- Structured knowledge ---\n");
    initialized = true;
  };

  const handle = async call => {
    const args = JSON.parse(call.arguments);
    if (includesDocs && call.name === "search_docs") return JSON.stringify(await documentation.search(args.query));
    if (includesDocs && call.name === "read_doc") return JSON.stringify(await documentation.read(args.route));
    if (includesStructured && call.name === "search_ggaction") {
      return usesMcp
        ? mcp.callTool(call.name, args)
        : JSON.stringify(await structuredKnowledge.search({
          query: args.query,
          ...(args.limit === undefined ? {} : { limit: args.limit })
        }));
    }
    if (includesStructured && call.name === "read_mcp_resource") {
      if (
        typeof args.uri !== "string" ||
        !structuredSurface.resourcePatterns.some(pattern => pattern.test(args.uri))
      ) throw new TypeError("Resource URI must match the pinned structured surface.");
      return usesMcp ? mcp.read(args.uri) : JSON.stringify(await directResource(args.uri, structuredKnowledge));
    }
    throw new Error(`Unknown Condition ${condition} knowledge tool ${call.name}.`);
  };

  return Object.freeze({
    condition,
    mode: Object.freeze({ A: "docs-only", B: "structured-direct", C: "structured-mcp", D: "docs-plus-mcp" })[condition],
    commit,
    tools: Object.freeze([
      ...(includesDocs ? currentDocumentationTools : []),
      ...(includesStructured ? structuredSurface.tools : [])
    ]),
    instruction: condition === "A"
      ? "Use only the pinned public ggaction documentation. Start with one search_docs call using the task's chart and layout terms. Read the most task-specific returned URL only when the search summary is insufficient; do not read generic routing pages when a task-specific result exists."
      : condition === "D"
        ? `${structuredSurface.instructions} Start with search_ggaction and use its inline primaryResource without rereading it. Read another structured resource only for a distinct missing capability. Use the pinned public documentation only when structured knowledge does not cover that capability.`
        : `${structuredSurface.instructions} Start with one search_ggaction call and use its inline primaryResource without rereading it. Read another resource only for a distinct missing capability.`,
    routingLabel: includesDocs && includesStructured
      ? "Pinned public documentation and structured knowledge routing"
      : includesDocs ? "Pinned public documentation routing" : "Pinned structured knowledge routing",
    initialize,
    async routingText() {
      await initialize();
      return routingText;
    },
    handle,
    operationSnapshot: usesMcp ? () => mcp.operationSnapshot() : zeroOperations,
    sessionSnapshot: usesMcp ? () => mcp.lifecycleSnapshot() : () => Object.freeze({
      connected: false,
      startupStartedAt: null,
      startupDurationMs: null,
      artifact: structuredKnowledge.artifact
    })
  });
}
