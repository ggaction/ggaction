import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateWorkLimit } from "../../core/validation.js";
import { graphMetricPair } from "./metrics.js";
import { createGraphRandom } from "./random.js";

export function normalizeApproximateGraphSearch(input, policy) {
  ownRecord(input, "Approximate graph search options");
  rejectUnknownProperties(input, ["mode", "algorithm", "seed", "trees", "projections", "leafSize", "searchLeaves", "fallback", "minRecall"], "approximate graph search");
  input = Object.assign(Object.create(null), input);
  if (policy.rule !== "knn") throw new Error("Approximate graph search requires kNN.");
  const defaults = { algorithm: "projection-forest", trees: 8, projections: 1, leafSize: 32, searchLeaves: 16, fallback: "error", minRecall: .95 };
  const result = { mode: "approximate", seed: input.seed };
  for (const [key, value] of Object.entries(defaults)) result[key] = input[key] === undefined ? value : input[key];
  if (result.algorithm !== "projection-forest") throw new Error("Unsupported approximate graph algorithm.");
  if (!Number.isInteger(result.seed) || result.seed < 0 || result.seed > 0xffffffff) throw new RangeError("Approximate graph seed must be uint32.");
  for (const [key, maximum] of [["trees", 64], ["projections", 1], ["leafSize", 1024], ["searchLeaves", 1024]]) {
    if (!Number.isInteger(result[key]) || result[key] < 1 || result[key] > maximum) throw new RangeError(`Approximate graph ${key} is outside its supported integer range.`);
  }
  if (!["error", "exact"].includes(result.fallback)) throw new Error("Unsupported approximate candidate fallback.");
  if (!Number.isFinite(result.minRecall) || result.minRecall < .95 || result.minRecall > 1) throw new RangeError("Graph minRecall must be in [0.95,1].");
  return result;
}

function tokenProjection(token, seed) {
  let hash = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < token.length; i++) hash = Math.imul(hash ^ token.charCodeAt(i), 16777619) >>> 0;
  // Mix the final word so adjacent encoded values do not stay adjacent.
  hash = Math.imul(hash ^ hash >>> 16, 2246822507);
  hash = Math.imul(hash ^ hash >>> 13, 3266489909);
  return ((hash ^ hash >>> 16) >>> 0) / 2147483648 - 1;
}
function projectionVectors(preparation) {
  const { vectors, metric } = preparation;
  if (metric === "jaccard") return vectors;
  if (metric === "great-circle") return vectors.map(([longitude, latitude]) => {
    const lon = (longitude % 360) * Math.PI / 180, lat = latitude * Math.PI / 180;
    return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
  });
  let scale = 1;
  for (const vector of vectors) for (const value of vector) scale = Math.max(scale, Math.abs(value));
  return vectors.map(vector => {
    let divisor = scale;
    if (metric === "cosine") { divisor = 0; for (const value of vector) divisor = Math.max(divisor, Math.abs(value)); divisor ||= 1; }
    const scaled = vector.map(value => value / divisor);
    const length = metric === "cosine" ? Math.sqrt(scaled.reduce((sum, value) => sum + value * value, 0)) || 1 : 1;
    return scaled.map(value => value / length);
  });
}

