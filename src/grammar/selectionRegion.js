import { ownArray, ownRecord } from "../core/ownData.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { validateGeneratedItemLimit, validateWorkLimit } from "../core/validation.js";
import { normalizeOrderedRange, orderedRangeContains } from "./orderedRange.js";
import { isNominalValue } from "./scales/fields.js";
import { transformHitPoint } from "./hitCoordinates.js";

const CHANNELS = Object.freeze(["x", "y", "x2", "y2", "theta"]);
const IDENTITY = Object.freeze([1, 0, 0, 1, 0, 0]);
export const FULL_ANGLE = 2 * Math.PI;

function budget() {
  let work = 0;
  return count => validateWorkLimit(work += count, "Selection region work");
}
function array(value, label, maximum = 10_000) {
  if (!Array.isArray(value)) throw new TypeError(`${label} requires an array.`);
  validateGeneratedItemLimit(value.length, label, maximum);
  ownArray(value, label);
  return value;
}

export function normalizeSelectionRegion(value) {
  ownRecord(value, "Selection region");
  const axes = Object.keys(value), spend = budget(), result = {};
  if (!axes.length || axes.some(axis => !CHANNELS.includes(axis)) || (axes.includes("theta") && axes.length !== 1)) {
    throw new TypeError("Selection region requires Cartesian position or theta channels.");
  }
  for (const axis of axes) {
    const input = ownRecord(value[axis], "Selection region axis");
    const keys = Object.keys(input);
    if (keys.length !== 1 || !["ranges", "values"].includes(keys[0])) throw new TypeError("Selection region axis requires ranges or category values.");
    if (keys[0] === "ranges") {
      const ranges = array(input.ranges, "Selection region ranges", 2).map(range => {
        const normalized = normalizeOrderedRange(range, "Selection region range");
        if (!Object.hasOwn(normalized, "min") || !Object.hasOwn(normalized, "max") || !Number.isFinite(normalized.min) || !Number.isFinite(normalized.max)) {
          throw new TypeError("Selection region ranges require finite numeric endpoints.");
        }
        return normalized;
      });
      if (ranges.length === 2 && (ranges[0].max > ranges[1].min || (ranges[0].max === ranges[1].min && ranges[0].maxInclusive && ranges[1].minInclusive))) throw new RangeError("Selection region ranges must be ordered and non-overlapping.");
      result[axis] = { ranges };
    } else {
      const values = array(input.values, "Selection region category values");
      spend(values.length);
      for (const item of values) {
        if (!isNominalValue(item)) throw new TypeError("Selection region categories require finite scalar values.");
        spend(typeof item === "string" ? item.length : 1);
      }
      result[axis] = { values: [...new Set(values)] };
    }
  }
  return cloneAndFreeze(result);
}

export function selectRegionItemKeys(items, region) {
  const normalized = normalizeSelectionRegion(region), axes = Object.entries(normalized), spend = budget();
  array(items, "Selection region items", 50_000);
  spend(items.length * axes.reduce((sum, [, axis]) => sum + (Object.hasOwn(axis, "ranges") ? axis.ranges.length : axis.values.length) + 1, 0));
  const keys = new Set(), selected = [];
  for (const item of items) {
    ownRecord(item, "Selection region item");
    if (!Object.hasOwn(item, "key") || typeof item.key !== "string" || !item.key.length || keys.has(item.key) || !Object.hasOwn(item, "channels")) {
      throw new TypeError("Selection region items require unique logical keys and channels.");
    }
    spend(item.key.length); keys.add(item.key); ownRecord(item.channels, "Selection region item channels");
    const match = axes.every(([axis, predicate]) => Object.hasOwn(item.channels, axis) &&
      (Object.hasOwn(predicate, "ranges") ? predicate.ranges.some(range => orderedRangeContains(item.channels[axis], range)) : predicate.values.includes(item.channels[axis])));
    if (match) selected.push(item.key);
  }
  for (const [axis] of axes) if (items.length && !items.some(item => Object.hasOwn(item.channels, axis))) {
    throw new Error(`Selection region channel "${axis}" is not defined at the final item grain.`);
  }
  return Object.freeze(selected);
}

// Angles are explicit radians in [0, 2π). The directed clockwise interval
// crosses the seam as two ranges. Equal endpoints mean empty, never a turn.
export function angularBrushIntervals(start, end) {
  if (![start, end].every(value => Number.isFinite(value) && value >= 0 && value < FULL_ANGLE)) throw new RangeError("Angular brush requires radians from zero inclusive to two pi exclusive.");
  if (start === end) return Object.freeze([]);
  return cloneAndFreeze(start < end ? [{ min: start, max: end, minInclusive: true, maxInclusive: true }]
    : [{ min: 0, max: end, minInclusive: true, maxInclusive: true }, { min: start, max: FULL_ANGLE, minInclusive: true, maxInclusive: false }]);
}

export function normalizeScreenPolygon(value) {
  array(value, "Screen polygon points");
  const points = [];
  for (const input of value) {
    const point = transformHitPoint(IDENTITY, input), previous = points.at(-1);
    if (!previous || point.x !== previous.x || point.y !== previous.y) points.push(point);
  }
  if (points.length > 1 && points[0].x === points.at(-1).x && points[0].y === points.at(-1).y) points.pop();
  return Object.freeze(points);
}

