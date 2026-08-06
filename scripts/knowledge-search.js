import { readFile } from "node:fs/promises";
import path from "node:path";

import { root } from "./action-knowledge.js";
import { knowledgeSearchOutput, normalizeKnowledgeText } from "./generate-knowledge-search.js";

const knowledgeFile = path.join(root, "knowledge/index.json");
const stopwords = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "chart", "create", "for", "from", "in", "into", "is",
  "it", "of", "on", "or", "that", "the", "this", "to", "use", "using", "with"
]);
const fieldWeights = Object.freeze({ identity: 30, title: 20, summary: 8, guidance: 4, relations: 2 });
const kindPriority = Object.freeze({ recipe: 0, action: 1, docs: 2 });

function normalized(value) {
  return normalizeKnowledgeText(value);
}

function queryTerms(query, maximumTerms) {
  const terms = normalized(query).split(/\s+/).filter(term => term.length > 0 && !stopwords.has(term));
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
  return { query: normalized(query), terms, limit };
}

function scoreRecord(record, query) {
  const id = normalized(record.id);
  const title = normalized(record.title);
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
  return JSON.parse(await readFile(knowledgeSearchOutput, "utf8"));
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
  if (!new Set(["action", "recipe", "docs"]).has(kind)) throw new TypeError("Knowledge kind must be action, recipe, or docs.");
  if (typeof id !== "string" || !/^[A-Za-z][A-Za-z0-9-]*$/.test(id)) throw new TypeError("Knowledge ID is invalid.");
  const [index, knowledge] = await Promise.all([
    loadKnowledgeSearchIndex(),
    readFile(knowledgeFile, "utf8").then(JSON.parse)
  ]);
  const searchRecord = index.records.find(record => record.kind === kind && record.id === id);
  if (!searchRecord) throw new Error(`Unknown ${kind} knowledge ID "${id}".`);
  let value;
  if (kind === "action") value = knowledge.actions.find(action => action.name === id);
  if (kind === "recipe") value = knowledge.recipes.find(recipe => recipe.id === id);
  if (kind === "docs") {
    const source = await readFile(path.join(root, searchRecord.sourcePath), "utf8");
    value = { text: source.slice(0, index.limits.maximumReadCharacters), truncated: source.length > index.limits.maximumReadCharacters };
  }
  return Object.freeze({ kind, id, route: searchRecord.route, value });
}
