import { cloneAndFreeze, isPlainObject } from "../../core/immutable.js";

const LEGEND_FAMILIES = Object.freeze({
  series: "categorical",
  color: "categorical",
  gradient: "gradient",
  interval: "discretized",
  size: "size",
  opacity: "opacity"
});

function requirePlacements(placements) {
  if (!Array.isArray(placements) || placements.length === 0) {
    throw new Error("Facet outer axes require occupied cell placements.");
  }
  const ids = new Set();
  const slots = new Set();
  for (const placement of placements) {
    if (!isPlainObject(placement) || typeof placement.id !== "string") {
      throw new TypeError("Facet cell placement requires a string id.");
    }
    if (
      !Number.isInteger(placement.row) || placement.row < 0 ||
      !Number.isInteger(placement.column) || placement.column < 0
    ) {
      throw new RangeError("Facet cell row and column must be non-negative integers.");
    }
    if (ids.has(placement.id)) {
      throw new Error(`Facet cell placement id "${placement.id}" is duplicated.`);
    }
    const slot = `${placement.row}:${placement.column}`;
    if (slots.has(slot)) {
      throw new Error(`Facet cell slot ${slot} is occupied more than once.`);
    }
    ids.add(placement.id);
    slots.add(slot);
  }
  return placements;
}

function validateBounds(bounds, label) {
  if (!isPlainObject(bounds)) {
    throw new TypeError(`${label} must be a plain bounds object.`);
  }
  for (const property of ["x", "y", "width", "height"]) {
    if (!Number.isFinite(bounds[property])) {
      throw new TypeError(`${label}.${property} must be finite.`);
    }
  }
  if (bounds.width < 0 || bounds.height < 0) {
    throw new RangeError(`${label} width and height must be non-negative.`);
  }
  return bounds;
}

function translatedBounds(placement, bounds, channel) {
  if (bounds === undefined) return undefined;
  validateBounds(bounds, `Facet ${channel} axis bounds for "${placement.id}"`);
  if (!Number.isFinite(placement.x) || !Number.isFinite(placement.y)) {
    throw new TypeError(
      `Facet cell "${placement.id}" requires finite x/y for concrete axis placement.`
    );
  }
  return {
    x: placement.x + bounds.x,
    y: placement.y + bounds.y,
    width: bounds.width,
    height: bounds.height
  };
}

export function resolveFacetOuterAxes({ placements, axisBounds = {} } = {}) {
  const cells = requirePlacements(placements);
  if (!isPlainObject(axisBounds)) {
    throw new TypeError("Facet axisBounds must be a plain object.");
  }
  const bottomByColumn = new Map();
  const leftByRow = new Map();
  for (const cell of cells) {
    const bottom = bottomByColumn.get(cell.column);
    if (bottom === undefined || cell.row > bottom.row) {
      bottomByColumn.set(cell.column, cell);
    }
    const left = leftByRow.get(cell.row);
    if (left === undefined || cell.column < left.column) {
      leftByRow.set(cell.row, cell);
    }
  }
  const xOwners = new Set([...bottomByColumn.values()].map(cell => cell.id));
  const yOwners = new Set([...leftByRow.values()].map(cell => cell.id));
  return cloneAndFreeze({
    x: cells.filter(cell => xOwners.has(cell.id)).map(cell => cell.id),
    y: cells.filter(cell => yOwners.has(cell.id)).map(cell => cell.id),
    children: Object.fromEntries(cells.map(cell => {
      const x = xOwners.has(cell.id);
      const y = yOwners.has(cell.id);
      const bounds = axisBounds[cell.id] ?? {};
      return [cell.id, {
        x,
        y,
        bounds: {
          ...(x && bounds.x !== undefined
            ? { x: translatedBounds(cell, bounds.x, "x") }
            : {}),
          ...(y && bounds.y !== undefined
            ? { y: translatedBounds(cell, bounds.y, "y") }
            : {})
        }
      }];
    }))
  });
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value).sort().map(key => [key, stableValue(value[key])])
    );
  }
  return value;
}

function comparableConfig(config) {
  const { target: _target, ...rest } = config;
  return stableValue(rest);
}

function sameValue(left, right) {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right));
}