export function searchApproximateGraph(preparation, policy, ranks, search) {
  const n = preparation.vectors.length, k = n < 2 ? 0 : policy.k;
  const dimension = preparation.vectors.reduce((maximum, vector) => Math.max(maximum, vector.length), 0);
  const metricCost = Math.max(1, dimension) * (preparation.metric === "jaccard" ? 24 + Math.ceil(Math.log2(Math.max(dimension, 2))) : 24);
  const holdoutCount = Math.min(n, 1000), sortBits = Math.ceil(Math.log2(Math.max(n, 2)));
  // Reserve every exhaustive recall query before building an approximate index.
  // Qualification is part of the bounded operation, never unmeasured sampling.
  let work = n * search.trees * (Math.max(3, dimension) * 8 + sortBits * 2) + n * Math.max(1, dimension) * 8 +
    holdoutCount * Math.max(0, n - 1) * (metricCost + sortBits);
  if (preparation.metric === "jaccard") for (const vector of preparation.vectors) for (const token of vector) work += token.length * search.trees;
  validateWorkLimit(work, "Graph approximate search work");
  const charge = count => { work += count; validateWorkLimit(work, "Graph approximate search work"); };
  const vectors = projectionVectors(preparation), random = createGraphRandom(search.seed), forest = [];
  for (let t = 0; t < search.trees; t++) {
    const treeSeed = Math.floor(random() * 4294967296);
    const direction = Array.from({ length: preparation.metric === "jaccard" ? 0 : (vectors[0]?.length ?? 0) }, () => random() * 2 - 1);
    const entries = vectors.map((vector, index) => ({ index, value: preparation.metric === "jaccard"
      ? vector.reduce((sum, token) => sum + tokenProjection(token, treeSeed), 0) / Math.sqrt(Math.max(1, vector.length))
      : vector.reduce((sum, value, d) => sum + value * direction[d], 0) }));
    entries.sort((a, b) => a.value - b.value || ranks[a.index] - ranks[b.index]);
    const leaves = [], leafByIndex = new Array(n), valueByIndex = new Array(n);
    for (let offset = 0; offset < n; offset += search.leafSize) {
      const items = entries.slice(offset, offset + search.leafSize), leaf = leaves.length;
      for (const item of items) { leafByIndex[item.index] = leaf; valueByIndex[item.index] = item.value; }
      leaves.push({ items, minimum: items[0].value, maximum: items.at(-1).value });
    }
    forest.push({ leaves, leafByIndex, valueByIndex });
  }
  const metricOptions = { metric: preparation.metric, ...(Object.hasOwn(preparation, "zeroVector") ? { zeroVector: preparation.zeroVector } : {}) };
  let distanceEvaluations = 0;
  function distance(a, b) {
    distanceEvaluations++;
    return graphMetricPair(preparation.vectors[a], preparation.vectors[b], metricOptions).distance;
  }
  const compare = (a, b) => a.distance - b.distance || ranks[a.index] - ranks[b.index];
  const candidateCounts = [], fallbackQueries = [], rows = [];
  for (let a = 0; a < n; a++) {
    const candidates = new Set();
    for (const tree of forest) {
      let left = tree.leafByIndex[a], right = left + 1;
      const value = tree.valueByIndex[a];
      for (let visited = 0; visited < Math.min(search.searchLeaves, tree.leaves.length); visited++) {
        const l = left >= 0 ? tree.leaves[left] : undefined, r = right < tree.leaves.length ? tree.leaves[right] : undefined;
        const dl = l ? Math.max(0, l.minimum - value, value - l.maximum) : Infinity;
        const dr = r ? Math.max(0, r.minimum - value, value - r.maximum) : Infinity;
        const chosen = dl <= dr ? tree.leaves[left--] : tree.leaves[right++];
        charge(chosen.items.length + 8);
        for (const item of chosen.items) if (item.index !== a) candidates.add(item.index);
      }
    }
    candidateCounts.push(candidates.size);
    if (candidates.size < k) {
      if (search.fallback === "error") throw Object.assign(new RangeError("Approximate graph search found fewer candidates than k."), {
        code: "GGACTION_GRAPH_CANDIDATES", details: Object.freeze({ sourceIndex: preparation.sourceIndices[a], candidateCount: candidates.size, k, seed: search.seed })
      });
      fallbackQueries.push(preparation.sourceIndices[a]);
      for (let b = 0; b < n; b++) if (b !== a) candidates.add(b);
    }
    charge(candidates.size * (metricCost + sortBits));
    rows.push([...candidates].map(index => ({ index, distance: distance(a, index) })).sort(compare).slice(0, k));
  }
  const holdout = Array.from({ length: n }, (_, i) => i).sort((a, b) => ranks[a] - ranks[b]).slice(0, holdoutCount);
  let recalled = 0;
  for (const a of holdout) {
    const exact = [];
    for (let b = 0; b < n; b++) if (a !== b) exact.push({ index: b, distance: distance(a, b) });
    const truth = new Set(exact.sort(compare).slice(0, k).map(item => item.index));
    for (const item of rows[a]) if (truth.has(item.index)) recalled++;
  }
  const measuredRecall = k === 0 ? 1 : recalled / (holdoutCount * k);
  if (measuredRecall < search.minRecall) throw Object.assign(new RangeError("Approximate graph search did not meet minRecall."), {
    code: "GGACTION_GRAPH_RECALL", details: Object.freeze({ measuredRecall, minRecall: search.minRecall, holdoutCount, seed: search.seed, algorithmVersion: "projection-forest@1" })
  });
  return { rows, search: { ...search, algorithmVersion: "projection-forest@1", candidateCount: candidateCounts.reduce((sum, value) => sum + value, 0),
    candidateCounts, fallbackQueries, holdoutCount, holdoutSourceIndices: holdout.map(index => preparation.sourceIndices[index]), measuredRecall, distanceEvaluations, work } };
}
