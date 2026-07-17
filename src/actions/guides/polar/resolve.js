import { validateUserId } from "../../../core/identifiers.js";
import {
  validateNonEmptyString,
  validateNonNegativeFinite,
  validatePositiveFinite
} from "../../../core/validation.js";
import { resolvePolarFrame } from "../../../grammar/polar.js";
import {
  formatTransformedTick,
  isTransformedScaleType,
  mapContinuousScaleValues,
  mapOrdinalPositionValues
} from "../../../grammar/scales.js";
import { formatTimeTick, formatTimeTicks } from "../../../grammar/ticks.js";
import { resolveGraphicBounds } from "../../../layout/canvas.js";
import { findCoordinate } from "../../../selectors/coordinates.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from
  "../../../theme/defaults.js";
import {
  findGraphicParent,
  walkGraphicDrawOrder
} from "../../../grammar/schemas/graphicTree.js";
import { valuesFromTickConfig } from "../tickValues.js";
import { formatAxisValue, validateAxisFormat } from "../axes/policy.js";

export const POLAR_AXIS_DEFAULTS = Object.freeze({
  angle: 90,
  line: Object.freeze({ color: DEFAULT_COLORS.text, lineWidth: 1.25 }),
  ticks: Object.freeze({
    thetaCount: 6,
    radiusCount: 5,
    length: 6,
    radialLength: 8,
    color: DEFAULT_COLORS.text,
    lineWidth: 1
  }),
  labels: Object.freeze({
    thetaOffset: 18,
    radiusOffset: 10,
    format: "auto",
    color: DEFAULT_COLORS.text,
    fontSize: 11,
    fontFamily: DEFAULT_FONT_FAMILY,
    fontWeight: "normal"
  }),
  title: Object.freeze({
    thetaOffset: 42,
    radiusOffset: 8,
    color: DEFAULT_COLORS.strongText,
    fontSize: 13,
    fontFamily: DEFAULT_FONT_FAMILY,
    fontWeight: 600
  })
});

export const POLAR_GRID_DEFAULTS = Object.freeze({
  color: DEFAULT_COLORS.grid,
  lineWidth: 1,
  strokeDash: Object.freeze([]),
  thetaCount: 6,
  radiusCount: 5
});

export function polarGuideNames(kind) {
  if (kind === "theta") {
    return Object.freeze({
      channel: "theta",
      axis: "thetaAxis",
      line: "thetaAxisLine",
      ticks: "thetaAxisTicks",
      labels: "thetaAxisLabels",
      title: "thetaAxisTitle",
      grid: "thetaGridLines"
    });
  }
  if (kind === "radial" || kind === "radius") {
    return Object.freeze({
      channel: "radius",
      axis: "radiusAxis",
      line: "radialAxisLine",
      ticks: "radialAxisTicks",
      labels: "radialAxisLabels",
      title: "radialAxisTitle",
      grid: "radialGridCircles"
    });
  }
  throw new Error(`Unknown Polar guide kind "${kind}".`);
}

export function resolvePolarGuideResources(program, kind, args, operation) {
  const { channel } = polarGuideNames(kind);
  const requestedCoordinate = args.coordinate === undefined
    ? undefined
    : validateUserId(args.coordinate, `${operation} coordinate id`);
  const requestedScale = args.scale === undefined
    ? undefined
    : validateUserId(args.scale, `${operation} scale id`);
  let layers = program.semanticSpec.layers.filter(layer =>
    layer.encoding?.[channel]?.scale !== undefined
  );
  if (requestedCoordinate !== undefined) {
    layers = layers.filter(layer => layer.coordinate === requestedCoordinate);
  }
  if (requestedScale !== undefined) {
    layers = layers.filter(
      layer => layer.encoding[channel].scale === requestedScale
    );
  }
  if (layers.length === 0) {
    throw new Error(`${operation} requires a stored ${channel} encoding.`);
  }
  if (layers.some(layer => layer.coordinate === undefined)) {
    throw new Error(`${operation} requires a stored Polar coordinate.`);
  }
  const coordinates = [...new Set(layers.map(layer => layer.coordinate))];
  if (coordinates.length > 1) {
    throw new Error(
      `${operation} found multiple Polar coordinates; provide coordinate explicitly.`
    );
  }
  const coordinate = requestedCoordinate ?? coordinates[0];
  if (findCoordinate(program, coordinate)?.type !== "polar") {
    throw new Error(`${operation} requires a Polar coordinate.`);
  }
  const scales = [...new Set(
    layers.map(layer => layer.encoding[channel].scale)
  )];
  if (scales.length > 1) {
    throw new Error(
      `${operation} found multiple ${channel} scales; provide scale explicitly.`
    );
  }
  const scale = requestedScale ?? scales[0];
  const resolved = program.resolvedScales[scale];
  const discrete = ["ordinal", "band", "point"].includes(resolved?.type);
  const continuous = ["linear", "time"].includes(resolved?.type) ||
    isTransformedScaleType(resolved?.type);
  if ((channel === "theta" && !continuous && !discrete) ||
      (channel === "radius" && !continuous)) {
    throw new Error(
      `${operation} requires a supported resolved ${channel} scale "${scale}".`
    );
  }
  const related = new Set(layers.map(layer => layer.id));
  let before;
  walkGraphicDrawOrder(program.graphicSpec, ({ id }) => {
    if (before === undefined && related.has(id)) before = id;
  });
  if (before === undefined) {
    throw new Error(`${operation} requires related materialized marks.`);
  }
  const owner = findGraphicParent(program.graphicSpec, before);
  return Object.freeze({
    channel,
    coordinate,
    scale,
    before,
    ...(owner?.kind === "parent" ? { parent: owner.id } : {})
  });
}

