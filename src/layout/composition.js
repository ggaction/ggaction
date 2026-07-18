import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";

const DIRECTIONS = Object.freeze(["horizontal", "vertical"]);
const ALIGNMENTS = Object.freeze(["start", "center", "end"]);
const SIZE_MODES = Object.freeze(["auto", "explicit"]);
const PADDING_KEYS = Object.freeze(["top", "right", "bottom", "left"]);

export const DEFAULT_COMPOSITION_LAYOUT = cloneAndFreeze({
  gap: 16,
  align: "center",
  padding: { top: 0, right: 0, bottom: 0, left: 0 }
});

export function validateCompositionSpacing(value, label) {
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
    validateCompositionSpacing(base[key], `Composition padding.${key}`);
  }
  return base;
}

export function normalizeCompositionPadding(
  padding,
  base = DEFAULT_COMPOSITION_LAYOUT.padding
) {
  validatePaddingBase(base);
  if (Number.isFinite(padding)) {
    validateCompositionSpacing(padding, "Composition padding");
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
    validateCompositionSpacing(padding[key], `Composition padding.${key}`);
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

export function normalizeCompositionAlign(align) {
  if (!ALIGNMENTS.includes(align)) {
    throw new Error(
      `Unknown composition align "${align}"; expected start, center, or end.`
    );
  }
  return align;
}

export function normalizeCompositionChildren(children) {
  if (!Array.isArray(children) || children.length === 0) {
    throw new TypeError("Composition layout requires a non-empty children array.");
  }
  const ids = new Set();
  return children.map((child, index) => {
    if (!isPlainObject(child)) {
      throw new TypeError(`Composition child ${index} must be a plain object.`);
    }
    const unknown = Object.keys(child).find(
      key => !["id", "width", "height", "widthMode", "heightMode"].includes(key)
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
      const mode = child[`${dimension}Mode`] ?? "explicit";
      if (!SIZE_MODES.includes(mode)) {
        throw new Error(
          `Unknown composition child ${dimension} mode "${mode}"; expected auto or explicit.`
        );
      }
    }
    return cloneAndFreeze({
      id: child.id,
      width: child.width,
      height: child.height,
      widthMode: child.widthMode ?? "explicit",
      heightMode: child.heightMode ?? "explicit"
    });
  });
}

function normalizeAutoCrossSize(children, horizontal) {
  const dimension = horizontal ? "height" : "width";
  const mode = `${dimension}Mode`;
  const sharedSize = Math.max(...children.map(child => child[dimension]));
  return children.map(child => cloneAndFreeze({
    ...child,
    [dimension]: child[mode] === "auto" ? sharedSize : child[dimension]
  }));
}

function placementSize(child) {
  return {
    id: child.id,
    width: child.width,
    height: child.height
  };
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
  const resolvedChildren = normalizeCompositionChildren(children);
  const resolvedGap = validateCompositionSpacing(gap, "Composition gap");
  const resolvedAlign = normalizeCompositionAlign(align);
  const resolvedPadding = normalizeCompositionPadding(padding);
  const horizontal = resolvedDirection === "horizontal";
  const sizedChildren = normalizeAutoCrossSize(resolvedChildren, horizontal);
  const contentWidth = horizontal
    ? sizedChildren.reduce((sum, child) => sum + child.width, 0) +
      resolvedGap * (sizedChildren.length - 1)
    : Math.max(...sizedChildren.map(child => child.width));
  const contentHeight = horizontal
    ? Math.max(...sizedChildren.map(child => child.height))
    : sizedChildren.reduce((sum, child) => sum + child.height, 0) +
      resolvedGap * (sizedChildren.length - 1);
  let cursor = horizontal ? resolvedPadding.left : resolvedPadding.top;
  const placements = sizedChildren.map(child => {
    const placement = horizontal
      ? {
          ...placementSize(child),
          x: cursor,
          y: resolvedPadding.top + crossOffset(
            contentHeight - child.height,
            resolvedAlign
          )
        }
      : {
          ...placementSize(child),
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

function validatePlacedBounds(value, label) {
  if (!isPlainObject(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  for (const property of ["x", "y", "width", "height"]) {
    if (!Number.isFinite(value[property])) {
      throw new TypeError(`${label}.${property} must be finite.`);
    }
  }
  if (value.width <= 0 || value.height <= 0) {
    throw new RangeError(`${label} width and height must be positive.`);
  }
  return value;
}

export function resolvePlacedPlotBounds({ placements, plots } = {}) {
  if (!Array.isArray(placements) || placements.length === 0) {
    throw new TypeError("Placed plot bounds require non-empty placements.");
  }
  if (!Array.isArray(plots) || plots.length !== placements.length) {
    throw new TypeError("Placed plot bounds require one local plot per placement.");
  }
  const plotById = new Map();
  for (const [index, plot] of plots.entries()) {
    if (!isPlainObject(plot) || typeof plot.id !== "string" || plot.id.length === 0) {
      throw new TypeError(`Placed plot ${index} requires a non-empty id.`);
    }
    if (plotById.has(plot.id)) {
      throw new Error(`Duplicate placed plot id "${plot.id}".`);
    }
    plotById.set(plot.id, validatePlacedBounds(plot, `Placed plot "${plot.id}"`));
  }
  const translated = placements.map((placement, index) => {
    if (
      !isPlainObject(placement) ||
      typeof placement.id !== "string" ||
      placement.id.length === 0
    ) {
      throw new TypeError(`Plot placement ${index} requires a non-empty id.`);
    }
    validatePlacedBounds(placement, `Plot placement "${placement.id}"`);
    const plot = plotById.get(placement.id);
    if (plot === undefined) {
      throw new Error(`Missing local plot bounds for "${placement.id}".`);
    }
    if (
      plot.x < 0 || plot.y < 0 ||
      plot.x + plot.width > placement.width ||
      plot.y + plot.height > placement.height
    ) {
      throw new RangeError(
        `Local plot bounds for "${placement.id}" must fit its placement.`
      );
    }
    plotById.delete(placement.id);
    return {
      left: placement.x + plot.x,
      top: placement.y + plot.y,
      right: placement.x + plot.x + plot.width,
      bottom: placement.y + plot.y + plot.height
    };
  });
  if (plotById.size > 0) {
    throw new Error(`Unknown placed plot id "${plotById.keys().next().value}".`);
  }
  const left = Math.min(...translated.map(bounds => bounds.left));
  const top = Math.min(...translated.map(bounds => bounds.top));
  const right = Math.max(...translated.map(bounds => bounds.right));
  const bottom = Math.max(...translated.map(bounds => bounds.bottom));
  return cloneAndFreeze({
    x: left,
    y: top,
    width: right - left,
    height: bottom - top
  });
}
