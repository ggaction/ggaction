import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { encodeRowKey, compareRowKeys } from "../../core/itemIdentity.js";
import { validateUserId } from "../../core/identifiers.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { prepareGraphMetricVectors } from "./preprocess.js";
import { graphMetricPair } from "./metrics.js";
import { inferredGraphEdgeIdentity } from "./edgeIdentity.js";
import { normalizeGraphSearch, searchExactGraph } from "./search.js";
import { searchApproximateGraph } from "./approximate.js";

function normalize(options) {
  ownRecord(options, "Graph neighbor options");
  options = Object.assign(Object.create(null), options);
  const rule = options.rule;
  const extra = rule === "knn" ? ["k", "symmetrize"] : rule === "radius"
    ? ["radius", "directed"] : rule === "similarity" ? ["threshold", "directed"] : [];
  if (extra.length === 0) throw new Error("Graph neighbors require knn, radius or similarity.");
  rejectUnknownProperties(options, ["ruleId", "rule", "metric", "preprocess", "missing", "zeroVector", "search", ...extra], "graph neighbor");
  const ruleId = validateUserId(options.ruleId, "Graph ruleId");
  if (rule === "knn") {
    const k = options.k === undefined ? 1 : options.k;
    const symmetrize = options.symmetrize === undefined ? "directed" : options.symmetrize;
    if (!Number.isSafeInteger(k) || k < 1) throw new RangeError("Graph k must be a positive safe integer.");
    if (!["directed", "union", "mutual"].includes(symmetrize)) throw new Error("Unsupported graph symmetrize policy.");
    return { ruleId, rule, k, symmetrize, directed: symmetrize === "directed" };
  }
  const directed = options.directed === undefined ? false : options.directed;
  if (typeof directed !== "boolean") throw new TypeError("Graph directed must be boolean.");
  if (rule === "radius") {
    if (!Number.isFinite(options.radius) || options.radius < 0) throw new RangeError("Graph radius must be finite and nonnegative.");
    return { ruleId, rule, radius: options.radius, directed };
  }
  if (!["cosine", "jaccard"].includes(options.metric)) throw new Error("Graph similarity requires cosine or jaccard.");
  const minimum = options.metric === "cosine" ? -1 : 0;
  if (!Number.isFinite(options.threshold) || options.threshold < minimum || options.threshold > 1) {
    throw new RangeError("Graph similarity threshold is outside the metric domain.");
  }
  return { ruleId, rule, threshold: options.threshold, directed };
}