export function resolvePolarFrameForProgram(program) {
  const bounds = resolveGraphicBounds(program);
  if (bounds === undefined) {
    throw new Error("Polar guides require graphical Canvas bounds.");
  }
  return resolvePolarFrame(bounds);
}

export function resolvePolarTickValues(program, config) {
  const scale = program.resolvedScales[config.scale];
  const discrete = ["ordinal", "band", "point"].includes(scale?.type);
  if (discrete) {
    if (config.mode !== "values") {
      throw new Error("Discrete theta guides require explicit or inferred values.");
    }
    const domain = new Set(scale.domain);
    if (!config.values.every(value => domain.has(value))) {
      throw new RangeError("Polar guide values must be inside the scale domain.");
    }
    return config.values;
  }
  const values = valuesFromTickConfig(program, config);
  const low = Math.min(...scale.domain);
  const high = Math.max(...scale.domain);
  if (!values.every(value => value >= low && value <= high)) {
    throw new RangeError("Polar guide values must be inside the scale domain.");
  }
  return values;
}

export function mapPolarGuideValues(program, config) {
  const scale = program.resolvedScales[config.scale];
  const values = resolvePolarTickValues(program, config);
  const positions = ["ordinal", "band", "point"].includes(scale.type)
    ? mapOrdinalPositionValues(values, scale)
    : mapContinuousScaleValues(values, scale);
  return Object.freeze({ values, positions });
}

export function formatPolarGuideValues(program, config, values) {
  const scale = program.resolvedScales[config.scale];
  if (scale.type === "time" && config.format === "auto") {
    return formatTimeTicks(values, scale.domain);
  }
  return values.map(value => formatAxisValue(
    value,
    scale.type,
    config.format,
    item => scale.type === "time"
      ? formatTimeTick(item, scale.domain)
      : isTransformedScaleType(scale.type)
        ? formatTransformedTick(scale.type, item)
        : String(item)
  ));
}

export function normalizePolarTickMode(program, scale, args, defaultCount) {
  const resolved = program.resolvedScales[scale];
  if (Object.hasOwn(args, "values")) {
    return { mode: "values", values: args.values, inferredValues: false };
  }
  if (Object.hasOwn(args, "count")) {
    return { mode: "count", count: args.count, inferredValues: false };
  }
  if (["ordinal", "band", "point"].includes(resolved?.type)) {
    return {
      mode: "values",
      values: resolved.domain,
      inferredValues: true
    };
  }
  return { mode: "count", count: defaultCount, inferredValues: true };
}

export function validatePolarTickConfig(config, label) {
  if (config.mode === "count" &&
      (!Number.isInteger(config.count) || config.count <= 0)) {
    throw new RangeError(`${label} count must be a positive integer.`);
  }
  if (config.mode === "values" && (
    !Array.isArray(config.values) || config.values.length === 0 ||
    !config.values.every(value =>
      typeof value === "string" || typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value))
    )
  )) {
    throw new TypeError(`${label} values must be a non-empty domain-value array.`);
  }
}

export function validatePolarLineStyle(config, label) {
  validateNonEmptyString(config.color, `${label} color`);
  validateNonNegativeFinite(config.lineWidth, `${label} lineWidth`);
}

export function validatePolarTextStyle(config, label) {
  validateNonEmptyString(config.color, `${label} color`);
  validatePositiveFinite(config.fontSize, `${label} fontSize`);
  validateNonEmptyString(config.fontFamily, `${label} fontFamily`);
  if (typeof config.fontWeight !== "string" &&
      !Number.isFinite(config.fontWeight)) {
    throw new TypeError(`${label} fontWeight must be a string or number.`);
  }
}

export function validatePolarLabelFormat(format) {
  return validateAxisFormat(format);
}
