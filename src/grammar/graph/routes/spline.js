import { cloneAndFreeze } from "../../../core/immutable.js";
import { ownRecord } from "../../../core/ownData.js";
import { annotateError } from "../../../core/diagnostics.js";
import { rejectUnknownProperties } from "../../../core/validation.js";
import { interpolateNumber } from "../../numeric.js";
import { flattenPathCommands } from "../../pathGeometry.js";
import { validateRoutePoints } from "./polyline.js";

export function normalizeSplineOptions(input = {}) {
  ownRecord(input, "Spline options");
  rejectUnknownProperties(input, ["tolerance", "maxSubdivisions"], "spline options");
  const tolerance = input.tolerance === undefined ? 0.001 : input.tolerance;
  const maxSubdivisions = input.maxSubdivisions === undefined ? 4096 : input.maxSubdivisions;
  if (!Number.isFinite(tolerance) || tolerance <= 0) throw new RangeError("Spline tolerance must be positive and finite.");
  if (!Number.isSafeInteger(maxSubdivisions) || maxSubdivisions < 1 || maxSubdivisions > 4096) throw new RangeError("Spline maxSubdivisions must be an integer from 1 to 4096.");
  return Object.freeze({ tolerance, maxSubdivisions });
}

function evaluate(points, knots, degree, t) {
  if (t === 0) return points[0];
  if (t === 1) return points.at(-1);
  let low = degree, high = points.length;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (knots[middle] <= t) low = middle; else high = middle;
  }
  const values = points.slice(low - degree, low + 1).map(point => ({ ...point }));
  for (let depth = 1; depth <= degree; depth++) for (let index = degree; index >= depth; index--) {
    const left = knots[low - degree + index], right = knots[low + 1 + index - depth];
    const proportion = (t - left) / (right - left);
    const a = values[index - 1], b = values[index];
    values[index] = { x: interpolateNumber(a.x, b.x, proportion), y: interpolateNumber(a.y, b.y, proportion) };
  }
  return values[degree];
}

// Each knot span is one polynomial of degree <= 3. End values and derivatives
// convert it exactly to a cubic before the shared convex-hull flattening owner
// applies the normalized tolerance and the caller's total point budget.
export function sampleClampedSpline(points, input, budget, heldSamples = 0) {
  const options = normalizeSplineOptions(input);
  if (!Number.isSafeInteger(heldSamples) || heldSamples < 0) throw new RangeError("Spline held samples require a nonnegative safe integer.");
  validateRoutePoints(points, budget.limits.maxSamples);
  budget.samples(heldSamples + points.length + 2);
  budget.charge(points.length * 64);
  const degree = Math.min(3, points.length - 1), count = points.length;
  const knots = Array.from({ length: count + degree + 1 }, (_, index) => index <= degree ? 0 : index >= count ? 1 : (index - degree) / (count - degree));
  const derivative = points.slice(1).map((point, index) => {
    const factor = degree / (knots[index + degree + 1] - knots[index + 1]);
    return { x: factor * (point.x - points[index].x), y: factor * (point.y - points[index].y) };
  });
  const derivativeKnots = knots.slice(1, -1);
  const commands = [{ op: "M", ...points[0] }];
  for (let index = degree; index < count; index++) {
    const start = knots[index], end = knots[index + 1], step = (end - start) / 3;
    const a = evaluate(points, knots, degree, start), b = evaluate(points, knots, degree, end);
    const da = evaluate(derivative, derivativeKnots, degree - 1, start), db = evaluate(derivative, derivativeKnots, degree - 1, end);
    commands.push({ op: "C", x1: a.x + step * da.x, y1: a.y + step * da.y, x2: b.x - step * db.x, y2: b.y - step * db.y, x: b.x, y: b.y });
  }
  const maxPoints = Math.min(options.maxSubdivisions + 1, budget.limits.maxSamples - heldSamples - points.length);
  const sampled = flattenPathCommands(commands, { tolerance: options.tolerance, maxPoints });
  if (sampled.diagnostics.length) throw annotateError(new RangeError("Spline subdivision or sample budget exceeded."), { code: "resource-limit", optionPath: "maxSubdivisions", limit: maxPoints - 1 });
  const samples = sampled.subpaths[0].points;
  budget.samples(heldSamples + points.length + samples.length);
  budget.charge(samples.length * 8);
  return cloneAndFreeze({ points: samples, degree, subdivisions: samples.length - 1 });
}
