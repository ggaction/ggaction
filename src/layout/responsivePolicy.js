import { cloneAndFreeze } from "../core/immutable.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { validateGeneratedItemLimit, validateNonEmptyString, validatePositiveFinite,
  validateKeys } from "../core/validation.js";

export const RESPONSIVE_ITERATIONS = 4;
export const RESPONSIVE_TOLERANCE = 0.1;
const SIDES = Object.freeze(["left", "right", "top", "bottom"]);

function record(value, keys, label) {
  ownRecord(value, label);
  validateKeys(value, keys, label);
  return value;
}

function size(value, label) {
  record(value, ["width", "height"], label);
  validatePositiveFinite(value.width, `${label} width`);
  validatePositiveFinite(value.height, `${label} height`);
  return { width: value.width, height: value.height };
}

function bounds(value, label, positive = false) {
  record(value, SIDES, label);
  if (!SIDES.every(side => Number.isFinite(value[side]))) throw new TypeError(`${label} must be finite.`);
  const width = value.right - value.left, height = value.bottom - value.top;
  if (![width, height].every(Number.isFinite) || width < 0 || height < 0 || positive && (width === 0 || height === 0)) {
    throw new RangeError(`${label} requires ordered finite bounds${positive ? " with positive area" : ""}.`);
  }
  return Object.fromEntries(SIDES.map(side => [side, value[side] === 0 ? 0 : value[side]]));
}

function snapshot(value) {
  record(value, ["plot", "occupied", "lanes"], "Layout snapshot");
  const plot = bounds(value.plot, "Layout plot", true);
  const occupied = bounds(value.occupied, "Layout occupied bounds");
  ownArray(value.lanes, "Layout lanes");
  validateGeneratedItemLimit(value.lanes.length, "Layout lane count");
  const seen = new Set();
  const lanes = value.lanes.map(lane => {
    record(lane, ["id", "bounds"], "Layout lane");
    validateNonEmptyString(lane.id, "Layout lane id");
    if (seen.has(lane.id)) throw new Error("Layout lane ids must be distinct.");
    seen.add(lane.id);
    return { id: lane.id, bounds: bounds(lane.bounds, "Layout lane bounds") };
  }).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return { plot, occupied, lanes };
}

function difference(left, right) {
  if (left.lanes.length !== right.lanes.length || left.lanes.some((lane, index) => lane.id !== right.lanes[index].id)) return null;
  const a = [left.plot, left.occupied, ...left.lanes.map(lane => lane.bounds)];
  const b = [right.plot, right.occupied, ...right.lanes.map(lane => lane.bounds)];
  let maximum = 0;
  for (let index = 0; index < a.length; index += 1) for (const side of SIDES) {
    maximum = Math.max(maximum, Math.abs(a[index][side] - b[index][side]));
  }
  return Number.isFinite(maximum) ? maximum : null;
}

function contained(inner, outer) {
  return inner.left >= outer.left && inner.right <= outer.right &&
    inner.top >= outer.top && inner.bottom <= outer.bottom;
}

// A bounded reducer over measured passes, not a callback runner or semantic
// compiler. The action owns each explicit materialization pass and its trace.
export function evaluateResponsiveLayout(passes, options) {
  ownArray(passes, "Layout passes");
  if (passes.length < 1 || passes.length > RESPONSIVE_ITERATIONS) {
    throw new RangeError(`Layout requires one through ${RESPONSIVE_ITERATIONS} measured passes.`);
  }
  record(options, ["canvas", "minPlotSize"], "Responsive layout");
  const canvas = size(options.canvas, "Responsive Canvas"), minimum = size(options.minPlotSize, "Responsive minimum plot");
  const samples = passes.map(snapshot), last = samples.at(-1), previous = samples.at(-2);
  const canvasBounds = { left: 0, right: canvas.width, top: 0, bottom: canvas.height };
  const width = last.plot.right - last.plot.left, height = last.plot.bottom - last.plot.top;
  const requiredWidth = canvas.width + Math.max(0, minimum.width - width);
  const requiredHeight = canvas.height + Math.max(0, minimum.height - height);
  const required = { left: 0, right: requiredWidth, top: 0, bottom: requiredHeight };
  for (const item of [last.occupied, last.plot, ...last.lanes.map(lane => lane.bounds)]) {
    required.left = Math.min(required.left, item.left);
    required.right = Math.max(required.right, item.right);
    required.top = Math.min(required.top, item.top);
    required.bottom = Math.max(required.bottom, item.bottom);
  }
  const requiredBounds = bounds(required, "Required layout bounds");
  const change = previous === undefined ? null : difference(last, previous);
  const converged = change !== null && change <= RESPONSIVE_TOLERANCE;
  const fits = width >= minimum.width && height >= minimum.height &&
    contained(last.plot, canvasBounds) && contained(last.occupied, canvasBounds) &&
    last.lanes.every(lane => contained(lane.bounds, canvasBounds));
  const oscillates = !converged && samples.slice(0, -2).some(sample => {
    const distance = difference(last, sample);
    return distance !== null && distance <= RESPONSIVE_TOLERANCE;
  });
  const reason = converged ? fits ? "converged" : "insufficient-space"
    : oscillates ? "oscillation" : passes.length === RESPONSIVE_ITERATIONS ? "iteration-limit" : "measuring";
  const status = reason === "converged" ? "satisfied" : reason === "measuring" ? "continue" : "unsatisfied";
  return cloneAndFreeze({ status, reason, iterations: passes.length, change, requiredBounds,
    requiredPlotSize: minimum, snapshot: last });
}
