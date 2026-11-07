import { cloneAndFreeze } from "../core/immutable.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateNonNegativeFinite } from "../core/validation.js";
import { buildPairedCurvePathCommands, validateCurveInterpolation, validateCardinalTension } from "./curveCommands.js";
import { flattenVariableWidthPath } from "./pathGeometry.js";

// Width is a third coordinate through the same interpolation policy as XY.
// The companion command Y values are widths; its X values are never painted.
export function sampleTrailCurve(samples, options = {}) {
  ownRecord(options, "Trail curve options"); rejectUnknownProperties(options, ["curve", "tension"], "Trail curve options");
  if (Object.values(options).some(value => value === undefined || value === null)) throw new TypeError("Trail curve options require defined values.");
  const { curve = "linear", tension } = options;
  if (Array.isArray(samples)) validateGeneratedItemLimit(samples.length, "Trail curve sample count");
  ownArray(samples, "Trail curve samples");
  validateCurveInterpolation(curve); validateCardinalTension(tension, curve);
  for (const sample of samples) {
    ownRecord(sample, "Trail curve sample"); rejectUnknownProperties(sample, ["x", "y", "width"], "Trail curve sample");
    if (!Number.isFinite(sample.x) || !Number.isFinite(sample.y)) throw new TypeError("Trail curve requires finite x/y.");
    validateNonNegativeFinite(sample.width, "Trail curve width");
  }
  const distinct = [];
  for (const sample of samples) {
    const previous = distinct.at(-1);
    if (previous?.x === sample.x && previous.y === sample.y) distinct[distinct.length - 1] = sample;
    else distinct.push(sample);
  }
  if (distinct.length < 2) return cloneAndFreeze(distinct);
  const { commands, valueCommands } = buildPairedCurvePathCommands(distinct.map(({ x, y }) => ({ x, y })), distinct.map(({ width }) => width), curve, tension);
  const result = flattenVariableWidthPath(commands, valueCommands, { maxPoints: 10_000 });
  if (result.diagnostics.length) throw new RangeError("Trail curve exceeds its bounded sampling tolerance.");
  return result.subpaths[0].points;
}
