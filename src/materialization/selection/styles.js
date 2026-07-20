import { isPlainObject } from "../../core/immutable.js";
import {
  validateKeys,
  validateNonEmptyString,
  validateNonNegativeFinite,
  validatePositiveFinite,
  validateUnitInterval
} from "../../core/validation.js";
import { validatePointShape } from "../../grammar/pointShapes.js";
import { normalizeStrokeDashPattern } from "../../grammar/scales/index.js";
import { DEFAULT_COLORS } from "../../theme/defaults.js";

const DEFAULT_POINT_SIZE = 2;
const DEFAULT_DIM_OPACITY = 0.25;

export { validateUnitInterval };

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
  const fill = validateNonEmptyString(
    args.fill ?? args.color ?? DEFAULT_COLORS.highlight,
    "Point highlight fill"
  );
  const opacity = args.opacity === undefined
    ? undefined
    : validateUnitInterval(args.opacity, "Point highlight opacity");
  const stroke = args.stroke === undefined
    ? undefined
    : validateNonEmptyString(args.stroke, "Point highlight stroke");
  const strokeWidth = args.strokeWidth === undefined
    ? undefined
    : validateNonNegativeFinite(args.strokeWidth, "Point highlight strokeWidth");
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
      : validatePositiveFinite(args.size, "Point highlight size"),
    offset: normalizeOffset(args.offset)
  };
}

function normalizeRectangularHighlightStyle(args, mark, { offset = false } = {}) {
  for (const option of ["shape", "size", "strokeDash"]) {
    if (args[option] !== undefined) {
      throw new Error(`${mark} highlight does not support ${option}.`);
    }
  }
  if (!offset && args.offset !== undefined) {
    throw new Error(`${mark} highlight does not support offset.`);
  }
  if (args.color !== undefined && args.fill !== undefined) {
    throw new Error(`${mark} highlight accepts color or fill, not both.`);
  }
  const explicitFill = args.fill ?? args.color;
  const opacity = args.opacity === undefined
    ? undefined
    : validateUnitInterval(args.opacity, `${mark} highlight opacity`);
  const stroke = args.stroke === undefined
    ? undefined
    : validateNonEmptyString(args.stroke, `${mark} highlight stroke`);
  const strokeWidth = args.strokeWidth === undefined
    ? undefined
    : validateNonNegativeFinite(args.strokeWidth, `${mark} highlight strokeWidth`);
  if (strokeWidth !== undefined && stroke === undefined) {
    throw new Error(`${mark} highlight strokeWidth requires stroke.`);
  }
  const hasAppearanceOverride = opacity !== undefined || stroke !== undefined ||
    strokeWidth !== undefined || args.offset !== undefined;
  const fill = explicitFill === undefined && hasAppearanceOverride
    ? undefined
    : validateNonEmptyString(
        explicitFill ?? DEFAULT_COLORS.highlight,
        `${mark} highlight fill`
      );
  return {
    ...(fill === undefined ? {} : { fill }),
    ...(opacity === undefined ? {} : { opacity }),
    ...(stroke === undefined ? {} : { stroke }),
    ...(strokeWidth === undefined ? {} : { strokeWidth }),
    ...(offset && args.offset !== undefined
      ? { offset: normalizeOffset(args.offset) }
      : {})
  };
}

export function normalizeBarHighlightStyle(args) {
  return normalizeRectangularHighlightStyle(args, "Bar");
}

export function normalizeRectHighlightStyle(args) {
  return normalizeRectangularHighlightStyle(args, "Rect", { offset: true });
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
    stroke: validateNonEmptyString(
      args.stroke ?? args.color ?? DEFAULT_COLORS.highlight,
      `${mark} highlight stroke`
    ),
    ...(args.strokeWidth === undefined
      ? {}
      : {
          strokeWidth: validateNonNegativeFinite(
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

export function normalizeAreaHighlightStyle(args, mark = "Area") {
  rejectHighlightOptions(args, mark, ["shape", "size", "strokeDash"]);
  if (args.color !== undefined && args.fill !== undefined) {
    throw new Error(`${mark} highlight accepts color or fill, not both.`);
  }
  const stroke = args.stroke === undefined
    ? undefined
    : validateNonEmptyString(args.stroke, `${mark} highlight stroke`);
  const strokeWidth = args.strokeWidth === undefined
    ? undefined
    : validateNonNegativeFinite(args.strokeWidth, `${mark} highlight strokeWidth`);
  if (strokeWidth !== undefined && stroke === undefined) {
    throw new Error(`${mark} highlight strokeWidth requires stroke.`);
  }
  return {
    fill: validateNonEmptyString(
      args.fill ?? args.color ?? DEFAULT_COLORS.highlight,
      `${mark} highlight fill`
    ),
    ...(args.opacity === undefined
      ? {}
      : { opacity: validateUnitInterval(args.opacity, `${mark} highlight opacity`) }),
    ...(stroke === undefined ? {} : { stroke }),
    ...(strokeWidth === undefined ? {} : { strokeWidth }),
    offset: normalizeOffset(args.offset)
  };
}
