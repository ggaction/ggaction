import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { maximumMagnitude, normalizedFiniteSum } from "../numeric.js";
import { graphMetricVector, normalizeGraphMetric } from "./metricPolicy.js";

function bounds(values) {
  let minimum = Infinity, maximum = -Infinity;
  for (const value of values) { minimum = Math.min(minimum, value); maximum = Math.max(maximum, value); }
  return { minimum, maximum };
}
function columnStatistics(values, method) {
  const scale = maximumMagnitude(values) || 1;
  const scaled = values.map(value => value / scale);
  if (method === "minmax") {
    const { minimum, maximum } = bounds(scaled);
    return { scale, center: minimum, spread: maximum - minimum };
  }
  const sum = normalizedFiniteSum(scaled), center = sum.total * sum.scale / scaled.length;
  const squares = scaled.map(value => (value - center) ** 2), squared = normalizedFiniteSum(squares);
  return { scale, center, spread: Math.sqrt(squared.total * squared.scale / scaled.length) };
}

// The later graph authoring owner supplies extracted vectors and source identity.
// This kernel keeps source indexes, exclusion reasons, and reusable scaled statistics.
export function prepareGraphMetricVectors(vectors, options) {
  ownRecord(options, "Graph feature options");
  rejectUnknownProperties(options, ["metric", "zeroVector", "preprocess", "missing"], "graph feature");
  const policy = normalizeGraphMetric({ metric: options.metric,
    ...(Object.hasOwn(options, "zeroVector") ? { zeroVector: options.zeroVector } : {}) });
  const preprocess = options.preprocess === undefined ? "none" : options.preprocess;
  const missing = options.missing === undefined ? "error" : options.missing;
  if (!["none", "standardize", "minmax"].includes(preprocess)) throw new Error("Unsupported graph preprocessing.");
  if (!["error", "omit-node"].includes(missing)) throw new Error("Unsupported graph missing policy.");
  if (["jaccard", "great-circle"].includes(policy.metric) && preprocess !== "none") {
    throw new Error("Graph preprocessing requires a numeric vector metric.");
  }
  if (Array.isArray(vectors)) validateGeneratedItemLimit(vectors.length, "Graph feature nodes");
  ownArray(vectors, "Graph feature vectors");
  let work = 0;
  for (const value of vectors) {
    if (Array.isArray(value)) { work += value.length * 8; validateWorkLimit(work, "Graph feature work"); }
    ownArray(value, "Graph feature vector");
  }
  const included = [], sourceIndices = [], omitted = [];
  let dimension;
  vectors.forEach((value, index) => {
    if (policy.metric !== "jaccard") {
      dimension ??= value.length;
      if (dimension !== value.length) throw new Error("Graph metric vector dimensions must match.");
    }
    if (policy.metric === "great-circle" && (value.length !== 2 ||
        (Number.isFinite(value[1]) && Math.abs(value[1]) > 90))) {
      throw new RangeError("Great-circle requires two coordinates and latitude in [-90,90].");
    }
    const missingIndex = value.findIndex(item => item === null || item === undefined ||
      (typeof item === "number" && Number.isNaN(item)));
    // Invalid nonmissing values remain errors even when another cell is missing.
    if (missingIndex >= 0) {
      for (const item of value) {
        if (item !== null && item !== undefined && !(typeof item === "number" && Number.isNaN(item))) {
          graphMetricVector(policy.metric === "great-circle" ? [item, 0] : [item],
            policy.metric === "great-circle" ? "euclidean" : policy.metric);
        }
      }
      if (missing === "error") throw new TypeError(`Missing graph feature at node ${index}, feature ${missingIndex}.`);
      omitted.push({ index, feature: missingIndex, reason: "missing-value" });
      return;
    }
    included.push(graphMetricVector(value, policy.metric));
    sourceIndices.push(index);
  });
  const statistics = [];
  let prepared = included;
  if (preprocess !== "none" && included.length > 0) {
    for (let column = 0; column < dimension; column++) {
      statistics.push(columnStatistics(included.map(vector => vector[column]), preprocess));
    }
    prepared = included.map(vector => vector.map((value, column) => {
      const { scale, center, spread } = statistics[column];
      return spread === 0 ? 0 : (value / scale - center) / spread;
    }));
  }
  if (policy.metric === "cosine" && policy.zeroVector === "error" &&
      prepared.some(vector => vector.every(value => value === 0))) {
    throw new RangeError("Cosine similarity requires nonzero vectors after preprocessing.");
  }
  return cloneAndFreeze({ ...policy, preprocess, missing, vectors: prepared, sourceIndices, omitted, statistics });
}
