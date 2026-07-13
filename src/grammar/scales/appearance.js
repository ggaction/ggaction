import { cloneAndFreeze, isPlainObject } from "../../core/immutable.js";

export const TABLEAU10 = cloneAndFreeze([
  "#4c78a8", "#f58518", "#e45756", "#72b7b2", "#54a24b",
  "#eeca3b", "#b279a2", "#ff9da6", "#9d755d", "#bab0ac"
]);

export const DASH10 = cloneAndFreeze([
  [], [8, 4], [3, 3], [12, 4], [8, 3, 2, 3],
  [12, 3, 3, 3], [2, 2], [10, 3, 2, 3, 2, 3], [14, 4, 4, 4], [6, 2, 2, 2]
]);

export const POINT_SHAPES = cloneAndFreeze(["circle", "square"]);
export const DEFAULT_SIZE_RANGE = cloneAndFreeze([24, 196]);

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
    range.palette !== "tableau10"
  ) {
    throw new Error('Color range palette must be "tableau10".');
  }
  return cloneAndFreeze(range);
}

function isDashPattern(pattern) {
  return (
    Array.isArray(pattern) &&
    pattern.length % 2 === 0 &&
    pattern.every(value => Number.isFinite(value) && value >= 0)
  );
}

export function validateStrokeDashRange(range) {
  if (range === "auto") return range;
  if (!Array.isArray(range) || range.length === 0 || !range.every(isDashPattern)) {
    throw new TypeError(
      "StrokeDash range must contain one or more even-length non-negative finite patterns."
    );
  }
  return cloneAndFreeze(range);
}

export function validateShapeRange(range) {
  if (range === "auto") return range;
  if (
    !Array.isArray(range) ||
    range.length === 0 ||
    !range.every(shape => POINT_SHAPES.includes(shape))
  ) {
    throw new TypeError('Shape range must contain only "circle" or "square".');
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

export function validateSemanticScaleRange(range) {
  if (range === "auto") return range;
  if (Array.isArray(range) && range.length > 0) return cloneAndFreeze(range);
  if (isPlainObject(range) && range.palette === "tableau10") {
    return cloneAndFreeze(range);
  }
  throw new TypeError("Scale range has an unsupported value.");
}

export function resolveColorRange(range) {
  const validated = validateColorRange(range);
  return validated === "auto" || !Array.isArray(validated)
    ? TABLEAU10
    : validated;
}

export function resolveStrokeDashRange(range) {
  const validated = validateStrokeDashRange(range);
  return validated === "auto" ? DASH10 : validated;
}

export function resolveShapeRange(range) {
  const validated = validateShapeRange(range);
  return validated === "auto" ? POINT_SHAPES : validated;
}

export function resolveSizeRange(range) {
  const validated = validateSizeRange(range);
  return validated === "auto" ? DEFAULT_SIZE_RANGE : validated;
}

export function mapOrdinalValues(values, domain, range) {
  const indices = new Map(domain.map((value, index) => [value, index]));
  return cloneAndFreeze(values.map(value => {
    const index = indices.get(value);
    if (index === undefined) {
      throw new Error(`Value "${value}" is outside the ordinal domain.`);
    }
    return range[index % range.length];
  }));
}
