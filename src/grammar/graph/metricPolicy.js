import { ownArray, ownRecord } from "../../core/ownData.js";
import { encodeRowKey } from "../../core/itemIdentity.js";
import { rejectUnknownProperties, validateWorkLimit } from "../../core/validation.js";

const METRICS = new Set(["euclidean", "manhattan", "cosine", "jaccard", "great-circle"]);
export function normalizeGraphMetric(options) {
  ownRecord(options, "Graph metric options");
  rejectUnknownProperties(options, ["metric", "zeroVector"], "graph metric");
  options = Object.assign(Object.create(null), options);
  if (!METRICS.has(options.metric)) throw new Error("Unsupported graph metric.");
  if (options.metric !== "cosine" && Object.hasOwn(options, "zeroVector")) {
    throw new Error("Graph zeroVector is only applicable to cosine.");
  }
  const zeroVector = options.zeroVector === undefined ? "error" : options.zeroVector;
  if (options.metric === "cosine") {
    if (!["error", "zero-similarity"].includes(zeroVector)) {
      throw new Error("Unsupported cosine zeroVector policy.");
    }
  }
  return Object.freeze({ metric: options.metric, ...(options.metric === "cosine" ? { zeroVector } : {}) });
}

export function graphMetricVector(value, metric) {
  if (Array.isArray(value)) validateWorkLimit(value.length * 4, "Graph metric vector work");
  ownArray(value, "Graph metric vector");
  if (metric === "jaccard") {
    return [...new Set(value.map(item => {
      if (Array.isArray(item)) throw new TypeError("Jaccard attributes must be typed scalars.");
      return encodeRowKey(item, "Jaccard attribute");
    }))].sort();
  }
  if (value.length === 0 || !value.every(Number.isFinite)) {
    throw new TypeError("Graph metric vectors must contain finite numbers and must not be empty.");
  }
  if (metric === "great-circle" && (value.length !== 2 || Math.abs(value[1]) > 90)) {
    throw new RangeError("Great-circle requires longitude and latitude degrees with latitude in [-90,90].");
  }
  return [...value];
}
