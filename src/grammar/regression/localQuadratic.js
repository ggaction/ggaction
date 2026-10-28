import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateWorkLimit } from "../../core/validation.js";
import { maximumMagnitude, restoreFiniteScale, stableFiniteSum } from "../numeric.js";
import { trySolveLinearSystem } from "./linearSystem.js";

// Points are an already-selected neighborhood with final distance/residual
// weights. Neighborhood and all-zero residual fallback remain with LOESS.
export const localQuadraticWork = pointCount => pointCount * 32 + 27;

export function predictLocalQuadratic(points, xValue) {
  if (!Number.isFinite(xValue)) throw new TypeError("Local quadratic prediction x must be finite.");
  if (Array.isArray(points)) validateWorkLimit(localQuadraticWork(points.length), "Local quadratic computation");
  ownArray(points, "Local quadratic points");
  for (const point of points) {
    ownRecord(point, "Local quadratic point");
    rejectUnknownProperties(point, ["x", "y", "weight"], "local quadratic point");
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y) ||
        !Number.isFinite(point.weight) || point.weight < 0) {
      throw new TypeError("Local quadratic points require finite x/y and non-negative finite weights.");
    }
  }
  const positive = points.filter(point => point.weight > 0);
  if (positive.length === 0) throw new Error("Local quadratic prediction requires positive weight.");
  const differences = positive.map(point => point.x - xValue);
  const byDifference = differences.every(Number.isFinite);
  const xScale = (byDifference ? maximumMagnitude(differences)
    : Math.max(maximumMagnitude(positive.map(point => point.x)), Math.abs(xValue))) || 1;
  const yScale = maximumMagnitude(positive.map(point => point.y)) || 1;
  const weightScale = maximumMagnitude(positive.map(point => point.weight));
  const weightTotal = stableFiniteSum(positive.map(point => point.weight / weightScale));
  const normalized = positive.map((point, index) => ({
    x: byDifference ? differences[index] / xScale : point.x / xScale - xValue / xScale,
    y: point.y / yScale,
    weight: (point.weight / weightScale) / weightTotal
  }));
  const moments = Array.from({ length: 5 }, (_, power) =>
    stableFiniteSum(normalized.map(point => point.weight * point.x ** power)));
  const response = Array.from({ length: 3 }, (_, power) =>
    stableFiniteSum(normalized.map(point => point.weight * point.x ** power * point.y)));
  const matrix = Array.from({ length: 3 }, (_, row) =>
    Array.from({ length: 3 }, (_, column) => moments[row + column]));
  const coefficients = trySolveLinearSystem(matrix, response);
  // The fitted intercept is the prediction at centered x=0. Singular local
  // neighborhoods keep exactly their weighted constant mean, without expansion.
  return restoreFiniteScale(coefficients === undefined ? response[0] / moments[0] : coefficients[0],
    yScale, "Local quadratic prediction");
}
