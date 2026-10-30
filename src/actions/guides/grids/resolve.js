import { valuesFromTickConfig } from "../../../materialization/guides/tickValues.js";
import { positionGuideLayers } from "../../../materialization/positionGuides.js";
import { cartesianAxisOwners } from "../../../selectors/axes.js";
import { gridNames } from "../../../selectors/grids.js";
export { gridNames };
import { axisGraphicIds } from "../../../materialization/guides/resources.js";
import { isNominalValue } from "../../../grammar/scales/fields.js";
import { patchGuideDash, validateGuideDash, normalizeGuideDashMap, resolveGuideDashes } from "../../../grammar/guideDash.js";
import { isSourceOwnedText } from "../../../grammar/text.js";
import { validateUserId } from "../../../core/identifiers.js";
import {
  validateGeneratedItemLimit,
  validateOptionObject,
  validateNonEmptyString,
  validateNonNegativeFinite
} from "../../../core/validation.js";
import {
  isTransformedScaleType,
  mapOrdinalPositionValues,
  mapContinuousScaleValues
} from "../../../grammar/scales/index.js";
import { resolveGuideCoordinateBounds } from "../../../materialization/coordinateBounds.js";
import { resolveGridLineGeometry } from "../../../grammar/gridGeometry.js";
import { DEFAULT_COLORS } from "../../../theme/defaults.js";
import { findCoordinate } from "../../../selectors/coordinates.js";
import { inferGridTickConfig } from "../tickValues.js";
import {
  findGraphicParent,
  graphicSiblings,
  walkGraphicDrawOrder
} from "../../../grammar/schemas/graphicTree.js";

const GRID_OPTIONS = Object.freeze([
  "scale", "coordinate", "count", "values", "color", "lineWidth", "strokeDash", "strokeDashMap", "zIndex", "bandPosition", "alongOffset"
]);
const GRID_EDIT_OPTIONS = Object.freeze(["visible",
  "count", "values", "color", "lineWidth", "strokeDash", "strokeDashMap", "zIndex", "bandPosition", "alongOffset"
]);
const DEFAULT_STYLE = Object.freeze({
  color: DEFAULT_COLORS.grid,
  lineWidth: 1,
  strokeDash: Object.freeze([])
});
export { DEFAULT_STYLE as CARTESIAN_GRID_DEFAULTS };

function validateStrokeDash(value) {
  return validateGuideDash(value, "Grid strokeDash");
}

export function validateGridCreateArgs(args, operation) {
  if (Object.hasOwn(args, "strokeDashMap")) normalizeGuideDashMap(args.strokeDashMap);
  validateOptionObject(args, GRID_OPTIONS, operation);
  if (Array.isArray(args.values)) {
    validateGeneratedItemLimit(args.values.length, "Grid value count");
  }
  if (Object.hasOwn(args, "count") && Object.hasOwn(args, "values")) {
    throw new Error(`${operation} cannot use count and values together.`);
  }
  if (Object.hasOwn(args, "count") && (!Number.isInteger(args.count) || args.count <= 0)) {
    throw new RangeError("Grid count must be a positive integer.");
  }
  if (Number.isInteger(args.count)) {
    validateGeneratedItemLimit(args.count, "Grid count");
  }
  if (Object.hasOwn(args, "values") && (
    !Array.isArray(args.values) ||
    args.values.length === 0 ||
    !args.values.every(isNominalValue)
  )) {
    throw new TypeError("Grid values must be a non-empty finite number array or nominal category array; continuous grids require finite numbers.");
  }
  if (Object.hasOwn(args, "alongOffset") && !Number.isFinite(args.alongOffset)) throw new TypeError("Grid alongOffset must be a finite number.");
  if (Object.hasOwn(args, "color")) {
    validateNonEmptyString(args.color, "Grid color");
  }
  if (Object.hasOwn(args, "lineWidth")) {
    validateNonNegativeFinite(args.lineWidth, "Grid lineWidth");
  }
  if (Object.hasOwn(args, "bandPosition") && !["center", "boundary"].includes(args.bandPosition)) throw new TypeError("Grid bandPosition must be center or boundary.");
  if (Object.hasOwn(args, "zIndex") && !Number.isFinite(args.zIndex)) throw new TypeError("Grid zIndex must be a finite number.");
  if (Object.hasOwn(args, "strokeDash")) validateStrokeDash(args.strokeDash);
}

