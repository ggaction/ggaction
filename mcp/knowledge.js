import { readFile } from "node:fs/promises";

const knowledgeFile = new URL("../knowledge/index.json", import.meta.url);
const searchIndexFile = new URL("../knowledge/search-index.json", import.meta.url);

const stopwords = new Set([
  "a", "add", "an", "and", "are", "as", "at", "be", "by", "canva", "canvas", "chart", "complete", "create", "data",
  "dataset", "for", "from", "in", "into", "is", "it", "its", "of", "on", "one", "only", "or", "per", "render",
  "row", "rows", "that", "the", "them", "this", "to", "two", "use", "using", "whose", "with"
]);
const fieldWeights = Object.freeze({ identity: 30, title: 20, summary: 8, guidance: 4, relations: 2 });
const kindPriority = Object.freeze({ recipe: 0, action: 1, docs: 2 });
const knowledgeKinds = new Set(["action", "recipe", "docs"]);
const compositionVerbs = new Set(["arrange", "combine", "compose", "concat", "concatenate"]);
const compositionLayoutTerms = new Set([
  "child", "dashboard", "gap", "horizontal", "layer", "overlay", "panel", "side", "slot", "vertical"
]);
const multiLegendTerms = new Set(["multiple", "separate"]);
const legendLayoutTerms = new Set([
  "align", "bottom", "label", "position", "spacing", "symbol", "title", "top"
]);

function canonicalWord(word) {
  const exceptions = {
    analyses: "analysis",
    aligned: "align",
    alignment: "align",
    axes: "axis",
    combine: "compose",
    combined: "compose",
    composed: "compose",
    composing: "compose",
    composition: "compose",
    derivation: "derive",
    derived: "derive",
    deriving: "derive",
    faceted: "facet",
    highlighted: "highlight",
    highlighting: "highlight",
    horizontally: "horizontal",
    selected: "select",
    selecting: "select",
    selection: "select",
    series: "series",
    vertically: "vertical"
  };
  if (exceptions[word]) return exceptions[word];
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith("s") && !/(?:ss|us|is)$/u.test(word)) return word.slice(0, -1);
  return word;
}

export function normalizeKnowledgeText(value) {
  return String(value)
    .replace(/([A-Z]+)([A-Z][a-z])/gu, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .toLowerCase()
    .replace(/\b(scatter)(plot)\b/gu, "$1 $2")
    .replace(/\b(heat)(map)\b/gu, "$1 $2")
    .replace(/\b(box|violin|gradient)(plot)\b/gu, "$1 $2")
    .match(/[a-z0-9]+/gu)
    ?.map(canonicalWord)
    .join(" ") ?? "";
}

export function hasCompositionLayoutIntent(value) {
  const normalized = normalizeKnowledgeText(value);
  const words = new Set(normalized.split(/\s+/u).filter(Boolean));
  if (words.has("facet")) return false;
  return (
    [...compositionVerbs].some(word => words.has(word)) &&
    [...compositionLayoutTerms].some(word => words.has(word))
  ) || normalized.includes("side by side");
}

export function hasMultiLegendLayoutIntent(value) {
  const normalized = normalizeKnowledgeText(value);
  const words = new Set(normalized.split(/\s+/u).filter(Boolean));
  const multiple = [...multiLegendTerms].some(word => words.has(word)) ||
    (words.has("color") && words.has("opacity"));
  return words.has("legend") && multiple &&
    [...legendLayoutTerms].some(word => words.has(word));
}

function queryTerms(query, maximumTerms) {
  const normalized = normalizeKnowledgeText(query).split(/\s+/u).filter(Boolean);
  const searchable = normalized.filter(term => !stopwords.has(term));
  const terms = searchable.length === 0 && /[a-z0-9][A-Z]/u.test(query)
    ? normalized
    : searchable;
  return [...new Set(terms)].slice(0, maximumTerms);
}

function validateSearch(options, limits) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("Knowledge search options must be an object.");
  }
  const { query, limit = limits.defaultLimit } = options;
  if (typeof query !== "string" || query.trim().length === 0) {
    throw new TypeError("Knowledge search query must be a non-empty string.");
  }
  if (query.length > limits.maximumQueryCharacters) {
    throw new RangeError(`Knowledge search query must not exceed ${limits.maximumQueryCharacters} characters.`);
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > limits.maximumLimit) {
    throw new RangeError(`Knowledge search limit must be between 1 and ${limits.maximumLimit}.`);
  }
  const terms = queryTerms(query, limits.maximumQueryTerms);
  if (terms.length === 0) throw new TypeError("Knowledge search query must contain a searchable term.");
  return { query: normalizeKnowledgeText(query), terms, limit };
}

function recordHasTerm(record, term) {
  return Object.values(record.terms).some(values => values.includes(term));
}

function rarityBonus(term, records) {
  const documentFrequency = records.filter(record => recordHasTerm(record, term)).length;
  return Math.min(36, Math.round(12 * Math.log2((records.length + 1) / (documentFrequency + 1))));
}

