import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import { resolveGraphicBounds } from "../../../layout/canvas.js";
import {
  isTransformedScaleType,
  mapContinuousScaleValues,
  mapOrdinalPositionValues
} from "../../../grammar/scales.js";
import {
  DEFAULT_TICK_COUNT,
  inferHistogramBoundaries,
  valuesFromTickConfig
} from "../tickValues.js";
import { DEFAULT_COLORS } from "../../../theme/defaults.js";
import {
  defaultAxisPosition,
  resolveAxisTickGeometry,
  validateAxisPosition
} from "./policy.js";

const OPTIONS = Object.freeze(["scale", "position", "count", "values", "length", "color", "lineWidth"]);
const DEFAULTS = Object.freeze({
  count: DEFAULT_TICK_COUNT,
  length: 6,
  color: DEFAULT_COLORS.mutedText,
  lineWidth: 1
});

function validateOptions(args, operation, create) {
  for (const key of Object.keys(args)) if (!OPTIONS.includes(key) || (!create && key === "scale")) throw new Error(`Unknown ${operation} option "${key}".`);
  if (Object.hasOwn(args, "count") && Object.hasOwn(args, "values")) throw new Error(`${operation} cannot use count and values together.`);
}

function validateConfig(channel, config) {
  validateAxisPosition(channel, config.position);
  if (config.mode === "count" && (!Number.isInteger(config.count) || config.count <= 0)) throw new RangeError("Tick count must be a positive integer.");
  if (
    config.mode === "values" &&
    (!Array.isArray(config.values) || !config.values.every(value =>
      typeof value === "string" ||
      typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value))
    ))
  ) throw new TypeError("Tick values must be nominal values or finite numbers.");
  if (!Number.isFinite(config.length) || config.length < 0) throw new RangeError("Tick length must be non-negative.");
  if (!Number.isFinite(config.lineWidth) || config.lineWidth < 0) throw new RangeError("Tick lineWidth must be non-negative.");
  if (typeof config.color !== "string" || !config.color.length) throw new TypeError("Tick color must be non-empty.");
}

function geometry(program, channel, config) {
  const scale = program.resolvedScales[config.scale];
  const bounds = resolveGraphicBounds(program);
  const discrete = ["ordinal", "band", "point"].includes(scale?.type);
  if ((
    !["linear", "time", "ordinal", "band", "point"].includes(scale?.type) &&
    !isTransformedScaleType(scale?.type)
  ) || !bounds) throw new Error("Axis ticks require a supported resolved scale and Canvas bounds.");
  if (discrete && config.mode !== "values") throw new Error("Discrete axis ticks require explicit or inferred values, not count.");
  const domain = scale.domain;
  const values = valuesFromTickConfig(program, config);
  if (discrete) {
    const domainValues = new Set(domain);
    if (!values.every(value => domainValues.has(value))) throw new RangeError("Tick values must be inside the scale domain.");
  } else {
    const low = Math.min(...domain), high = Math.max(...domain);
    if (!values.every(value => value >= low && value <= high)) throw new RangeError("Tick values must be inside the scale domain.");
  }
  const positions = discrete
    ? mapOrdinalPositionValues(values, scale)
    : mapContinuousScaleValues(values, scale);
  const resolved = {
    values,
    ...resolveAxisTickGeometry({
      bounds,
      channel,
      position: config.position,
      positions,
      length: config.length
    })
  };
  const canvas = program.graphicSpec.objects.canvas?.properties;
  const coordinates = channel === "x"
    ? [...resolved.x1, ...resolved.x2, resolved.y1, resolved.y2]
    : [resolved.x1, resolved.x2, ...resolved.y1, ...resolved.y2];
  const newEdgeDoesNotFit =
    (config.position === "top" && resolved.y2 < 0) ||
    (config.position === "right" && resolved.x2 > canvas?.width);
  if (
    !canvas ||
    coordinates.some(value => !Number.isFinite(value)) ||
    newEdgeDoesNotFit
  ) {
    throw new Error(`The ${channel}-axis ticks do not fit the Canvas margin.`);
  }
  return resolved;
}

