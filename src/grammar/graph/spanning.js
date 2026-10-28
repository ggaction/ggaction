import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { encodeRowKey, compareRowKeys } from "../../core/itemIdentity.js";
import { validateUserId } from "../../core/identifiers.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { stableFiniteSum } from "../numeric.js";
import { prepareGraphMetricVectors } from "./preprocess.js";
import { graphMetricPair } from "./metrics.js";
import { inferredGraphEdgeIdentity } from "./edgeIdentity.js";

function policy(input, metric) {
  ownRecord(input, "Graph spanning options");
  rejectUnknownProperties(input, ["ruleId", "forest", ...(metric ? ["metric", "preprocess", "missing", "zeroVector"] : [])], "graph spanning");
  const options = Object.assign(Object.create(null), input);
  const ruleId = validateUserId(options.ruleId, "Graph ruleId");
  const forest = options.forest === undefined ? false : options.forest;
  if (typeof forest !== "boolean") throw new TypeError("Graph forest must be boolean.");
  return { options, ruleId, forest };
}

function nodeRanks(keys) {
  if (Array.isArray(keys)) validateGeneratedItemLimit(keys.length, "Graph spanning nodes");
  ownArray(keys, "Graph spanning keys");
  const tokens = keys.map(key => encodeRowKey(key));
  if (new Set(tokens).size !== keys.length) throw new Error("Graph spanning node keys must be unique.");
  const ordered = keys.map((_, index) => index).sort((a, b) => compareRowKeys(keys[a], keys[b]));
  const ranks = new Array(keys.length);
  ordered.forEach((index, rank) => { ranks[index] = rank; });
  return { ranks, ordered };
}

function candidateWork(nodes, candidates, prior = 0) {
  const log = Math.ceil(Math.log2(Math.max(candidates, 2)));
  validateWorkLimit(prior + nodes * 32 + candidates * (24 + log), "Graph spanning work");
}

function select(keys, candidates, order, configuration) {
  const { ranks, ordered } = order;
  const parent = keys.map((_, i) => i), sizes = keys.map(() => 1);
  function root(i) {
    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
    return i;
  }
  const edgeOrder = (a, b) => ranks[a.sourceIndex] - ranks[b.sourceIndex] || ranks[a.targetIndex] - ranks[b.targetIndex];
  const canonical = candidates.map(({ sourceIndex: a, targetIndex: b, weight }) =>
    ranks[a] <= ranks[b] ? { sourceIndex: a, targetIndex: b, weight } : { sourceIndex: b, targetIndex: a, weight });
  canonical.sort((a, b) => a.weight - b.weight || edgeOrder(a, b));
  const selected = [];
  let components = keys.length;
  for (const edge of canonical) {
    let a = root(edge.sourceIndex), b = root(edge.targetIndex);
    if (a === b) continue;
    if (sizes[a] < sizes[b]) [a, b] = [b, a];
    parent[b] = a; sizes[a] += sizes[b]; components--;
    selected.push(edge);
  }
  if (components > 1 && !configuration.forest) throw new Error("Graph candidates are disconnected; forest:true is required.");
  const groups = new Map();
  for (const i of ordered) {
    const key = root(i);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(i);
  }
  const cost = stableFiniteSum(selected.map(edge => edge.weight), "Graph spanning cost");
  const edges = selected.sort(edgeOrder).map(edge => ({ ...edge,
    ...inferredGraphEdgeIdentity({ ruleId: configuration.ruleId, directed: false,
      sourceKey: keys[edge.sourceIndex], targetKey: keys[edge.targetIndex] }) }));
  return { edges, cost, components, componentNodes: [...groups.values()], candidateCount: candidates.length };
}

// Explicit weighted candidates may contain parallel connections or self loops.
// Kruskal selects only non-self connections; the domain adapter supplies lineage.
export function selectGraphSpanningForest(keys, candidates, options) {
  const configuration = policy(options, false), order = nodeRanks(keys);
  if (Array.isArray(candidates)) candidateWork(keys.length, candidates.length);
  ownArray(candidates, "Graph spanning candidates");
  const validated = candidates.map(input => {
    ownRecord(input, "Graph spanning candidate");
    rejectUnknownProperties(input, ["sourceIndex", "targetIndex", "weight"], "graph spanning candidate");
    const { sourceIndex, targetIndex, weight } = Object.assign(Object.create(null), input);
    for (const index of [sourceIndex, targetIndex]) {
      if (!Number.isSafeInteger(index) || index < 0 || index >= keys.length) throw new RangeError("Graph candidate index is outside the node range.");
    }
    if (!Number.isFinite(weight) || weight < 0) throw new RangeError("Graph candidate weight must be finite and nonnegative.");
    return { sourceIndex, targetIndex, weight: weight === 0 ? 0 : weight };
  });
  return cloneAndFreeze({ ...select(keys, validated, order, configuration),
    options: { ruleId: configuration.ruleId, forest: configuration.forest } });
}

// Complete metric graphs share the feature policy with neighbor inference.
// Source indexes are restored only after selecting included nodes.
export function inferGraphMst(keys, vectors, input) {
  const configuration = policy(input, true), { options } = configuration;
  nodeRanks(keys);
  if (Array.isArray(vectors)) validateGeneratedItemLimit(vectors.length, "Graph feature nodes");
  ownArray(vectors, "Graph spanning vectors");
  if (keys.length !== vectors.length) throw new Error("Graph keys and vectors must have equal length.");
  const preparation = prepareGraphMetricVectors(vectors, Object.fromEntries(["metric", "preprocess", "missing", "zeroVector"]
    .filter(key => Object.hasOwn(options, key)).map(key => [key, options[key]])));
  const indexes = preparation.sourceIndices, n = indexes.length;
  const includedKeys = indexes.map(i => keys[i]), order = nodeRanks(includedKeys);
  const pairCount = n * (n - 1) / 2;
  const dimension = preparation.vectors.reduce((max, vector) => Math.max(max, vector.length), 0);
  const featureWork = vectors.reduce((total, vector) => total + vector.length * 8, 0);
  const metricWork = pairCount * Math.max(1, dimension) * (preparation.metric === "jaccard"
    ? 24 + Math.ceil(Math.log2(Math.max(dimension, 2))) : 24);
  candidateWork(n, pairCount, featureWork + metricWork);
  const metricOptions = { metric: preparation.metric,
    ...(Object.hasOwn(preparation, "zeroVector") ? { zeroVector: preparation.zeroVector } : {}) };
  const candidates = [];
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
    candidates.push({ sourceIndex: a, targetIndex: b,
      weight: graphMetricPair(preparation.vectors[a], preparation.vectors[b], metricOptions).distance });
  }
  const result = select(includedKeys, candidates, order, configuration);
  return cloneAndFreeze({ ...result,
    edges: result.edges.map(edge => ({ ...edge, sourceIndex: indexes[edge.sourceIndex], targetIndex: indexes[edge.targetIndex] })),
    componentNodes: result.componentNodes.map(group => group.map(index => indexes[index])),
    preparation, pairCount, options: { ruleId: configuration.ruleId, forest: configuration.forest,
      ...metricOptions, preprocess: preparation.preprocess, missing: preparation.missing } });
}