function scoreRecord(record, query, records) {
  const id = normalizeKnowledgeText(record.id);
  const title = normalizeKnowledgeText(record.title);
  const identity = `${record.kind} ${id} ${title}`;
  const exactIdentity = id === query.query || title === query.query;
  const exactTypedIdentity = query.query === `${record.kind} ${id}` || query.query === `${record.kind} ${title}`;
  let score = (record.priority ?? 0) + (exactIdentity || exactTypedIdentity
    ? 1000
    : identity.includes(query.query)
      ? 80
      : 0);
  const matchedTerms = [];
  for (const term of query.terms) {
    let matched = false;
    for (const [field, weight] of Object.entries(fieldWeights)) {
      if (record.terms[field].includes(term)) {
        score += weight;
        matched = true;
      }
    }
    if (matched) {
      score += rarityBonus(term, records);
      matchedTerms.push(term);
    }
  }
  if (matchedTerms.length > 0) {
    score += matchedTerms.length * 10;
    score += Math.round(20 * matchedTerms.length / query.terms.length);
  }
  if (record.kind === "recipe" && record.id === "composition" && hasCompositionLayoutIntent(query.query)) {
    score += 400;
  }
  if (
    record.kind === "recipe" &&
    record.id === "legend-title-lifecycle" &&
    hasMultiLegendLayoutIntent(query.query)
  ) {
    score += 400;
  }
  return { score, matchedTerms };
}

function result(record, scored, maximumSummaryCharacters) {
  const summary = record.summary.length > maximumSummaryCharacters
    ? `${record.summary.slice(0, maximumSummaryCharacters - 1)}…`
    : record.summary;
  return Object.freeze({
    kind: record.kind,
    id: record.id,
    title: record.title,
    summary,
    route: record.route,
    resourceUri: knowledgeResourceUri(record.kind, record.id),
    score: scored.score,
    matchedTerms: Object.freeze(scored.matchedTerms)
  });
}

function knowledgeResourceUri(kind, id) {
  if (kind === "action") return `ggaction://actions/${id}`;
  if (kind === "recipe") return `ggaction://recipes/${id}`;
  return `ggaction://docs/${id}`;
}

export async function loadKnowledgeSearchIndex() {
  return JSON.parse(await readFile(searchIndexFile, "utf8"));
}

export async function searchKnowledge(options) {
  const index = await loadKnowledgeSearchIndex();
  const query = validateSearch(options, index.limits);
  const results = index.records
    .map(record => ({ record, scored: scoreRecord(record, query, index.records) }))
    .filter(entry => entry.scored.score > 0)
    .sort((left, right) =>
      right.scored.score - left.scored.score ||
      kindPriority[left.record.kind] - kindPriority[right.record.kind] ||
      left.record.id.localeCompare(right.record.id)
    )
    .slice(0, query.limit)
    .map(entry => result(entry.record, entry.scored, index.limits.maximumSummaryCharacters));
  const primaryResource = results.length === 0
    ? null
    : await readKnowledge({ kind: results[0].kind, id: results[0].id });
  return Object.freeze({
    schemaVersion: 2,
    query: query.query,
    results: Object.freeze(results),
    primaryResource,
    nextStep: primaryResource === null
      ? "Refine the query using a concrete chart task or exact public action name."
      : "Use primaryResource as the complete knowledge for the top result. Read another result's resourceUri only when the task genuinely requires an additional capability."
  });
}

export async function readKnowledge(options) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("Knowledge read options must be an object.");
  }
  const { kind, id } = options;
  if (!knowledgeKinds.has(kind)) throw new TypeError("Knowledge kind must be action, recipe, or docs.");
  if (typeof id !== "string" || !/^[A-Za-z][A-Za-z0-9-]*$/u.test(id)) {
    throw new TypeError("Knowledge ID is invalid.");
  }
  const [index, knowledge] = await Promise.all([
    loadKnowledgeSearchIndex(),
    readFile(knowledgeFile, "utf8").then(JSON.parse)
  ]);
  const searchRecord = index.records.find(record => record.kind === kind && record.id === id);
  if (!searchRecord) throw new Error(`Unknown ${kind} knowledge ID "${id}".`);
  let value;
  if (kind === "action") value = knowledge.actions.find(action => action.name === id);
  if (kind === "recipe") value = knowledge.recipes.find(recipe => recipe.id === id);
  if (kind === "docs") value = { text: searchRecord.text, truncated: searchRecord.truncated };
  return Object.freeze({
    schemaVersion: 2,
    kind,
    id,
    route: searchRecord.route,
    value,
    nextStep: kind === "docs"
      ? "Search for the concrete chart task; the search response includes the complete top-ranked primaryResource."
      : "Use this complete resource to author the chart. Read a related resource only when the task requires an additional capability not covered here."
  });
}

export async function knowledgeOverview() {
  const index = await loadKnowledgeSearchIndex();
  return Object.freeze({
    schemaVersion: 2,
    name: "ggaction",
    purpose: "Build immutable chart programs through public domain actions and render their materialized graphics.",
    workflow: Object.freeze([
      "Search once with search_ggaction using the chart task or exact action name.",
      "Use the complete primaryResource embedded for the top-ranked result.",
      "Read another result's resourceUri only when the task requires an additional capability.",
      "Write the complete public ggaction program using only documented public APIs."
    ]),
    resources: Object.freeze([
      "ggaction://overview",
      "ggaction://actions/{name}",
      "ggaction://recipes/{id}",
      "ggaction://docs/{section}"
    ]),
    tool: "search_ggaction",
    counts: Object.freeze({
      actions: index.generated.actionCount,
      recipes: index.generated.recipeCount,
      docs: index.generated.docsCount
    }),
    limits: index.limits
  });
}