export function validateGridEditArgs(args, operation) {
  if (Object.hasOwn(args, "visible") && typeof args.visible !== "boolean") throw new TypeError("Grid visible must be a boolean.");
  if (Object.hasOwn(args, "strokeDashMap")) normalizeGuideDashMap(args.strokeDashMap);
  validateOptionObject(args, GRID_EDIT_OPTIONS, operation, {
    allowEmpty: false
  });
  if (Array.isArray(args.values)) {
    validateGeneratedItemLimit(args.values.length, "Grid value count");
  }
  if (Object.hasOwn(args, "count") && Object.hasOwn(args, "values")) {
    throw new Error(`${operation} cannot use count and values together.`);
  }
  if (Object.hasOwn(args, "count") && (
    !Number.isInteger(args.count) || args.count <= 0
  )) {
    throw new RangeError("Grid count must be a positive integer.");
  }
  if (Number.isInteger(args.count)) {
    validateGeneratedItemLimit(args.count, "Grid count");
  }
  if (Object.hasOwn(args, "values") && args.values !== "auto" && (
    !Array.isArray(args.values) ||
    args.values.length === 0 ||
    !args.values.every(isNominalValue)
  )) {
    throw new TypeError(
      'Grid values must be "auto" or a non-empty finite number array.'
    );
  }
  if (Object.hasOwn(args, "alongOffset") && !Number.isFinite(args.alongOffset)) throw new TypeError("Grid alongOffset must be a finite number.");
  if (Object.hasOwn(args, "color")) {
    validateNonEmptyString(args.color, "Grid color");
  }
  if (Object.hasOwn(args, "lineWidth")) {
    validateNonNegativeFinite(args.lineWidth, "Grid lineWidth");
  }
  if (Object.hasOwn(args, "bandPosition") && !["center", "boundary"].includes(args.bandPosition)) throw new TypeError("Grid bandPosition must be center or boundary.");
  if (Object.hasOwn(args, "zIndex") && !Number.isFinite(args.zIndex)) throw new TypeError("Grid zIndex must be a finite number.");
  if (Object.hasOwn(args, "strokeDash")) validateStrokeDash(args.strokeDash);
}

