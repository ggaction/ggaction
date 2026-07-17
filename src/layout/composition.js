import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";

const DIRECTIONS = Object.freeze(["horizontal", "vertical"]);
const ALIGNMENTS = Object.freeze(["start", "center", "end"]);
const PADDING_KEYS = Object.freeze(["top", "right", "bottom", "left"]);

export const DEFAULT_COMPOSITION_LAYOUT = cloneAndFreeze({
  gap: 16,
  align: "center",
  padding: { top: 0, right: 0, bottom: 0, left: 0 }
});

function validateNonNegativeFinite(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative finite number.`);
  }
  return value;
}

function validatePaddingBase(base) {
  if (!isPlainObject(base)) {
    throw new TypeError("Composition padding base must be a plain object.");
  }
  for (const key of PADDING_KEYS) {
    validateNonNegativeFinite(base[key], `Composition padding.${key}`);
  }
  return base;
}

export function normalizeCompositionPadding(
  padding,
  base = DEFAULT_COMPOSITION_LAYOUT.padding
) {
  validatePaddingBase(base);
  if (Number.isFinite(padding)) {
    validateNonNegativeFinite(padding, "Composition padding");
    return cloneAndFreeze({
      top: padding,
      right: padding,
      bottom: padding,
      left: padding
    });
  }
  if (!isPlainObject(padding)) {
    throw new TypeError("Composition padding must be a number or a plain object.");
  }
  const keys = Object.keys(padding);
  if (keys.length === 0) {
    throw new TypeError("Composition padding object must contain at least one side.");
  }
  for (const key of keys) {
    if (!PADDING_KEYS.includes(key)) {
      throw new Error(`Unknown composition padding option "${key}".`);
    }
    validateNonNegativeFinite(padding[key], `Composition padding.${key}`);
  }
  return cloneAndFreeze({ ...base, ...padding });
}

function normalizeDirection(direction) {
  if (!DIRECTIONS.includes(direction)) {
    throw new Error(
      `Unknown composition direction "${direction}"; expected horizontal or vertical.`
    );
  }
  return direction;
}

function normalizeAlign(align) {
  if (!ALIGNMENTS.includes(align)) {
    throw new Error(
      `Unknown composition align "${align}"; expected start, center, or end.`
    );
  }
  return align;
}

function normalizeChildren(children) {
  if (!Array.isArray(children) || children.length === 0) {
    throw new TypeError("Composition layout requires a non-empty children array.");
  }
  const ids = new Set();
  return children.map((child, index) => {
    if (!isPlainObject(child)) {
      throw new TypeError(`Composition child ${index} must be a plain object.`);
    }
    const unknown = Object.keys(child).find(
      key => !["id", "width", "height"].includes(key)
    );
    if (unknown !== undefined) {
      throw new Error(`Unknown composition child property "${unknown}".`);
    }
    if (typeof child.id !== "string" || child.id.length === 0) {
      throw new TypeError(`Composition child ${index} requires a non-empty id.`);
    }
    if (ids.has(child.id)) {
      throw new Error(`Duplicate composition child id "${child.id}".`);
    }
    ids.add(child.id);
    for (const dimension of ["width", "height"]) {
      if (!Number.isFinite(child[dimension]) || child[dimension] <= 0) {
        throw new RangeError(
          `Composition child "${child.id}" ${dimension} must be a positive finite number.`
        );
      }
    }
    return cloneAndFreeze(child);
  });
}

function crossOffset(remaining, align) {
  if (align === "start") return 0;
  if (align === "end") return remaining;
  return remaining / 2;
}

export function resolveCompositionLayout({
  direction,
  children,
  gap = DEFAULT_COMPOSITION_LAYOUT.gap,
  align = DEFAULT_COMPOSITION_LAYOUT.align,
  padding = DEFAULT_COMPOSITION_LAYOUT.padding
} = {}) {
  const resolvedDirection = normalizeDirection(direction);
  const resolvedChildren = normalizeChildren(children);
  const resolvedGap = validateNonNegativeFinite(gap, "Composition gap");
  const resolvedAlign = normalizeAlign(align);
  const resolvedPadding = normalizeCompositionPadding(padding);
  const horizontal = resolvedDirection === "horizontal";
  const contentWidth = horizontal
    ? resolvedChildren.reduce((sum, child) => sum + child.width, 0) +
      resolvedGap * (resolvedChildren.length - 1)
    : Math.max(...resolvedChildren.map(child => child.width));
  const contentHeight = horizontal
    ? Math.max(...resolvedChildren.map(child => child.height))
    : resolvedChildren.reduce((sum, child) => sum + child.height, 0) +
      resolvedGap * (resolvedChildren.length - 1);
  let cursor = horizontal ? resolvedPadding.left : resolvedPadding.top;
  const placements = resolvedChildren.map(child => {
    const placement = horizontal
      ? {
          ...child,
          x: cursor,
          y: resolvedPadding.top + crossOffset(
            contentHeight - child.height,
            resolvedAlign
          )
        }
      : {
          ...child,
          x: resolvedPadding.left + crossOffset(
            contentWidth - child.width,
            resolvedAlign
          ),
          y: cursor
        };
    cursor += (horizontal ? child.width : child.height) + resolvedGap;
    return placement;
  });
  return cloneAndFreeze({
    direction: resolvedDirection,
    gap: resolvedGap,
    align: resolvedAlign,
    padding: resolvedPadding,
    width: resolvedPadding.left + contentWidth + resolvedPadding.right,
    height: resolvedPadding.top + contentHeight + resolvedPadding.bottom,
    children: placements
  });
}

