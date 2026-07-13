import { validateUserId } from "../../../core/identifiers.js";
import { isPlainObject } from "../../../core/immutable.js";
import { validateKeys } from "../../../core/validation.js";
import { mapLinearValues } from "../../../grammar/scales.js";
import { resolveGraphicBounds } from "../../../layout/canvas.js";
import { DEFAULT_COLORS } from "../../../theme/defaults.js";
import {
  inferGridTickConfig,
  valuesFromTickConfig
} from "../tickValues.js";

const GRID_OPTIONS = Object.freeze([
  "scale", "coordinate", "count", "values", "color", "lineWidth", "strokeDash"
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
  if (!isPlainObject(args)) {
    throw new TypeError(`${operation} options must be a plain object.`);
  }
  validateKeys(args, GRID_OPTIONS, operation);
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
  if (Object.hasOwn(args, "color") && (
    typeof args.color !== "string" || args.color.length === 0
  )) {
    throw new TypeError("Grid color must be a non-empty string.");
  }
  if (Object.hasOwn(args, "lineWidth") && (
    !Number.isFinite(args.lineWidth) || args.lineWidth < 0
  )) {
    throw new RangeError("Grid lineWidth must be non-negative.");
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
  const definition = program.semanticSpec.coordinates.find(item => item.id === coordinate);
  if (definition?.type !== "cartesian") {
    throw new Error(`${direction} grid requires a Cartesian coordinate.`);
  }
  const scaleIds = [...new Set(layers.map(layer => layer.encoding[channel].scale))];
  if (scaleIds.length === 0) throw new Error(`Unknown grid scale "${requestedScale}".`);
  if (scaleIds.length > 1) {
    throw new Error(`${direction} grid found multiple ${channel} scales; provide scale explicitly.`);
  }
  const scale = requestedScale ?? scaleIds[0];
  if (!["linear", "time"].includes(program.resolvedScales[scale]?.type)) {
    throw new Error(`${direction} grid requires resolved continuous scale "${scale}".`);
  }
  const related = new Set(layers.map(layer => layer.id));
  const before = program.graphicSpec.order.find(id => related.has(id));
  if (before === undefined) throw new Error(`${direction} grid requires related mark graphics.`);
  return { channel, coordinate, scale, before };
}

export function resolveGridConfig(program, direction, args, resources) {
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
    color: args.color ?? DEFAULT_STYLE.color,
    lineWidth: args.lineWidth ?? DEFAULT_STYLE.lineWidth,
    strokeDash: args.strokeDash ?? DEFAULT_STYLE.strokeDash
  };
}

export function resolveGridGeometry(program, config) {
  const scale = program.resolvedScales[config.scale];
  const bounds = resolveGraphicBounds(program);
  if (!["linear", "time"].includes(scale?.type) || bounds === undefined) {
    throw new Error("Grid materialization requires a continuous scale and Canvas bounds.");
  }
  const values = valuesFromTickConfig(program, config);
  const low = Math.min(...scale.domain);
  const high = Math.max(...scale.domain);
  if (!values.every(value => value >= low && value <= high)) {
    throw new RangeError("Grid values must be inside the scale domain.");
  }
  const positions = mapLinearValues(values, scale.domain, scale.range);
  return config.direction === "horizontal"
    ? { values, x1: bounds.x, y1: positions, x2: bounds.x + bounds.width, y2: positions }
    : { values, x1: positions, y1: bounds.y, x2: positions, y2: bounds.y + bounds.height };
}