export function resolveGridResources(program, direction, args) {
  const { channel } = gridNames(direction);
  let layers = positionGuideLayers(program, [channel]).filter(
    layer => !isSourceOwnedText(layer) && layer.encoding?.[channel]?.scale !== undefined
  );
  const requestedCoordinate = args.coordinate === undefined ? undefined : validateUserId(args.coordinate, "Grid coordinate id");
  const requestedScale = args.scale === undefined ? undefined : validateUserId(args.scale, "Grid scale id");
  const axes = cartesianAxisOwners(program).filter(owner => owner.channel === channel && owner.scale !== undefined && owner.coordinate !== undefined);
  const bindings = [...layers.map(layer => ({ coordinate: layer.coordinate, scale: layer.encoding[channel].scale })),
    ...axes.map(owner => ({ coordinate: owner.coordinate, scale: owner.scale }))]
    .filter(binding => (requestedCoordinate === undefined || binding.coordinate === requestedCoordinate) &&
      (requestedScale === undefined || binding.scale === requestedScale));
  if (bindings.length === 0) throw new Error(layers.length === 0
    ? `${direction} grid requires a ${channel} encoding or bound Cartesian axis.`
    : `${direction} grid found no matching encoded layers.`);
  if (bindings.some(binding => binding.coordinate === undefined)) throw new Error(`${direction} grid requires a stored coordinate.`);
  const coordinateIds = [...new Set(bindings.map(binding => binding.coordinate))];
  if (coordinateIds.length > 1) throw new Error(`${direction} grid found multiple coordinates; provide coordinate explicitly.`);
  const coordinate = requestedCoordinate ?? coordinateIds[0];
  if (findCoordinate(program, coordinate)?.type !== "cartesian") throw new Error(`${direction} grid requires a Cartesian coordinate.`);
  const scaleIds = [...new Set(bindings.map(binding => binding.scale))];
  if (scaleIds.length > 1) throw new Error(`${direction} grid found multiple ${channel} scales; provide scale explicitly.`);
  const scale = requestedScale ?? scaleIds[0];
  layers = layers.filter(layer => layer.coordinate === coordinate && layer.encoding[channel].scale === scale);
  if (
    !["linear", "time", "band", "point"].includes(program.resolvedScales[scale]?.type) &&
    !isTransformedScaleType(program.resolvedScales[scale]?.type)
  ) {
    throw new Error(`${direction} grid requires resolved continuous, band or point scale "${scale}".`);
  }
  const sourceIds = new Set(layers.map(layer => layer.id));
  const relatedLayers = [...layers, ...positionGuideLayers(program, [channel]).filter(layer =>
    isSourceOwnedText(layer) && sourceIds.has(layer.source)
  )];
  const related = new Set(relatedLayers.flatMap(layer => {
    const leader = program.materializationConfigs.labelLayouts?.[layer.id]?.leaderId;
    return leader === undefined ? [layer.id] : [leader, layer.id];
  }));
  if (related.size === 0) {
    for (const owner of axes.filter(owner => owner.scale === scale && owner.coordinate === coordinate)) {
      for (const id of axisGraphicIds(channel, owner.id)) if (program.graphicSpec.objects[id] !== undefined) related.add(id);
    }
  }
  let before;
  let after;
  walkGraphicDrawOrder(program.graphicSpec, ({ id }) => {
    if (related.has(id)) { if (before === undefined) before = id; after = id; }
  });
  if (before === undefined) throw new Error(`${direction} grid requires related mark graphics.`);
  const owner = findGraphicParent(program.graphicSpec, before);
  return {
    channel,
    coordinate,
    scale,
    before,
    after,
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
  return patchGuideDash({
    direction,
    ...(args.bandPosition === undefined ? {} : { bandPosition: args.bandPosition }),
    ...(args.zIndex === undefined ? {} : { zIndex: args.zIndex }),
    ...(args.alongOffset === undefined ? {} : { alongOffset: args.alongOffset }),
    scale: resources.scale,
    coordinate: resources.coordinate,
    ...explicit,
    inferredValues: !hasExplicitValues,
    color: args.color ?? DEFAULT_STYLE.color,
    lineWidth: args.lineWidth ?? DEFAULT_STYLE.lineWidth,
    strokeDash: args.strokeDash ?? DEFAULT_STYLE.strokeDash
  }, args);
}

export function refreshGridConfig(program, config) {
  if (config.inferredValues !== true) return config;
  const channel = config.direction === "horizontal" ? "y" : "x";
  const inferred = inferGridTickConfig(program, channel, config.scale);
  const refreshed = {
    ...config,
    ...inferred
  };
  if (inferred.rounding === undefined) delete refreshed.rounding;
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
    delete config.rounding;
    config.mode = "count";
    config.count = args.count;
    config.inferredValues = false;
    delete config.values;
  } else if (Array.isArray(args.values)) {
    delete config.rounding;
    config.mode = "values";
    config.values = args.values;
    config.inferredValues = false;
    delete config.count;
  } else if (args.values === "auto") {
    config.inferredValues = true;
  }
  return patchGuideDash(config, args);
}