// Return selected raw-source indexes and stable typed identities. The domain
// adapter, not this pure kernel, supplies graph nodes and row provenance.
export function inferGraphNeighbors(keys, vectors, options) {
  const policy = normalize(options);
  if (Array.isArray(keys)) validateGeneratedItemLimit(keys.length, "Graph neighbor nodes");
  ownArray(keys, "Graph node keys");
  if (Array.isArray(vectors)) validateGeneratedItemLimit(vectors.length, "Graph feature nodes");
  ownArray(vectors, "Graph feature vectors");
  if (keys.length !== vectors.length) throw new Error("Graph keys and vectors must have equal length.");
  const tokens = keys.map(key => encodeRowKey(key));
  if (new Set(tokens).size !== tokens.length) throw new Error("Graph node keys must be unique.");
  const featureOptions = Object.fromEntries(["metric", "preprocess", "missing", "zeroVector"]
    .filter(key => Object.hasOwn(options, key)).map(key => [key, options[key]]));
  const preparation = prepareGraphMetricVectors(vectors, featureOptions);
  const searchInput = Object.hasOwn(options, "search") ? options.search : undefined;
  const searchPolicy = normalizeGraphSearch(searchInput, policy, preparation);
  const indexes = preparation.sourceIndices, n = indexes.length;
  if (policy.rule === "knn" && n > 1 && policy.k >= n) throw new RangeError("Graph k must be less than the included node count.");
  const pairCount = n < 2 ? 0 : n * (n - 1) / 2;
  const dimension = preparation.vectors.reduce((max, vector) => Math.max(max, vector.length), 0);
  const featureWork = vectors.reduce((total, vector) => total + vector.length * 8, 0);
  const sortWork = n * Math.ceil(Math.log2(Math.max(n, 2)));
  const metricWork = pairCount * Math.max(1, dimension) *
    (preparation.metric === "jaccard" ? 24 + Math.ceil(Math.log2(Math.max(dimension, 2))) : 24);
  if (searchPolicy.algorithm === "brute-force") validateWorkLimit(featureWork + metricWork + sortWork * (policy.rule === "knn" ? n : 1), "Graph exact neighbor work");
  if (policy.rule === "knn" && policy.directed) validateGeneratedItemLimit(n * (n < 2 ? 0 : policy.k), "Graph neighbor edges");
  const rankOrder = Array.from({ length: n }, (_, i) => i).sort((a, b) => compareRowKeys(keys[indexes[a]], keys[indexes[b]]));
  const ranks = new Array(n);
  rankOrder.forEach((index, rank) => { ranks[index] = rank; });
  const neighbors = policy.rule === "knn" ? Array.from({ length: n }, () => []) : undefined;
  const edges = [], seen = new Set();
  function add(a, b, weight) {
    if (!policy.directed && ranks[a] > ranks[b]) [a, b] = [b, a];
    const pairKey = `${a}:${b}`;
    if (seen.has(pairKey)) return;
    validateGeneratedItemLimit(edges.length + 1, "Graph neighbor edges");
    seen.add(pairKey);
    const sourceIndex = indexes[a], targetIndex = indexes[b];
    edges.push({ sourceIndex, targetIndex, ...inferredGraphEdgeIdentity({ ruleId: policy.ruleId,
      directed: policy.directed, sourceKey: keys[sourceIndex], targetKey: keys[targetIndex] }), weight });
  }
  const metricOptions = { metric: preparation.metric,
    ...(Object.hasOwn(preparation, "zeroVector") ? { zeroVector: preparation.zeroVector } : {}) };
  let searchResult;
  if (searchPolicy.algorithm !== "brute-force") {
    const found = searchPolicy.mode === "approximate"
      ? searchApproximateGraph(preparation, policy, ranks, searchPolicy)
      : searchExactGraph(preparation, policy, ranks, searchPolicy);
    searchResult = found.search;
    if (neighbors) found.rows.forEach((row, i) => { neighbors[i] = row; });
    else for (const { a, b, distance } of found.pairs) { add(a, b, distance); if (policy.directed) add(b, a, distance); }
  } else for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
    const result = graphMetricPair(preparation.vectors[a], preparation.vectors[b], metricOptions);
    if (neighbors) {
      neighbors[a].push({ index: b, distance: result.distance });
      neighbors[b].push({ index: a, distance: result.distance });
    } else if (policy.rule === "radius" ? result.distance <= policy.radius : result.similarity >= policy.threshold) {
      const weight = policy.rule === "radius" ? result.distance : result.similarity;
      add(a, b, weight);
      if (policy.directed) add(b, a, weight);
    }
  }
  if (neighbors) {
    const selected = neighbors.map(row => row.sort((a, b) => a.distance - b.distance || ranks[a.index] - ranks[b.index])
      .slice(0, n < 2 ? 0 : policy.k));
    const memberships = selected.map(row => new Set(row.map(item => item.index)));
    selected.forEach((row, a) => row.forEach(({ index: b, distance }) => {
      if (policy.symmetrize !== "mutual" || memberships[b].has(a)) add(a, b, distance);
    }));
  }
  const sourceRanks = new Map(indexes.map((source, i) => [source, ranks[i]]));
  edges.sort((a, b) => sourceRanks.get(a.sourceIndex) - sourceRanks.get(b.sourceIndex) ||
    sourceRanks.get(a.targetIndex) - sourceRanks.get(b.targetIndex));
  return cloneAndFreeze({ edges, preparation, options: { ...policy, ...metricOptions,
    preprocess: preparation.preprocess, missing: preparation.missing }, pairCount,
    ...(searchInput === undefined ? {} : { search: searchResult ?? { ...searchPolicy, algorithmVersion: "brute-force@1", distanceEvaluations: pairCount } }),
    ...(policy.rule === "knn" ? { effectiveK: n < 2 ? 0 : policy.k } : {}) });
}
