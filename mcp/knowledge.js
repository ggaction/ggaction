import { readFile } from "node:fs/promises";

const knowledgeFile = new URL("../knowledge/index.json", import.meta.url);
const searchIndexFile = new URL("../knowledge/search-index.json", import.meta.url);

const stopwords = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "chart", "create", "for", "from", "in", "into", "is",
  "it", "of", "on", "or", "that", "the", "this", "to", "use", "using", "with"
]);
const fieldWeights = Object.freeze({ identity: 30, title: 20, summary: 8, guidance: 4, relations: 2 });
const kindPriority = Object.freeze({ recipe: 0, action: 1, docs: 2 });
const knowledgeKinds = new Set(["action", "recipe", "docs"]);

function canonicalWord(word) {
  const exceptions = { axes: "axis", series: "series", analyses: "analysis" };
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

function queryTerms(query, maximumTerms) {
  const terms = normalizeKnowledgeText(query)
    .split(/\s+/u)
    .filter(term => term.length > 0 && !stopwords.has(term));
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

function scoreRecord(record, query) {
  const id = normalizeKnowledgeText(record.id);
  const title = normalizeKnowledgeText(record.title);
  const identity = `${id} ${title}`;
  let score = id === query.query || title === query.query
    ? 240
    : identity.includes(query.query)
      ? 80
      : 0;
  const matchedTerms = [];
  for (const term of query.terms) {
    let matched = false;
    for (const [field, weight] of Object.entries(fieldWeights)) {
      if (record.terms[field].includes(term)) {
        score += weight;
        matched = true;
      }
    }
    if (matched) matchedTerms.push(term);
  }
  if (matchedTerms.length > 0) score += Math.round(20 * matchedTerms.length / query.terms.length);
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
    score: scored.score,
    matchedTerms: Object.freeze(scored.matchedTerms)
  });
}

export async function loadKnowledgeSearchIndex() {
  return JSON.parse(await readFile(searchIndexFile, "utf8"));
}

export async function searchKnowledge(options) {
  const index = await loadKnowledgeSearchIndex();
  const query = validateSearch(options, index.limits);
  return index.records
    .map(record => ({ record, scored: scoreRecord(record, query) }))
    .filter(entry => entry.scored.score > 0)
    .sort((left, right) =>
      right.scored.score - left.scored.score ||
      kindPriority[left.record.kind] - kindPriority[right.record.kind] ||
      left.record.id.localeCompare(right.record.id)
    )
    .slice(0, query.limit)
    .map(entry => result(entry.record, entry.scored, index.limits.maximumSummaryCharacters));
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
  return Object.freeze({ kind, id, route: searchRecord.route, value });
}

export async function knowledgeOverview() {
  const index = await loadKnowledgeSearchIndex();
  return Object.freeze({
    name: "ggaction",
    purpose: "Build immutable chart programs through public domain actions and render their materialized graphics.",
    workflow: Object.freeze([
      "Read ggaction://overview for routing.",
      "Search with search_ggaction using the chart task or exact action name.",
      "Read the matching action or recipe resource before authoring code.",
      "Use ggaction://docs/docs for detailed public documentation routes."
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
