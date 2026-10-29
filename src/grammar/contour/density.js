import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { DENSITY_KERNEL_FUNCTIONS } from "../densityKernels.js";
import { validateDensityKernel, validateDensityNormalization } from "../density.js";
import { stableFiniteSum, requireFiniteResult } from "../numeric.js";
import { findHistogramBinIndex } from "../histogram.js";
import { normalizeContourFrame } from "./grid.js";

function normalizePoints(input) {
  if (Array.isArray(input)) validateGeneratedItemLimit(input.length, "Contour density point count");
  ownArray(input, "Contour density points");
  return input.map(point => {
    ownRecord(point, "Contour density point");
    rejectUnknownProperties(point, ["x", "y", "weight"], "contour density point");
    const weight = Object.hasOwn(point, "weight") ? point.weight : 1;
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(weight) || weight < 0) {
      throw new TypeError("Contour density points require finite x/y and a nonnegative finite weight.");
    }
    return { x: point.x, y: point.y, weight };
  });
}

function histogram(points, frame, unit) {
  const area = frame.dx * frame.dy;
  if (!Number.isFinite(area) || area <= 0) throw new RangeError("Contour histogram bin area must be positive and finite.");
  const boundaries = ["x", "y"].map((axis, index) => {
    const step = index === 0 ? frame.dx : frame.dy, count = index === 0 ? frame.width : frame.height;
    const edges = Array.from({ length: count + 1 }, (_, number) => frame.origin[index] + (number - 0.5) * step);
    if (edges.some((value, number) => !Number.isFinite(value) || number > 0 && value <= edges[number - 1])) {
      throw new RangeError(`Contour histogram ${axis} bin boundaries must be distinguishable.`);
    }
    return edges;
  });
  const bins = Array.from({ length: frame.width * frame.height }, () => []);
  for (const point of points) {
    const x = findHistogramBinIndex(point.x, boundaries[0]), y = findHistogramBinIndex(point.y, boundaries[1]);
    if (x < 0 || y < 0) throw new RangeError("Contour histogram grid must contain every point.");
    bins[y * frame.width + x].push(point.weight);
  }
  return bins.map(weights => requireFiniteResult(stableFiniteSum(weights, "Contour bin weight", { compensated: true }) / unit / area, "Contour histogram density"));
}

function kde(points, frame, unit, options) {
  const kernel = DENSITY_KERNEL_FUNCTIONS[options.kernel];
  validateWorkLimit(points.length * frame.width * frame.height, "Contour density estimation work");
  const [hx, hy] = options.bandwidth;
  const area = hx * hy;
  const distance = (value, origin, bandwidth) => Number.isFinite(value - origin)
    ? (value - origin) / bandwidth : value / bandwidth - origin / bandwidth;
  return Array.from({ length: frame.width * frame.height }, (_, index) => {
    const x = frame.origin[0] + index % frame.width * frame.dx;
    const y = frame.origin[1] + Math.floor(index / frame.width) * frame.dy;
    const contributions = points.map(point => point.weight / unit * kernel(distance(x, point.x, hx)) * kernel(distance(y, point.y, hy)));
    const sum = stableFiniteSum(contributions, "Contour kernel sum", { compensated: true });
    return requireFiniteResult(Number.isFinite(area) && area > 0 ? sum / area : sum / hx / hy, "Contour KDE density");
  });
}

export function estimateContourDensity(input, options) {
  options = normalizeContourDensityOptions(options);
  const frame = options.grid, points = normalizePoints(input);
  const normalization = options.normalization;
  const totalWeight = stableFiniteSum(points.map(point => point.weight), "Contour density total weight", { compensated: true });
  const unit = normalization === "unit" && totalWeight > 0 ? totalWeight : 1;
  const values = options.estimator === "histogram" ? histogram(points, frame, unit) : kde(points, frame, unit, options);
  return cloneAndFreeze({ grid: { ...frame, values }, estimator: options.estimator, normalization,
    ...(options.estimator === "kde" ? { bandwidth: options.bandwidth, kernel: options.kernel } : {}), totalWeight, sourceCount: points.length });
}

export function normalizeContourDensityOptions(options) {
  ownRecord(options, "Contour density options");
  rejectUnknownProperties(options, ["estimator", "grid", "normalization", "bandwidth", "kernel"], "contour density");
  if (!["histogram", "kde"].includes(options.estimator)) throw new TypeError("Contour estimator must be histogram or kde.");
  if (options.estimator === "histogram" && (Object.hasOwn(options, "bandwidth") || Object.hasOwn(options, "kernel"))) {
    throw new TypeError("Contour histogram does not accept bandwidth or kernel.");
  }
  const frame = normalizeContourFrame(options.grid);
  const normalization = validateDensityNormalization(options.normalization);
  if (options.estimator === "kde") {
    if (Array.isArray(options.bandwidth) && options.bandwidth.length !== 2) throw new RangeError("Contour KDE bandwidth requires two positive finite numbers.");
    ownArray(options.bandwidth, "Contour density bandwidth");
    if (options.bandwidth.length !== 2 || options.bandwidth.some(value => !Number.isFinite(value) || value <= 0)) {
      throw new RangeError("Contour KDE bandwidth requires two positive finite numbers.");
    }
    validateDensityKernel(options.kernel);
  }
  return cloneAndFreeze({ estimator: options.estimator, grid: frame, normalization,
    ...(options.estimator === "kde" ? { bandwidth: options.bandwidth, kernel: options.kernel } : {}) });
}
