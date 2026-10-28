import { maximumMagnitude, normalizedFiniteSum, requireFiniteResult } from "../numeric.js";
import { graphMetricVector, normalizeGraphMetric } from "./metricPolicy.js";

export const EARTH_MEAN_RADIUS_METERS = 6371008.8;
function norm(vector) {
  const scale = maximumMagnitude(vector);
  if (scale === 0) return 0;
  const squares = vector.map(value => (value / scale) ** 2);
  const sum = normalizedFiniteSum(squares);
  return requireFiniteResult(scale * Math.sqrt(sum.scale * sum.total), "Graph Euclidean distance");
}
function cosine(left, right, zeroVector) {
  const leftScale = maximumMagnitude(left), rightScale = maximumMagnitude(right);
  if (leftScale === 0 || rightScale === 0) {
    if (zeroVector === "error") throw new RangeError("Cosine similarity requires nonzero vectors.");
    return 0;
  }
  const a = left.map(value => value / leftScale), b = right.map(value => value / rightScale);
  const an = norm(a), bn = norm(b);
  const products = a.map((value, index) => (value / an) * (b[index] / bn));
  const dot = normalizedFiniteSum(products);
  return Math.max(-1, Math.min(1, dot.total * dot.scale));
}
function greatCircle(left, right) {
  if (left[1] === right[1] && Math.abs(left[1]) === 90) return 0;
  const radians = Math.PI / 180;
  // Reduce each longitude first so subtraction cannot overflow.
  const deltaLongitude = ((right[0] % 360 - left[0] % 360 + 540) % 360 - 180) * radians;
  const latitudeA = left[1] * radians, latitudeB = right[1] * radians;
  const haversine = Math.sin((latitudeB - latitudeA) / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(deltaLongitude / 2) ** 2;
  const a = Math.max(0, Math.min(1, haversine));
  return 2 * EARTH_MEAN_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function graphMetricPair(left, right, options) {
  const policy = normalizeGraphMetric(options);
  const a = graphMetricVector(left, policy.metric), b = graphMetricVector(right, policy.metric);
  if (policy.metric === "jaccard") {
    const other = new Set(b);
    let intersection = 0;
    for (const value of a) if (other.has(value)) intersection++;
    const union = a.length + b.length - intersection;
    const similarity = union === 0 ? 1 : intersection / union;
    return Object.freeze({ similarity, distance: 1 - similarity });
  }
  if (a.length !== b.length) throw new Error("Graph metric vector dimensions must match.");
  if (policy.metric === "cosine") {
    const similarity = cosine(a, b, policy.zeroVector);
    return Object.freeze({ similarity, distance: 1 - similarity });
  }
  let distance;
  if (policy.metric === "great-circle") distance = greatCircle(a, b);
  else {
    const differences = a.map((value, index) =>
      requireFiniteResult(value - b[index], "Graph coordinate difference"));
    if (policy.metric === "euclidean") distance = norm(differences);
    else {
      const sum = normalizedFiniteSum(differences.map(Math.abs));
      distance = requireFiniteResult(sum.total * sum.scale, "Graph Manhattan distance");
    }
  }
  return Object.freeze({ distance, ...(policy.metric === "great-circle" ? { unit: "m" } : {}) });
}
