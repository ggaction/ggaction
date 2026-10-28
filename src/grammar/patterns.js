import { validateGeneratedItemLimit } from "../core/validation.js";
import { validatePathCommandCount } from "./pathCommands.js";
import { buildPolarCircleCommands } from "./polarPaths.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { validateKeys, validateNonNegativeFinite, validatePositiveFinite, validateWorkLimit } from "../core/validation.js";
import { parsePaintColor } from "./color.js";

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
  parsePaintColor(value);
  return value;
}

function wrap(value, pitch) {
  const remainder = value % pitch;
  const positive = remainder < 0 ? remainder + pitch : remainder;
  // Negative zero and a rounded upper endpoint denote the same tile origin.
  return positive === 0 || positive === pitch ? 0 : positive;
}

export function normalizePatternOptions(options = {}) {
  ownRecord(options, "Pattern options");
  options = Object.assign(Object.create(null), options);
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

// Lower the existing unit tile into a single nonzero foreground. The caller owns
// the glyph clip and applies foreground alpha once to the compound union.
export function patternFillGeometry(options, bounds, origin) {
  ownRecord(bounds, "Pattern bounds");
  validateKeys(bounds, ["left", "right", "top", "bottom"], "Pattern bounds");
  if (!["left", "right", "top", "bottom"].every(key => Object.hasOwn(bounds, key)) ||
      ![bounds.left, bounds.right, bounds.top, bounds.bottom].every(Number.isFinite) ||
      bounds.left > bounds.right || bounds.top > bounds.bottom) {
    throw new TypeError("Pattern bounds must be finite and ordered.");
  }
  pair(origin, "Pattern origin");
  const tile = createPatternTile(options);
  if (bounds.left === bounds.right || bounds.top === bounds.bottom ||
      tile.polygons.length === 0 && tile.circles.length === 0) {
    return cloneAndFreeze({ commands: [], tiles: 0, workItems: 0 });
  }
  if (!tile.repeat || tile.polygons.length === 1 && tile.polygons[0].length === 4 &&
      tile.polygons[0][0][0] === 0 && tile.polygons[0][0][1] === 0 &&
      tile.polygons[0][2][0] === 1 && tile.polygons[0][2][1] === 1) {
    return cloneAndFreeze({ commands: [
      { op: "M", x: bounds.left, y: bounds.top }, { op: "L", x: bounds.right, y: bounds.top },
      { op: "L", x: bounds.right, y: bounds.bottom }, { op: "L", x: bounds.left, y: bounds.bottom }, { op: "Z" }
    ], tiles: 1, workItems: 5 });
  }
  const pitch = tile.options.pitch;
  const x0 = Math.floor((bounds.left - origin[0]) / pitch) - 1;
  const x1 = Math.ceil((bounds.right - origin[0]) / pitch);
  const y0 = Math.floor((bounds.top - origin[1]) / pitch) - 1;
  const y1 = Math.ceil((bounds.bottom - origin[1]) / pitch);
  if (![x0, x1, y0, y1].every(Number.isSafeInteger)) {
    throw new RangeError("Pattern repeat indices exceed finite integer precision.");
  }
  const tiles = (x1 - x0 + 1) * (y1 - y0 + 1);
  validateGeneratedItemLimit(tiles, "Pattern tile count");
  // Whole circles at lattice vertices are equivalent to the unit tile's clipped
  // corner quarters. Each occurs once; overlapping disks share the same winding.
  const dots = tile.circles.length > 0;
  const perTile = dots ? 6 : tile.polygons.reduce((sum, polygon) => sum + polygon.length + 1, 0);
  const commandCount = tiles * perTile;
  validatePathCommandCount(commandCount, "Pattern command count");
  validateWorkLimit(tiles + commandCount, "Pattern geometry work");
  const commands = [];
  for (let row = y0; row <= y1; row += 1) {
    for (let column = x0; column <= x1; column += 1) {
      const x = origin[0] + column * pitch, y = origin[1] + row * pitch;
      if (dots) {
        const radius = tile.circles[0].radius * pitch;
        commands.push(...buildPolarCircleCommands({ centerX: x, centerY: y, availableRadius: radius }, radius));
      } else {
        for (const polygon of tile.polygons) {
          commands.push(...polygon.map(([px, py], index) => ({
            op: index === 0 ? "M" : "L", x: x + px * pitch, y: y + py * pitch
          })), { op: "Z" });
        }
      }
    }
  }
  if (commands.some(command => Object.entries(command).some(([key, value]) => key !== "op" && !Number.isFinite(value)))) {
    throw new RangeError("Pattern commands exceed finite coordinates.");
  }
  return cloneAndFreeze({ commands, tiles, workItems: tiles + commandCount });
}

// The same cumulative paint budget applies before any backend starts drawing.
export function validatePatternWork(work) {
  return validateWorkLimit(work, "Pattern geometry work");
}