function requireLegendChildren(children) {
  if (!Array.isArray(children) || children.length === 0) {
    throw new Error("Shared facet legend requires at least one child.");
  }
  return children.map(child => {
    if (!isPlainObject(child) || typeof child.id !== "string") {
      throw new TypeError("Shared facet legend child requires a string id.");
    }
    const legends = child.guideConfigs?.legend;
    if (!isPlainObject(legends) || Object.keys(legends).length === 0) {
      throw new Error(`Facet child "${child.id}" has no materialized legend config.`);
    }
    if (!isPlainObject(child.resolvedScales)) {
      throw new Error(`Facet child "${child.id}" has no resolved scales.`);
    }
    return { ...child, legends };
  });
}

function scaleIds(config) {
  const ids = config.scales ?? (config.scale === undefined ? [] : [config.scale]);
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every(id =>
    typeof id === "string" && id.length > 0
  )) {
    throw new Error(`Shared ${config.kind} legend requires resolved scale ids.`);
  }
  return ids;
}

export function resolveSharedFacetLegends(children) {
  const normalized = requireLegendChildren(children);
  const first = normalized[0];
  const kinds = Object.keys(first.legends);
  const entries = kinds.map(kind => {
    const family = LEGEND_FAMILIES[kind];
    if (family === undefined) {
      throw new Error(`Unsupported shared facet legend kind "${kind}".`);
    }
    const config = first.legends[kind];
    if (
      !isPlainObject(config) ||
      (config.kind !== undefined && config.kind !== kind)
    ) {
      throw new Error(`Facet child "${first.id}" has invalid ${kind} legend config.`);
    }
    const scales = scaleIds(config);
    const resolvedScales = Object.fromEntries(scales.map(id => {
      const scale = first.resolvedScales[id];
      if (!isPlainObject(scale)) {
        throw new Error(`Facet child "${first.id}" is missing legend scale "${id}".`);
      }
      return [id, scale];
    }));
    for (const child of normalized.slice(1)) {
      const candidate = child.legends[kind];
      if (
        !isPlainObject(candidate) ||
        !sameValue(comparableConfig(config), comparableConfig(candidate))
      ) {
        throw new Error(
          `Facet child "${child.id}" has an incompatible ${kind} legend config.`
        );
      }
      for (const id of scales) {
        if (!sameValue(resolvedScales[id], child.resolvedScales[id])) {
          throw new Error(
            `Facet child "${child.id}" has an incompatible resolved legend scale "${id}".`
          );
        }
      }
    }
    return { kind, family, scales, config, resolvedScales };
  });
  for (const child of normalized.slice(1)) {
    const childKinds = Object.keys(child.legends);
    if (!sameValue([...kinds].sort(), [...childKinds].sort())) {
      throw new Error(`Facet child "${child.id}" has incompatible legend kinds.`);
    }
  }
  return cloneAndFreeze({ source: first.id, entries });
}

export function planFacetGuideOwnership({
  placements,
  children,
  axes = "outer",
  legend = "shared",
  sharedLegends
} = {}) {
  const cells = requirePlacements(placements);
  if (!Array.isArray(children) || children.length !== cells.length) {
    throw new Error("Facet guide ownership requires one child descriptor per placement.");
  }
  if (!["each", "outer"].includes(axes)) {
    throw new Error("Facet axes must be each or outer.");
  }
  if (![false, "shared"].includes(legend)) {
    throw new Error("Facet legend must be false or shared.");
  }
  const byId = new Map(children.map(child => [child.id, child]));
  if (byId.size !== cells.length || cells.some(cell => !byId.has(cell.id))) {
    throw new Error("Facet guide child ids must match occupied placements exactly.");
  }
  const outer = resolveFacetOuterAxes({ placements: cells });
  if (legend === "shared" && !isPlainObject(sharedLegends)) {
    throw new Error("Shared facet legend ownership requires a compatibility plan.");
  }
  return cloneAndFreeze({
    children: Object.fromEntries(cells.map(cell => {
      const descriptor = byId.get(cell.id);
      const presentAxes = descriptor.axes ?? [];
      const keepAxes = axes === "each"
        ? presentAxes
        : presentAxes.filter(channel => outer.children[cell.id][channel]);
      return [cell.id, {
        keepAxes,
        removeAxes: presentAxes.filter(channel => !keepAxes.includes(channel)),
        removeLegends: legend === "shared" ? descriptor.legendKinds ?? [] : []
      }];
    })),
    parent: legend === "shared"
      ? { legends: sharedLegends.entries, promoteFrom: sharedLegends.source }
      : { legends: [] }
  });
}
