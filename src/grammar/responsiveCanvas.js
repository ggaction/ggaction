import { cloneAndFreeze } from "../core/immutable.js";
import { canonicalJSON } from "../core/contentDigest.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { validateGeneratedItemLimit, validateKeys, validatePositiveFinite, validateNonEmptyString } from "../core/validation.js";

export const MINIMUM_PLOT_SIZE = Object.freeze({ width: 160, height: 120 });

export function normalizeResponsiveCanvas(value) {
  if (value === false) return undefined;
  ownRecord(value, "Canvas responsive");
  validateKeys(value, ["minPlotSize"], "Canvas responsive");
  const minimum = Object.hasOwn(value, "minPlotSize") ? value.minPlotSize : MINIMUM_PLOT_SIZE;
  ownRecord(minimum, "Responsive minPlotSize");
  validateKeys(minimum, ["width", "height"], "Responsive minPlotSize");
  validatePositiveFinite(minimum.width, "Responsive minPlotSize width");
  validatePositiveFinite(minimum.height, "Responsive minPlotSize height");
  return cloneAndFreeze({ minPlotSize: { width: minimum.width, height: minimum.height } });
}

function storedBounds(value, positive = false) {
  ownRecord(value, "Responsive bounds");
  validateKeys(value, ["left", "right", "top", "bottom"], "Responsive bounds");
  const width = value.right - value.left, height = value.bottom - value.top;
  if (![value.left, value.right, value.top, value.bottom, width, height].every(Number.isFinite) ||
      width < 0 || height < 0 || positive && (width === 0 || height === 0)) {
    throw new Error("Responsive bounds must be ordered and finite.");
  }
}

// Restoration validates stored decisions; it never runs layout or measures text.
export function validateResponsiveCanvasState(config, canvas) {
  const policy = config?.responsive, result = config?.responsiveResult;
  if (policy === undefined) {
    if (result !== undefined) throw new Error("Responsive result requires Canvas policy.");
    return;
  }
  const normalized = normalizeResponsiveCanvas(policy);
  if (canonicalJSON(normalized) !== canonicalJSON(policy) || config.plot !== undefined) {
    throw new Error("Stored responsive Canvas policy must be canonical and use fixed dimensions.");
  }
  ownRecord(result, "Responsive result");
  validateKeys(result, ["status", "reason", "iterations", "change", "requiredBounds", "requiredPlotSize", "snapshot"], "Responsive result");
  normalizeResponsiveCanvas({ minPlotSize: result.requiredPlotSize });
  if (result.status !== "satisfied" || result.reason !== "converged" ||
      !Number.isInteger(result.iterations) || result.iterations < 2 || result.iterations > 4 ||
      !Number.isFinite(result.change) || result.change < 0 || result.change > 0.1 ||
      canonicalJSON(result.requiredPlotSize) !== canonicalJSON(policy.minPlotSize)) {
    throw new Error("Stored responsive result must describe a bounded, satisfied solve.");
  }
  storedBounds(result.requiredBounds);
  const snapshot = result.snapshot;
  ownRecord(snapshot, "Responsive snapshot");
  validateKeys(snapshot, ["plot", "occupied", "lanes"], "Responsive snapshot");
  storedBounds(snapshot.plot, true);
  storedBounds(snapshot.occupied);
  ownArray(snapshot.lanes, "Responsive lanes");
  validateGeneratedItemLimit(snapshot.lanes.length, "Responsive lane count");
  const ids = new Set();
  for (const lane of snapshot.lanes) {
    ownRecord(lane, "Responsive lane");
    validateKeys(lane, ["id", "bounds"], "Responsive lane");
    validateNonEmptyString(lane.id, "Responsive lane id");
    if (ids.has(lane.id)) throw new Error("Responsive lanes require distinct ids.");
    ids.add(lane.id);
    storedBounds(lane.bounds);
  }
  validatePositiveFinite(canvas?.width, "Responsive Canvas width");
  validatePositiveFinite(canvas?.height, "Responsive Canvas height");
  const tolerance = Number.EPSILON * 16 * Math.max(1, canvas.width, canvas.height);
  for (const bounds of [snapshot.plot, snapshot.occupied, ...snapshot.lanes.map(lane => lane.bounds)]) {
    if (bounds.left < -tolerance || bounds.top < -tolerance ||
        bounds.right > canvas.width + tolerance || bounds.bottom > canvas.height + tolerance) {
      throw new Error("Stored responsive geometry must fit the Canvas.");
    }
  }
  const plot = snapshot.plot;
  if (plot.left < config.margin.left || plot.top < config.margin.top ||
      plot.right > canvas.width - config.margin.right || plot.bottom > canvas.height - config.margin.bottom ||
      plot.right - plot.left < policy.minPlotSize.width || plot.bottom - plot.top < policy.minPlotSize.height) {
    throw new Error("Stored responsive plot must preserve authored margins and minimum size.");
  }
  const all = [snapshot.plot, snapshot.occupied, ...snapshot.lanes.map(lane => lane.bounds)];
  const required = { left: Math.min(0, ...all.map(bounds => bounds.left)),
    right: Math.max(canvas.width, ...all.map(bounds => bounds.right)),
    top: Math.min(0, ...all.map(bounds => bounds.top)),
    bottom: Math.max(canvas.height, ...all.map(bounds => bounds.bottom)) };
  if (canonicalJSON(required) !== canonicalJSON(result.requiredBounds)) {
    throw new Error("Stored responsive required bounds must include the final Canvas and geometry.");
  }
}