function makeEdit(channel) {
  const op = channel === "x" ? "editXAxisTicks" : "editYAxisTicks";
  return action({ op, description: `Edit concrete ${channel}-axis ticks.` }, function (args = {}) {
    validateOptions(args, op, false);
    const id = `${channel}AxisTicks`;
    if (this.graphicSpec.objects[id]?.type !== "line") throw new Error(`${op} requires existing axis ticks.`);
    const previous = this.guideConfigs.axis?.[channel]?.ticks;
    if (!previous) throw new Error(`${op} requires tick configuration.`);
    const explicitMode = Object.hasOwn(args, "values") || Object.hasOwn(args, "count");
    const inferredValues = !explicitMode && previous.inferredValues === true
      ? inferHistogramBoundaries(this, channel, previous.scale) ??
        (["ordinal", "band", "point"].includes(
          this.resolvedScales[previous.scale]?.type
        )
          ? this.resolvedScales[previous.scale].domain
          : undefined)
      : undefined;
    const mode = Object.hasOwn(args, "values") || inferredValues !== undefined
      ? "values"
      : Object.hasOwn(args, "count") ? "count" : previous.mode;
    const config = {
      ...previous,
      ...args,
      ...(inferredValues === undefined ? {} : { values: inferredValues }),
      ...(explicitMode ? { inferredValues: false } : {}),
      mode
    };
    if (mode === "values") delete config.count; else delete config.values;
    validateConfig(channel, config);
    const resolved = geometry(this, channel, config);
    let next = this._withGuideConfig(channel, config).editGraphics({ target: id, property: "length", value: resolved.values.length });
    for (const property of ["x1", "y1", "x2", "y2"]) next = next.editGraphics({ target: id, property, value: resolved[property] });
    return next.editGraphics({ target: id, property: "stroke", value: config.color }).editGraphics({ target: id, property: "strokeWidth", value: config.lineWidth });
  });
}

const editXAxisTicks = makeEdit("x"), editYAxisTicks = makeEdit("y");

function makeCreate(channel) {
  const op = channel === "x" ? "createXAxisTicks" : "createYAxisTicks";
  const edit = channel === "x" ? "editXAxisTicks" : "editYAxisTicks";
  return action({ op, description: `Create concrete ${channel}-axis ticks.` }, function (args = {}) {
    validateOptions(args, op, true);
    const scale = validateUserId(args.scale ?? channel, "Scale id");
    const existingGuide = this.semanticSpec.guides.axis?.[channel]?.scale;
    if (existingGuide && existingGuide !== scale) throw new Error(`${op} conflicts with the existing axis scale.`);
    const id = `${channel}AxisTicks`;
    if (this.graphicSpec.objects[id]) throw new Error(`${op} requires missing axis ticks.`);
    const resolvedScale = this.resolvedScales[scale];
    const inferredValues =
      Object.hasOwn(args, "count") || Object.hasOwn(args, "values")
        ? undefined
        : ["ordinal", "band", "point"].includes(resolvedScale?.type)
          ? resolvedScale.domain
          : inferHistogramBoundaries(this, channel, scale);
    const options =
      inferredValues === undefined ? args : { ...args, values: inferredValues };
    const config = { scale, position: defaultAxisPosition(channel), length: DEFAULTS.length, color: DEFAULTS.color, lineWidth: DEFAULTS.lineWidth, ...options, inferredValues: inferredValues !== undefined, mode: Object.hasOwn(options, "values") ? "values" : "count" };
    if (config.mode === "values") delete config.count; else config.count ??= DEFAULTS.count;
    validateConfig(channel, config); geometry(this, channel, config);
    return this.editSemantic({ property: `guide.axis.${channel}.scale`, value: scale })
      .createGraphics({ id, type: "line", length: 0 })
      ._withGuideConfig(channel, config)[edit]();
  });
}

const createXAxisTicks = makeCreate("x"), createYAxisTicks = makeCreate("y");
export function registerAxisTickActions(Class) {
  Class.prototype.editXAxisTicks = editXAxisTicks; Class.prototype.editYAxisTicks = editYAxisTicks;
  Class.prototype.createXAxisTicks = createXAxisTicks; Class.prototype.createYAxisTicks = createYAxisTicks;
}
