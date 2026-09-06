import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { searchGgaction } from "../../knowledge/task-resolver.js";

const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
const cardsArtifact = JSON.parse(readFileSync(
  path.join(packageRoot, "knowledge/action-cards.json"),
  "utf8"
));
const resourcesArtifact = JSON.parse(readFileSync(
  path.join(packageRoot, "knowledge/mcp-resources.json"),
  "utf8"
));

const cards = new Map(cardsArtifact.cards.map(card => [card.name, card]));
const recipes = new Map(resourcesArtifact.recipes.map(recipe => [recipe.id, recipe]));
const docs = new Map(resourcesArtifact.docs.map(section => [section.id, section]));

function unique(values) {
  return [...new Set(values)];
}

export const SEARCH_TOOL_NAME = "search_ggaction";
export const OVERVIEW_URI = "ggaction://overview";

export const SEARCH_TOOL = Object.freeze({
  name: SEARCH_TOOL_NAME,
  title: "Search ggaction authoring knowledge",
  description: "Resolve one complete ggaction chart request into a bounded ordered task packet with exact imports, authoring prerequisites, syntax-valid immutable steps, applied options, explicit placeholders and unmatched requirements, terminal unsupported constraints, and unresolved decisions.",
  inputSchema: Object.freeze({
    type: "object",
    additionalProperties: false,
    required: ["query"],
    properties: Object.freeze({
      query: Object.freeze({
        type: "string",
        minLength: 1,
        maxLength: 500,
        description: "The exact user chart-authoring request, including chart, encodings, guides, layout, and output format. Do not append dataset contents, code scaffolding, or evaluator instructions."
      })
    })
  }),
  annotations: Object.freeze({
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
  })
});

export class KnowledgeResourceError extends Error {
  constructor(message) {
    super(message);
    this.name = "KnowledgeResourceError";
  }
}

function jsonResource(uri, value) {
  return Object.freeze({
    uri,
    mimeType: "application/json",
    text: JSON.stringify(value)
  });
}

function markdownResource(uri, value) {
  return Object.freeze({
    uri,
    mimeType: "text/markdown",
    text: `${value.text}\n\nCanonical public route: ${value.route}`
  });
}

function encodedUri(owner, id) {
  return `ggaction://${owner}/${encodeURIComponent(id)}`;
}

function parseResourceUri(uri) {
  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new KnowledgeResourceError(`Invalid knowledge resource URI: ${uri}`);
  }
  if (parsed.protocol !== "ggaction:" || parsed.search || parsed.hash) {
    throw new KnowledgeResourceError(`Unsupported knowledge resource URI: ${uri}`);
  }
  const segments = parsed.pathname.split("/").filter(Boolean);
  return { owner: parsed.hostname, segments };
}

export function searchGgactionText(query) {
  return JSON.stringify(searchGgaction(query));
}

export function docsFallbackResources(packet) {
  if (!packet || !Array.isArray(packet.unresolved) || packet.unresolved.length === 0) {
    return [];
  }
  for (const entry of packet.unresolved) {
    if (!Array.isArray(entry.resources) || entry.resources.length === 0) {
      throw new KnowledgeResourceError(
        `Unresolved constraint ${entry.constraint ?? "unknown"} has no explicit documentation resource.`
      );
    }
  }
  const resources = unique(packet.unresolved.flatMap(entry => entry.resources));
  return resources.map(uri => {
    const { owner, segments } = parseResourceUri(uri);
    if (owner !== "docs" || segments.length !== 1) {
      throw new KnowledgeResourceError(`Invalid unresolved documentation resource: ${uri}`);
    }
    const id = decodeURIComponent(segments[0]);
    const section = docs.get(id);
    if (!section) {
      throw new KnowledgeResourceError(`Unknown unresolved documentation resource: ${uri}`);
    }
    return Object.freeze({
      uri,
      name: section.title,
      description: `Read only for the unresolved constraint; public route ${section.route}.`,
      mimeType: "text/markdown"
    });
  });
}

export function listKnowledgeResources() {
  return [
    Object.freeze({
      uri: OVERVIEW_URI,
      name: resourcesArtifact.overview.title,
      description: "Small MCP-first routing instructions; no complete documentation preload.",
      mimeType: "application/json"
    }),
    ...resourcesArtifact.recipes.map(recipe => Object.freeze({
      uri: encodedUri("recipes", recipe.id),
      name: recipe.title,
      description: recipe.summary,
      mimeType: "application/json"
    }))
  ];
}

export function listKnowledgeResourceTemplates() {
  return [
    Object.freeze({
      uriTemplate: "ggaction://actions/{name}",
      name: "Exact compact action card",
      description: "Read one exact action card by current public action name.",
      mimeType: "application/json"
    }),
    Object.freeze({
      uriTemplate: "ggaction://docs/{section}",
      name: "Unresolved-only bounded documentation section",
      description: "Read only a section recommended by the latest search_ggaction unresolved result.",
      mimeType: "text/markdown"
    })
  ];
}

export function readKnowledgeResource(uri, { allowedDocs = [] } = {}) {
  if (uri === OVERVIEW_URI) {
    return jsonResource(uri, {
      schemaVersion: resourcesArtifact.schemaVersion,
      packageVersion: resourcesArtifact.packageVersion,
      title: resourcesArtifact.overview.title,
      text: resourcesArtifact.overview.text
    });
  }

  const { owner, segments } = parseResourceUri(uri);
  if (segments.length !== 1) {
    throw new KnowledgeResourceError(`Unknown knowledge resource URI: ${uri}`);
  }
  const id = decodeURIComponent(segments[0]);
  if (owner === "actions") {
    const card = cards.get(id);
    if (!card) throw new KnowledgeResourceError(`Unknown ggaction action: ${id}`);
    return jsonResource(uri, card);
  }
  if (owner === "recipes") {
    const recipe = recipes.get(id);
    if (!recipe) throw new KnowledgeResourceError(`Unknown ggaction recipe: ${id}`);
    return jsonResource(uri, {
      schemaVersion: resourcesArtifact.schemaVersion,
      packageVersion: resourcesArtifact.packageVersion,
      ...recipe,
      packet: searchGgaction(recipe.query)
    });
  }
  if (owner === "docs") {
    if (!new Set(allowedDocs).has(uri)) {
      throw new KnowledgeResourceError(
        "Documentation resources are available only when recommended by the latest unresolved search result."
      );
    }
    const section = docs.get(id);
    if (!section) throw new KnowledgeResourceError(`Unknown docs fallback section: ${id}`);
    return markdownResource(uri, section);
  }
  throw new KnowledgeResourceError(`Unknown knowledge resource URI: ${uri}`);
}

if (cardsArtifact.schemaVersion !== 3 || resourcesArtifact.schemaVersion !== 2) {
  throw new Error("MCP action cards must use schemaVersion 3 and resources must use schemaVersion 2.");
}
if (resourcesArtifact.packageVersion !== cardsArtifact.packageVersion) {
  throw new Error("MCP action cards and resources must use one packageVersion.");
}
