import { validateUserId } from "../../../core/identifiers.js";
import {
  validateOptionObject,
  validateNonEmptyString,
  validateNonNegativeFinite
} from "../../../core/validation.js";
import {
  isTransformedScaleType,
  mapContinuousScaleValues
} from "../../../grammar/scales/index.js";
import { resolveGraphicBounds } from "../../../layout/canvas.js";
import { resolveGridLineGeometry } from "../../../layout/grid.js";
import { DEFAULT_COLORS } from "../../../theme/defaults.js";
import { findCoordinate } from "../../../selectors/coordinates.js";
import {
  inferGridTickConfig,
  valuesFromTickConfig
} from "../tickValues.js";
import {
  findGraphicParent,
  walkGraphicDrawOrder
} from "../../../grammar/schemas/graphicTree.js";

const GRID_OPTIONS = Object.freeze([
  "scale", "coordinate", "count", "values", "color", "lineWidth", "strokeDash"
]);
const GRID_EDIT_OPTIONS = Object.freeze([
  "count", "values", "color", "lineWidth", "strokeDash"
]);
const DEFAULT_STYLE = Object.freeze({
  color: DEFAULT_COLORS.grid,
  lineWidth: 1,
  strokeDash: Object.freeze([])
});

export function gridNames(direction) {
  const prefix = direction === "horizontal" ? "Horizontal" : "Vertical";
  return {
    channel: direction === "horizontal" ? "y" : "x",
    create: `create${prefix}Grid`,
    rematerialize: `rematerialize${prefix}Grid`,
    graphic: `${direction}GridLines`
  };
}

function validateStrokeDash(value) {
  if (
    !Array.isArray(value) ||
    value.length % 2 !== 0 ||
    !value.every(item => Number.isFinite(item) && item >= 0)
  ) {
    throw new TypeError(
      "Grid strokeDash must be an even-length array of non-negative finite numbers."
    );
  }
  return value;
}

export function validateGridCreateArgs(args, operation) {
  validateOptionObject(args, GRID_OPTIONS, operation);
  if (Object.hasOwn(args, "count") && Object.hasOwn(args, "values")) {
    throw new Error(`${operation} cannot use count and values together.`);
  }
  if (Object.hasOwn(args, "count") && (!Number.isInteger(args.count) || args.count <= 0)) {
    throw new RangeError("Grid count must be a positive integer.");
  }
  if (Object.hasOwn(args, "values") && (
    !Array.isArray(args.values) ||
    args.values.length === 0 ||
    !args.values.every(Number.isFinite)
  )) {
    throw new TypeError("Grid values must be a non-empty finite number array.");
  }
  if (Object.hasOwn(args, "color")) {
    validateNonEmptyString(args.color, "Grid color");
  }
  if (Object.hasOwn(args, "lineWidth")) {
    validateNonNegativeFinite(args.lineWidth, "Grid lineWidth");
  }
  if (Object.hasOwn(args, "strokeDash")) validateStrokeDash(args.strokeDash);
}

export function validateGridEditArgs(args, operation) {
  validateOptionObject(args, GRID_EDIT_OPTIONS, operation, {
    allowEmpty: false
  });
  if (Object.hasOwn(args, "count") && Object.hasOwn(args, "values")) {
    throw new Error(`${operation} cannot use count and values together.`);
  }
  if (Object.hasOwn(args, "count") && (
    !Number.isInteger(args.count) || args.count <= 0
  )) {
    throw new RangeError("Grid count must be a positive integer.");
  }
  if (Object.hasOwn(args, "values") && args.values !== "auto" && (
    !Array.isArray(args.values) ||
    args.values.length === 0 ||
    !args.values.every(Number.isFinite)
  )) {
    throw new TypeError(
      'Grid values must be "auto" or a non-empty finite number array.'
    );
  }
  if (Object.hasOwn(args, "color")) {
    validateNonEmptyString(args.color, "Grid color");
  }
  if (Object.hasOwn(args, "lineWidth")) {
    validateNonNegativeFinite(args.lineWidth, "Grid lineWidth");
  }
  if (Object.hasOwn(args, "strokeDash")) validateStrokeDash(args.strokeDash);
}