export function resolveGridGeometry(program, config) {
  const scale = program.resolvedScales[config.scale];
  const channel = config.direction === "horizontal" ? "y" : "x";
  const bounds = resolveGuideCoordinateBounds(program, {
    coordinate: config.coordinate,
    scale: config.scale,
    channel
  });
  if ((
    !["linear", "time", "band", "point"].includes(scale?.type) &&
    !isTransformedScaleType(scale?.type)
  ) || bounds === undefined) {
    throw new Error("Grid materialization requires a continuous, band or point scale and Canvas bounds.");
  }
  if (config.bandPosition !== undefined && scale.type !== "band") throw new Error("Grid bandPosition requires a band scale.");
  if (["band", "point"].includes(scale.type)) {
    if (config.mode === "count") throw new Error("Categorical grid values cannot use count.");
    const values = valuesFromTickConfig(program, config);
    if (!values.every(value => scale.domain.includes(value))) throw new RangeError("Grid values must be inside the scale domain.");
    const centers = mapOrdinalPositionValues(values, scale);
    const direction = scale.range[1] >= scale.range[0] ? 1 : -1;
    const owners = new Map();
    if (config.bandPosition === "boundary") {
      centers.forEach((center, index) => {
        for (const edge of [center - direction * scale.bandwidth / 2, center + direction * scale.bandwidth / 2]) {
          if (!owners.has(edge)) owners.set(edge, values[index]);
        }
      });
    }
    const positions = config.bandPosition === "boundary"
      ? [...owners.keys()].sort((a, b) => direction * (a - b)) : centers;
    validateGeneratedItemLimit(positions.length, "Grid value count");
    return {
      ...resolveGridLineGeometry({ direction: config.direction, values: positions, positions: positions.map(value => value + (config.alongOffset ?? 0)), bounds }),
      strokeDash: resolveGuideDashes(config.bandPosition === "boundary" ? positions.map(value => owners.get(value)) : values, config)
    };
  }
  const values = valuesFromTickConfig(program, config);
  validateGeneratedItemLimit(values.length, "Grid value count");
  const low = Math.min(...scale.domain);
  const high = Math.max(...scale.domain);
  if (!values.every(value => Number.isFinite(value) && value >= low && value <= high)) {
    throw new RangeError("Grid values must be inside the scale domain.");
  }
  const positions = mapContinuousScaleValues(values, scale);
  return { ...resolveGridLineGeometry({
    direction: config.direction,
    values,
    positions: positions.map(value => value + (config.alongOffset ?? 0)),
    bounds
  }), strokeDash: resolveGuideDashes(values, config) };
}


export function resolveGridPlacement(program, config) {
  const resources = resolveGridResources(program, config.direction, { scale: config.scale, coordinate: config.coordinate });
  const id = gridNames(config.direction).graphic;
  const siblings = graphicSiblings(program.graphicSpec, resources.before);
  const rank = direction => [program.guideConfigs.grid?.[direction]?.zIndex ?? 0, direction === "horizontal" ? 0 : 1];
  const ownRank = [config.zIndex ?? 0, config.direction === "horizontal" ? 0 : 1];
  const compare = (a, b) => a[0] - b[0] || a[1] - b[1];
  const neighbors = ["horizontal", "vertical"].filter(direction => {
    const other = gridNames(direction).graphic;
    return other !== id && siblings.includes(other) && ((rank(direction)[0] > 0) === (ownRank[0] > 0));
  }).sort((a, b) => compare(rank(a), rank(b)));
  const greater = neighbors.find(direction => compare(rank(direction), ownRank) > 0);
  const lower = neighbors.filter(direction => compare(rank(direction), ownRank) < 0).at(-1);
  return {
    ...(resources.parent === undefined ? {} : { parent: resources.parent }),
    ...(greater ? { before: gridNames(greater).graphic } : lower ? { after: gridNames(lower).graphic } : ownRank[0] > 0 ? { after: resources.after } : { before: resources.before })
  };
}
