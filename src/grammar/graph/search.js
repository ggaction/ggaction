import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { graphMetricPair } from "./metrics.js";
import { normalizeApproximateGraphSearch } from "./approximate.js";

export function normalizeGraphSearch(input, policy, preparation) {
  if (input === undefined) return { mode: "exact", algorithm: "brute-force" };
  ownRecord(input, "Graph search options");
  if (Object.hasOwn(input, "mode") && input.mode === "approximate") return normalizeApproximateGraphSearch(input, policy);
  rejectUnknownProperties(input, ["mode", "algorithm"], "graph search");
  input = Object.assign(Object.create(null), input);
  const mode = input.mode === undefined ? "exact" : input.mode, algorithm = input.algorithm === undefined ? "brute-force" : input.algorithm;
  if (mode !== "exact") throw new Error("Unsupported graph search mode.");
  if (!["brute-force", "kd-tree", "grid"].includes(algorithm)) throw new Error("Unsupported graph search algorithm.");
  if (algorithm !== "brute-force") {
    if (!["euclidean", "manhattan"].includes(preparation.metric) || !["knn", "radius"].includes(policy.rule)) {
      throw new Error("Exact spatial search requires euclidean/manhattan kNN or radius.");
    }
    const dimension = preparation.vectors[0]?.length ?? 0;
    if (dimension > (algorithm === "grid" ? 3 : 8)) throw new RangeError("Graph search dimension is above the algorithm limit.");
    if (algorithm === "grid" && policy.rule !== "radius") throw new Error("Grid search requires radius.");
  }
  return { mode, algorithm };
}

// Only normalized prepared vectors enter this owner. The neighbor rule retains
// typed identity, symmetrization, edge ordering and graph resource ownership.
export function searchExactGraph(preparation, policy, ranks, search) {
  const vectors = preparation.vectors, n = vectors.length, dimension = vectors[0]?.length ?? 0;
  let work = n * Math.max(dimension, 1) * (8 + Math.ceil(Math.log2(Math.max(2, n))) ** 2), distanceEvaluations = 0;
  validateWorkLimit(work, "Graph exact search work");
  const charge = count => { work += count; validateWorkLimit(work, "Graph exact search work"); };
  function distance(a, b) {
    charge(Math.max(1, dimension) * 24); distanceEvaluations++;
    return graphMetricPair(vectors[a], vectors[b], { metric: preparation.metric }).distance;
  }
  const rows = policy.rule === "knn" ? Array.from({ length: n }, () => []) : undefined, pairs = [];
  const compare = (a, b) => a.distance - b.distance || ranks[a.index] - ranks[b.index];
  function accept(a, b, d) {
    if (rows) {
      const row = rows[a];
      // Keep only the needed neighbors, including typed-key tie replacement.
      let low = 0, high = row.length;
      const entry = { index: b, distance: d };
      while (low < high) {
        const middle = (low + high) >>> 1;
        if (compare(entry, row[middle]) < 0) high = middle; else low = middle + 1;
      }
      if (low < policy.k) { charge(row.length - low + 1); row.splice(low, 0, entry); if (row.length > policy.k) row.pop(); }
    } else if (d <= policy.radius) {
      validateGeneratedItemLimit((pairs.length + 1) * (policy.directed ? 2 : 1), "Graph neighbor edges");
      pairs.push({ a, b, distance: d });
    }
  }
  if (search.algorithm === "kd-tree") {
    function build(indices, depth) {
      if (indices.length === 0) return null;
      const axis = depth % dimension;
      indices.sort((a, b) => vectors[a][axis] - vectors[b][axis] || ranks[a] - ranks[b]);
      const middle = indices.length >>> 1, index = indices[middle];
      const left = build(indices.slice(0, middle), depth + 1), right = build(indices.slice(middle + 1), depth + 1);
      const minimum = [...vectors[index]], maximum = [...minimum];
      for (const child of [left, right]) if (child) for (let d = 0; d < dimension; d++) {
        minimum[d] = Math.min(minimum[d], child.minimum[d]); maximum[d] = Math.max(maximum[d], child.maximum[d]);
      }
      return { index, left, right, minimum, maximum };
    }
    const tree = build(Array.from({ length: n }, (_, i) => i), 0);
    function lowerBound(query, node) {
      charge(dimension * 4 + 1);
      const delta = vectors[query].map((value, d) => Math.max(0, node.minimum[d] - value, value - node.maximum[d]));
      const bound = preparation.metric === "euclidean" ? Math.hypot(...delta) : delta.reduce((sum, value) => sum + value, 0);
      // Conservative rounding preserves equal-distance boundaries under the
      // shared compensated metric calculation used for final reranking.
      return bound * (1 - 8 * Math.max(1, dimension) * Number.EPSILON);
    }
    for (let a = 0; a < n; a++) {
      function visit(node, bound) {
        if (!node) return;
        const threshold = rows ? (rows[a].length < policy.k ? Infinity : rows[a].at(-1).distance) : policy.radius;
        if (bound > threshold) return;
        const b = node.index;
        if (b !== a && (rows || b > a)) accept(a, b, distance(a, b));
        const children = [node.left, node.right].filter(Boolean).map(child => ({ child, bound: lowerBound(a, child) }));
        children.sort((x, y) => x.bound - y.bound);
        for (const child of children) visit(child.child, child.bound);
      }
      visit(tree, 0);
    }
  } else {
    const cells = new Map(), positions = [];
    for (let a = 0; a < n; a++) {
      const cell = policy.radius === 0 ? vectors[a] : vectors[a].map(value => Math.floor(value / policy.radius));
      if (policy.radius !== 0 && cell.some(value => !Number.isSafeInteger(value) || Math.abs(value) >= Number.MAX_SAFE_INTEGER - 2)) {
        throw new RangeError("Graph grid cell index must be a safe integer.");
      }
      positions.push(cell);
      const key = JSON.stringify(cell), bucket = cells.get(key);
      if (bucket) bucket.push(a); else cells.set(key, [a]);
    }
    for (let a = 0; a < n; a++) {
      // One extra cell protects integer-division boundaries from roundoff.
      let candidates = [positions[a]];
      if (policy.radius !== 0) for (let d = 0; d < dimension; d++) {
        candidates = candidates.flatMap(cell => [-2, -1, 0, 1, 2].map(offset => cell.map((value, i) => i === d ? value + offset : value)));
      }
      charge(candidates.length * Math.max(1, dimension));
      for (const cell of candidates) for (const b of cells.get(JSON.stringify(cell)) ?? []) {
        if (b > a) accept(a, b, distance(a, b));
      }
    }
  }
  return { rows, pairs, search: { ...search, algorithmVersion: `${search.algorithm}@1`, distanceEvaluations, work } };
}