export function resolveGridResources(program, direction, args) {
  const { channel } = gridNames(direction);
  let layers = program.semanticSpec.layers.filter(
    layer => layer.encoding?.[channel]?.scale !== undefined
  );
  if (layers.length === 0) throw new Error(`${direction} grid requires a ${channel} encoding.`);
  const requestedCoordinate = args.coordinate === undefined
    ? undefined
    : validateUserId(args.coordinate, "Grid coordinate id");
  const requestedScale = args.scale === undefined
    ? undefined
    : validateUserId(args.scale, "Grid scale id");
  if (requestedCoordinate !== undefined) {
    layers = layers.filter(layer => layer.coordinate === requestedCoordinate);
  }
  if (requestedScale !== undefined) {
    layers = layers.filter(layer => layer.encoding[channel].scale === requestedScale);
  }
  if (layers.length === 0) throw new Error(`${direction} grid found no matching encoded layers.`);
  const coordinateIds = [...new Set(layers.map(layer => layer.coordinate).filter(Boolean))];
  if (layers.some(layer => layer.coordinate === undefined)) {
    throw new Error(`${direction} grid requires a stored coordinate.`);
  }
  if (coordinateIds.length === 0) throw new Error(`Unknown grid coordinate "${requestedCoordinate}".`);
  if (coordinateIds.length > 1) {
    throw new Error(`${direction} grid found multiple coordinates; provide coordinate explicitly.`);
  }
  const coordinate = requestedCoordinate ?? coordinateIds[0];
  const definition = findCoordinate(program, coordinate);
  if (definition?.type !== "cartesian") {
    throw new Error(`${direction} grid requires a Cartesian coordinate.`);
  }
  const scaleIds = [...new Set(layers.map(layer => layer.encoding[channel].scale))];
  if (scaleIds.length === 0) throw new Error(`Unknown grid scale "${requestedScale}".`);
  if (scaleIds.length > 1) {
    throw new Error(`${direction} grid found multiple ${channel} scales; provide scale explicitly.`);
  }
  const scale = requestedScale ?? scaleIds[0];
  if (
    !["linear", "time"].includes(program.resolvedScales[scale]?.type) &&
    !isTransformedScaleType(program.resolvedScales[scale]?.type)
  ) {
    throw new Error(`${direction} grid requires resolved continuous scale "${scale}".`);
  }
  const related = new Set(layers.map(layer => layer.id));
  let before;
  walkGraphicDrawOrder(program.graphicSpec, ({ id }) => {
    if (before === undefined && related.has(id)) before = id;
  });
  if (before === undefined) throw new Error(`${direction} grid requires related mark graphics.`);
  const owner = findGraphicParent(program.graphicSpec, before);
  return {
    channel,
    coordinate,
    scale,
    before,
    ...(owner?.kind === "parent" ? { parent: owner.id } : {})
  };
}

export function resolveGridConfig(program, direction, args, resources) {
  const hasExplicitValues = Object.hasOwn(args, "values") ||
    Object.hasOwn(args, "count");
  const explicit = Object.hasOwn(args, "values")
    ? { mode: "values", values: args.values }
    : Object.hasOwn(args, "count")
      ? { mode: "count", count: args.count }
      : inferGridTickConfig(program, resources.channel, resources.scale);
  return {
    direction,
    scale: resources.scale,
    coordinate: resources.coordinate,
    ...explicit,
    inferredValues: !hasExplicitValues,
    color: args.color ?? DEFAULT_STYLE.color,
    lineWidth: args.lineWidth ?? DEFAULT_STYLE.lineWidth,
    strokeDash: args.strokeDash ?? DEFAULT_STYLE.strokeDash
  };
}

export function refreshGridConfig(program, config) {
  if (config.inferredValues !== true) return config;
  const channel = config.direction === "horizontal" ? "y" : "x";
  const refreshed = {
    ...config,
    ...inferGridTickConfig(program, channel, config.scale)
  };
  if (refreshed.mode === "values") delete refreshed.count;
  else delete refreshed.values;
  return refreshed;
}

export function editGridConfig(previous, args) {
  const config = {
    ...previous,
    ...Object.fromEntries(
      Object.entries(args).filter(([key]) => !["count", "values"].includes(key))
    )
  };
  if (Object.hasOwn(args, "count")) {
    config.mode = "count";
    config.count = args.count;
    config.inferredValues = false;
    delete config.values;
  } else if (Array.isArray(args.values)) {
    config.mode = "values";
    config.values = args.values;
    config.inferredValues = false;
    delete config.count;
  } else if (args.values === "auto") {
    config.inferredValues = true;
  }
  return config;
}

export function resolveGridGeometry(program, config) {
  const scale = program.resolvedScales[config.scale];
  const bounds = resolveGraphicBounds(program);
  if ((
    !["linear", "time"].includes(scale?.type) &&
    !isTransformedScaleType(scale?.type)
  ) || bounds === undefined) {
    throw new Error("Grid materialization requires a continuous scale and Canvas bounds.");
  }
  const values = valuesFromTickConfig(program, config);
  const low = Math.min(...scale.domain);
  const high = Math.max(...scale.domain);
  if (!values.every(value => value >= low && value <= high)) {
    throw new RangeError("Grid values must be inside the scale domain.");
  }
  const positions = mapContinuousScaleValues(values, scale);
  return resolveGridLineGeometry({
    direction: config.direction,
    values,
    positions,
    bounds
  });
}
