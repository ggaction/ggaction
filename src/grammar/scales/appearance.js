import { cloneAndFreeze, isPlainObject } from "../../core/immutable.js";
import { validateUnitInterval } from "../../core/validation.js";
import { POINT_SHAPES } from "../pointShapes.js";
import {
  normalizePalette,
  resolvePalette
} from "../palettes.js";

export const DASH10 = cloneAndFreeze([
  [], [8, 4], [3, 3], [12, 4], [8, 3, 2, 3],
  [12, 3, 3, 3], [2, 2], [10, 3, 2, 3, 2, 3], [14, 4, 4, 4], [6, 2, 2, 2]
]);
export const NAMED_DASH_PATTERNS = cloneAndFreeze({
  solid: [],
  dashed: [6, 4],
  dotted: [1, 3],
  dashdot: [6, 3, 1, 3]
});

export { POINT_SHAPES } from "../pointShapes.js";
export const DEFAULT_SIZE_RANGE = cloneAndFreeze([24, 196]);
export const DEFAULT_OPACITY_RANGE = cloneAndFreeze([0.2, 1]);

export function validateColorRange(range) {
  if (range === "auto") return range;
  if (Array.isArray(range)) {
    if (
      range.length === 0 ||
      !range.every(color => typeof color === "string" && color.length > 0)
    ) {
      throw new TypeError("Color range must contain non-empty color strings.");
    }
    return cloneAndFreeze(range);
  }
  if (
    !isPlainObject(range) ||
    Object.keys(range).length !== 1 ||
    !Object.hasOwn(range, "palette")
  ) {
    throw new Error("Color range must contain only a palette descriptor.");
  }
  normalizePalette(range.palette);
  return cloneAndFreeze(range);
}

function isDashPattern(pattern) {
  return (
    Array.isArray(pattern) &&
    pattern.length % 2 === 0 &&
    pattern.every(value => Number.isFinite(value) && value >= 0) &&
    (pattern.length === 0 || pattern.some(value => value > 0))
  );
}

export function normalizeStrokeDashPattern(pattern) {
  if (typeof pattern === "string") {
    const resolved = NAMED_DASH_PATTERNS[pattern];
    if (resolved === undefined) {
      throw new Error(`Unknown stroke dash style "${pattern}".`);
    }
    return cloneAndFreeze(resolved);
  }
  if (!isDashPattern(pattern)) {
    throw new TypeError(
      "Stroke dash pattern must be a named style or an empty or nonzero even-length array of non-negative finite numbers."
    );
  }
  return cloneAndFreeze(pattern);
}

export function validateStrokeDashRange(range) {
  if (range === "auto") return range;
  if (!Array.isArray(range) || range.length === 0) {
    throw new TypeError(
      "StrokeDash range must contain one or more named styles or direct patterns."
    );
  }
  for (const pattern of range) normalizeStrokeDashPattern(pattern);
  return cloneAndFreeze(range);
}

export function validateShapeRange(range) {
  if (range === "auto") return range;
  if (
    !Array.isArray(range) ||
    range.length === 0 ||
    !range.every(shape => POINT_SHAPES.includes(shape)) ||
    new Set(range).size !== range.length
  ) {
    throw new TypeError(
      "Shape range must contain unique supported point shapes."
    );
  }
  return cloneAndFreeze(range);
}

export function validateSizeRange(range) {
  if (range === "auto") return range;
  if (
    !Array.isArray(range) ||
    range.length !== 2 ||
    !range.every(value => Number.isFinite(value) && value >= 0) ||
    range[0] > range[1]
  ) {
    throw new TypeError(
      "Size range must be an ascending pair of non-negative finite areas."
    );
  }
  return cloneAndFreeze(range);
}

export function validateOpacityRange(range) {
  if (range === "auto") return range;
  if (
    !Array.isArray(range) ||
    range.length !== 2 ||
    !range.every(value => Number.isFinite(value) && value >= 0 && value <= 1)
  ) {
    throw new TypeError(
      "Opacity range must contain two finite values from 0 to 1."
    );
  }
  return cloneAndFreeze(range);
}

export function validateOpacityValue(value, label = "Opacity") {
  return validateUnitInterval(value, label);
}

export function validateSemanticScaleRange(range) {
  if (range === "auto") return range;
  if (Array.isArray(range) && range.length > 0) return cloneAndFreeze(range);
  if (isPlainObject(range) && Object.hasOwn(range, "palette")) {
    normalizePalette(range.palette);
    return cloneAndFreeze(range);
  }
  throw new TypeError("Scale range has an unsupported value.");
}

export function resolveColorRange(range, domainCount) {
  const validated = validateColorRange(range);
  if (validated === "auto") return TABLEAU10;
  if (Array.isArray(validated)) return validated;
  return resolvePalette(validated.palette, domainCount);
}

export function resolveStrokeDashRange(range) {
  const validated = validateStrokeDashRange(range);
  return validated === "auto"
    ? DASH10
    : cloneAndFreeze(validated.map(normalizeStrokeDashPattern));
}

export function resolveShapeRange(range) {
  const validated = validateShapeRange(range);
  return validated === "auto" ? POINT_SHAPES : validated;
}

export function resolveSizeRange(range) {
  const validated = validateSizeRange(range);
  return validated === "auto" ? DEFAULT_SIZE_RANGE : validated;
}

export function resolveOpacityRange(range) {
  const validated = validateOpacityRange(range);
  return validated === "auto" ? DEFAULT_OPACITY_RANGE : validated;
}

export function mapOrdinalValues(values, domain, range, options = {}) {
  const hasUnknown = Object.hasOwn(options, "unknown");
  const indices = new Map(domain.map((value, index) => [value, index]));
  return cloneAndFreeze(values.map(value => {
    const index = indices.get(value);
    if (index === undefined) {
      if (hasUnknown) return options.unknown;
      throw new Error(`Value "${value}" is outside the ordinal domain.`);
    }
    return range[index % range.length];
  }));
}

export const TABLEAU10 = resolvePalette(
  { name: "tableau10", count: 10 },
  10
);
