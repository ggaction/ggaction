import { cloneAndFreeze } from "../core/immutable.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { validateKeys, validateNonNegativeFinite, validatePositiveFinite, validateWorkLimit } from "../core/validation.js";
import { validateFillPaint } from "./paint.js";

export const PATTERN_STYLES = Object.freeze([
  "solid", "diagonal", "antidiagonal", "horizontal", "vertical", "cross", "dots"
]);
const OPTIONS = Object.freeze([
  "style", "pitch", "strokeWidth", "phase", "foreground", "background", "coordinateSpace"
]);

function pair(value, label) {
  ownArray(value, label);
  if (value.length !== 2 || !value.every(Number.isFinite)) {
    throw new TypeError(`${label} requires two finite numbers.`);
  }
  return value;
}

function solidColor(value, label) {
  if (typeof value !== "string") throw new TypeError(`${label} requires a solid color string.`);
  validateWorkLimit(value.length, `${label} length`);
  return validateFillPaint(value, label);
}

function wrap(value, pitch) {
  const remainder = value % pitch;
  const positive = remainder < 0 ? remainder + pitch : remainder;
  // Negative zero and a rounded upper endpoint denote the same tile origin.
  return positive === 0 || positive === pitch ? 0 : positive;
}

export function normalizePatternOptions(options = {}) {
  ownRecord(options, "Pattern options");
  validateKeys(options, OPTIONS, "Pattern");
  if (Object.values(options).some(value => value === undefined)) {
    throw new TypeError("Pattern options cannot contain explicit undefined.");
  }
  const {
    style = "solid", pitch = 8, strokeWidth = 1, phase = [0, 0],
    foreground = "#000000", background = "transparent", coordinateSpace = "plot"
  } = options;
  if (!PATTERN_STYLES.includes(style)) throw new TypeError("Unsupported pattern style.");
  validatePositiveFinite(pitch, "Pattern pitch");
  validateNonNegativeFinite(strokeWidth, "Pattern strokeWidth");
  pair(phase, "Pattern phase");
  if (coordinateSpace !== "plot" && coordinateSpace !== "object") {
    throw new TypeError("Pattern coordinateSpace requires plot or object.");
  }
  return cloneAndFreeze({
    style, pitch, strokeWidth: strokeWidth === 0 ? 0 : strokeWidth,
    phase: phase.map(value => wrap(value, pitch)),
    foreground: solidColor(foreground, "Pattern foreground"),
    background: solidColor(background, "Pattern background"), coordinateSpace
  });
}

function rectangle(left, top, right, bottom) {
  return [[left, top], [right, top], [right, bottom], [left, bottom]];
}

function clip(polygon, distance) {
  const output = [];
  let previous = polygon.at(-1), previousDistance = distance(previous);
  for (const current of polygon) {
    const currentDistance = distance(current);
    if ((previousDistance < 0) !== (currentDistance < 0)) {
      const fraction = previousDistance / (previousDistance - currentDistance);
      output.push(previous.map((value, index) =>
        Math.max(0, Math.min(1, value + fraction * (current[index] - value)))));
    }
    if (currentDistance >= 0) output.push(current);
    previous = current;
    previousDistance = currentDistance;
  }
  return output;
}

function canonicalPolygon(polygon) {
  const first = polygon.reduce((best, point, index) =>
    point[0] < polygon[best][0] || point[0] === polygon[best][0] && point[1] < polygon[best][1]
      ? index : best, 0);
  return [...polygon.slice(first), ...polygon.slice(0, first)];
}

function geometry({ style, pitch, strokeWidth }) {
  const square = rectangle(0, 0, 1, 1);
  if (style === "solid") return { polygons: [square], circles: [] };
  if (strokeWidth === 0) return { polygons: [], circles: [] };
  const diagonal = style === "diagonal" || style === "antidiagonal";
  const threshold = diagonal ? Math.SQRT1_2 : style === "dots" ? Math.SQRT2 : 1;
  // Compare bounded ratios before division: finite inputs may have an infinite
  // direct strokeWidth / pitch ratio. Wide ink is exactly the full unit tile.
  const scale = Math.max(pitch, strokeWidth);
  const width = strokeWidth / scale, spacing = pitch / scale;
  if (width >= threshold * spacing) return { polygons: [square], circles: [] };
  const ratio = width / spacing;
  const half = ratio / 2;
  if (half === 0) throw new RangeError("Pattern strokeWidth is too small relative to pitch to represent.");
  if (style === "dots") {
    return { polygons: [], circles: [[0, 0], [1, 0], [0, 1], [1, 1]]
      .map(([x, y]) => ({ x, y, radius: half })) };
  }
  if (diagonal) {
    const distance = style === "diagonal" ? ([x, y]) => y - x : ([x, y]) => y + x;
    const centers = style === "diagonal" ? [-1, 0, 1] : [0, 1, 2];
    const extent = ratio / Math.SQRT2;
    if (centers.some(center => center - extent === center || center + extent === center)) {
      throw new RangeError("Pattern strokeWidth is too small relative to pitch to represent.");
    }
    return { polygons: centers.map(center => canonicalPolygon(clip(
      clip(square, point => distance(point) - (center - extent)),
      point => center + extent - distance(point)))), circles: [] };
  }
  if (1 - half === 1) throw new RangeError("Pattern strokeWidth is too small relative to pitch to represent.");
  const horizontal = [rectangle(0, 0, 1, half), rectangle(0, 1 - half, 1, 1)];
  if (style === "horizontal") return { polygons: horizontal, circles: [] };
  if (style === "vertical") return {
    polygons: [rectangle(0, 0, half, 1), rectangle(1 - half, 0, 1, 1)], circles: []
  };
  // Cross stripes partition their overlap. All contours still have the same
  // winding and are lowered as ONE compound fill, never separate alpha layers.
  return { polygons: [...horizontal,
    rectangle(0, half, half, 1 - half), rectangle(1 - half, half, 1, 1 - half)], circles: [] };
}

export function createPatternTile(options = {}) {
  const normalized = normalizePatternOptions(options);
  return cloneAndFreeze({
    options: normalized, repeat: normalized.style !== "solid",
    bounds: { x: 0, y: 0, width: 1, height: 1 }, fillRule: "nonzero",
    ...geometry(normalized)
  });
}

export function resolvePatternOrigin(options, origins) {
  const normalized = normalizePatternOptions(options);
  ownRecord(origins, "Pattern origins");
  validateKeys(origins, ["plot", "object"], "Pattern origin");
  for (const [key, value] of Object.entries(origins)) pair(value, `Pattern ${key} origin`);
  if (!Object.hasOwn(origins, normalized.coordinateSpace)) {
    throw new TypeError(`Pattern requires an explicit ${normalized.coordinateSpace} origin.`);
  }
  const origin = origins[normalized.coordinateSpace].map((value, index) => value + normalized.phase[index]);
  if (!origin.every(Number.isFinite)) throw new RangeError("Pattern origin exceeds finite coordinates.");
  return Object.freeze(origin.map(value => value === 0 ? 0 : value));
}
