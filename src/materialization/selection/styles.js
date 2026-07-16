import { isPlainObject } from "../../core/immutable.js";
import { validateKeys } from "../../core/validation.js";
import { validatePointShape } from "../../grammar/pointShapes.js";
import { normalizeStrokeDashPattern } from "../../grammar/scales.js";
import { DEFAULT_COLORS } from "../../theme/defaults.js";

const DEFAULT_POINT_SIZE = 2;
const DEFAULT_DIM_OPACITY = 0.25;

export function validateUnitInterval(value, label) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${label} must be between 0 and 1.`);
  }
  return value;
}

function validatePositive(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive finite number.`);
  }
  return value;
}

function validateNonNegative(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative finite number.`);
  }
  return value;
}

function validateColor(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

function normalizeOffset(offset) {
  if (offset === undefined) return { x: 0, y: 0 };
  if (!isPlainObject(offset)) {
    throw new TypeError("Highlight offset must be a plain object.");
  }
  validateKeys(offset, ["x", "y"], "highlight offset");
  const x = offset.x ?? 0;
  const y = offset.y ?? 0;
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new TypeError("Highlight offset x and y must be finite numbers.");
  }
  return { x, y };
}

export function normalizeDimOthers(dimOthers) {
  if (dimOthers === undefined || dimOthers === false) return false;
  if (dimOthers === true) return { opacity: DEFAULT_DIM_OPACITY };
  if (!isPlainObject(dimOthers)) {
    throw new TypeError("Highlight dimOthers must be a boolean or plain object.");
  }
  validateKeys(dimOthers, ["opacity"], "highlight dimOthers");
  return {
    opacity: validateUnitInterval(
      dimOthers.opacity ?? DEFAULT_DIM_OPACITY,
      "Highlight dim opacity"
    )
  };
}

export function normalizePointHighlightStyle(args) {
  if (args.color !== undefined && args.fill !== undefined) {
    throw new Error("Point highlight accepts color or fill, not both.");
  }
  if (args.strokeDash !== undefined) {
    throw new Error("Point highlight does not support strokeDash.");
  }
  const fill = validateColor(
    args.fill ?? args.color ?? DEFAULT_COLORS.highlight,
    "Point highlight fill"
  );
  const opacity = args.opacity === undefined
    ? undefined
    : validateUnitInterval(args.opacity, "Point highlight opacity");
  const stroke = args.stroke === undefined
    ? undefined
    : validateColor(args.stroke, "Point highlight stroke");
  const strokeWidth = args.strokeWidth === undefined
    ? undefined
    : validateNonNegative(args.strokeWidth, "Point highlight strokeWidth");
  if (strokeWidth !== undefined && stroke === undefined) {
    throw new Error("Point highlight strokeWidth requires stroke.");
  }
  return {
    fill,
    ...(opacity === undefined ? {} : { opacity }),
    ...(stroke === undefined ? {} : { stroke }),
    ...(strokeWidth === undefined ? {} : { strokeWidth }),
    ...(args.shape === undefined ? {} : { shape: validatePointShape(args.shape) }),
    size: args.size === undefined
      ? DEFAULT_POINT_SIZE
      : validatePositive(args.size, "Point highlight size"),
    offset: normalizeOffset(args.offset)
  };
}

export function normalizeBarHighlightStyle(args) {
  for (const option of ["shape", "size", "offset", "strokeDash"]) {
    if (args[option] !== undefined) {
      throw new Error(`Bar highlight does not support ${option}.`);
    }
  }
  if (args.color !== undefined && args.fill !== undefined) {
    throw new Error("Bar highlight accepts color or fill, not both.");
  }
  const fill = validateColor(
    args.fill ?? args.color ?? DEFAULT_COLORS.highlight,
    "Bar highlight fill"
  );
  const opacity = args.opacity === undefined
    ? undefined
    : validateUnitInterval(args.opacity, "Bar highlight opacity");
  const stroke = args.stroke === undefined
    ? undefined
    : validateColor(args.stroke, "Bar highlight stroke");
  const strokeWidth = args.strokeWidth === undefined
    ? undefined
    : validateNonNegative(args.strokeWidth, "Bar highlight strokeWidth");
  if (strokeWidth !== undefined && stroke === undefined) {
    throw new Error("Bar highlight strokeWidth requires stroke.");
  }
  return {
    fill,
    ...(opacity === undefined ? {} : { opacity }),
    ...(stroke === undefined ? {} : { stroke }),
    ...(strokeWidth === undefined ? {} : { strokeWidth })
  };
}

function rejectHighlightOptions(args, mark, options) {
  for (const option of options) {
    if (args[option] !== undefined) {
      throw new Error(`${mark} highlight does not support ${option}.`);
    }
  }
}

export function normalizeStrokeHighlightStyle(args, mark) {
  rejectHighlightOptions(args, mark, ["fill", "shape", "size"]);
  if (args.color !== undefined && args.stroke !== undefined) {
    throw new Error(`${mark} highlight accepts color or stroke, not both.`);
  }
  return {
    stroke: validateColor(
      args.stroke ?? args.color ?? DEFAULT_COLORS.highlight,
      `${mark} highlight stroke`
    ),
    ...(args.strokeWidth === undefined
      ? {}
      : {
          strokeWidth: validateNonNegative(
            args.strokeWidth,
            `${mark} highlight strokeWidth`
          )
        }),
    ...(args.strokeDash === undefined
      ? {}
      : { strokeDash: normalizeStrokeDashPattern(args.strokeDash) }),
    ...(args.opacity === undefined
      ? {}
      : {
          opacity: validateUnitInterval(
            args.opacity,
            `${mark} highlight opacity`
          )
        }),
    offset: normalizeOffset(args.offset)
  };
}

export function normalizeAreaHighlightStyle(args) {
  rejectHighlightOptions(args, "Area", ["shape", "size", "strokeDash"]);
  if (args.color !== undefined && args.fill !== undefined) {
    throw new Error("Area highlight accepts color or fill, not both.");
  }
  const stroke = args.stroke === undefined
    ? undefined
    : validateColor(args.stroke, "Area highlight stroke");
  const strokeWidth = args.strokeWidth === undefined
    ? undefined
    : validateNonNegative(args.strokeWidth, "Area highlight strokeWidth");
  if (strokeWidth !== undefined && stroke === undefined) {
    throw new Error("Area highlight strokeWidth requires stroke.");
  }
  return {
    fill: validateColor(
      args.fill ?? args.color ?? DEFAULT_COLORS.highlight,
      "Area highlight fill"
    ),
    ...(args.opacity === undefined
      ? {}
      : { opacity: validateUnitInterval(args.opacity, "Area highlight opacity") }),
    ...(stroke === undefined ? {} : { stroke }),
    ...(strokeWidth === undefined ? {} : { strokeWidth }),
    offset: normalizeOffset(args.offset)
  };
}
