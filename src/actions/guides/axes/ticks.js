import { selectCartesianAxis, axisTargetArgs } from "../../../selectors/axes.js";
import { axisGraphicIds } from "../../../materialization/guides/resources.js";
import { canvasOverflowError } from "../../../layout/canvas.js";
import { patchGuideDash, validateGuideDash, normalizeGuideDashMap, resolveGuideDashes } from "../../../grammar/guideDash.js";
import { editGraphicProperties } from "../../primitives/graphicProperties.js";
import { withGuideLayoutValidation } from "../../../materialization/guides/layout.js";
import { applyMaterializationPlan } from "../../../materialization/planner.js";
import { planAxisTickGridRematerialization } from "../../../materialization/scaleGuideDependencies.js";
import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import {
  validateGeneratedItemLimit,
  validateNonEmptyString,
  validateNonNegativeFinite,
  validateOptionObject
} from "../../../core/validation.js";
import { resolveCartesianAxisFrameBounds } from "../../../materialization/coordinateBounds.js";
import {
  isTransformedScaleType,
  mapContinuousScaleValues,
  mapOrdinalPositionValues
} from "../../../grammar/scales/index.js";
import { numericExtent } from "../../../grammar/numeric.js";
import {
  DEFAULT_TICK_COUNT,
  inferHistogramBoundaries,
  valuesFromTickConfig
} from "../tickValues.js";
import { DEFAULT_COLORS } from "../../../theme/defaults.js";
import { validateTickRounding } from "../../../grammar/ticks.js";
import {
  defaultAxisPosition,
  resolveAxisTickGeometry,
  validateAxisPosition
} from "./policy.js";
import { findCanvasGraphic, resolvePlotGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";

const OPTIONS = Object.freeze(["target", "scale", "position", "count", "values", "rounding", "length", "color", "lineWidth", "alongOffset", "strokeDash", "strokeDashMap"]);
const DEFAULTS = Object.freeze({
  count: DEFAULT_TICK_COUNT,
  length: 6,
  color: DEFAULT_COLORS.mutedText,
  lineWidth: 1
});
export { DEFAULTS as CARTESIAN_AXIS_TICK_DEFAULTS };

function validateOptions(args, operation, create) {
  validateTickRounding(args.rounding, !Object.hasOwn(args, "rounding"));
  if (Object.hasOwn(args, "rounding") && Object.hasOwn(args, "values")) {
    throw new Error(`${operation} cannot use rounding and values together.`);
  }
  validateOptionObject(
    args,
    create ? OPTIONS : OPTIONS.filter(key => key !== "scale"),
    operation
  );
  if (Object.hasOwn(args, "alongOffset") && !Number.isFinite(args.alongOffset)) throw new TypeError("Tick alongOffset must be a finite number.");
  if (Object.hasOwn(args, "count") && Object.hasOwn(args, "values")) throw new Error(`${operation} cannot use count and values together.`);
  if (Array.isArray(args.values)) {
    validateGeneratedItemLimit(args.values.length, "Tick value count");
  }
}

function validateConfig(channel, config) {
  if (config.strokeDash !== undefined) validateGuideDash(config.strokeDash, "Tick strokeDash");
  if (config.strokeDashMap !== undefined) normalizeGuideDashMap(config.strokeDashMap, { reset: false });
  validateAxisPosition(channel, config.position);
  if (config.mode === "count") {
    if (!Number.isInteger(config.count) || config.count <= 0) throw new RangeError("Tick count must be a positive integer.");
    validateGeneratedItemLimit(config.count, "Tick count");
  }
  if (
    config.mode === "values" &&
    (!Array.isArray(config.values) || !config.values.every(value =>
      typeof value === "string" ||
      typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value))
    ))
  ) throw new TypeError("Tick values must be nominal values or finite numbers.");
  if (config.alongOffset !== undefined && !Number.isFinite(config.alongOffset)) throw new TypeError("Tick alongOffset must be a finite number.");
  validateNonNegativeFinite(config.length, "Tick length");
  validateNonNegativeFinite(config.lineWidth, "Tick lineWidth");
  validateNonEmptyString(config.color, "Tick color");
}

function geometry(program, channel, config, axisId = channel) {
  const scale = program.resolvedScales[config.scale];
  const bounds = resolveCartesianAxisFrameBounds(program, channel, config.position, config.scale, axisId);
  const discrete = ["ordinal", "band", "point"].includes(scale?.type);
  if ((
    !["linear", "time", "ordinal", "band", "point"].includes(scale?.type) &&
    !isTransformedScaleType(scale?.type)
  ) || !bounds) throw new Error("Axis ticks require a supported resolved scale and Canvas bounds.");
  if (discrete && config.mode !== "values") throw new Error("Discrete axis ticks require explicit or inferred values, not count.");
  const domain = scale.domain;
  const values = valuesFromTickConfig(program, config);
  validateGeneratedItemLimit(values.length, "Tick value count");
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
      positions: positions.map(value => value + (config.alongOffset ?? 0)),
      length: config.length
    })
  };
  const canvas = findCanvasGraphic(program)?.properties;
  const xCoordinates = channel === "x"
    ? [...resolved.x1, ...resolved.x2]
    : [resolved.x1, resolved.x2];
  const yCoordinates = channel === "x"
    ? [resolved.y1, resolved.y2]
    : [...resolved.y1, ...resolved.y2];
  const coordinates = [...xCoordinates, ...yCoordinates];
  const [left, right] = numericExtent(xCoordinates);
  const [top, bottom] = numericExtent(yCoordinates);
  const strokeExtent = config.lineWidth / 2;
  const epsilon = 1e-9;
  const fits = canvas &&
    left - strokeExtent >= -epsilon &&
    right + strokeExtent <= canvas.width + epsilon &&
    top - strokeExtent >= -epsilon &&
    bottom + strokeExtent <= canvas.height + epsilon;
  if (
    coordinates.some(value => !Number.isFinite(value)) ||
    !fits && program.context.responsiveMeasuring !== true
  ) {
    throw canvasOverflowError(`The ${channel}-axis ticks do not fit the Canvas margin.`, [{ left: left - strokeExtent, right: right + strokeExtent, top: top - strokeExtent, bottom: bottom + strokeExtent }], canvas);
  }
  return resolved;
}

export function resolveAxisTickEditConfig(program, channel, args, axisId = channel) {
  const op = channel === "x" ? "editXAxisTicks" : "editYAxisTicks";
  validateOptions(args, op, false);
  const previous = program.guideConfigs.axis?.[axisId]?.ticks;
  if (!previous) throw new Error(`${op} requires tick configuration.`);
  const explicitMode = Object.hasOwn(args, "values") || Object.hasOwn(args, "count");
  const inferredValues = !explicitMode && previous.inferredValues === true
    ? inferHistogramBoundaries(program, channel, previous.scale) ??
      (["ordinal", "band", "point"].includes(
        program.resolvedScales[previous.scale]?.type
      )
        ? program.resolvedScales[previous.scale].domain
        : undefined)
    : undefined;
  const mode = Object.hasOwn(args, "values") || inferredValues !== undefined
    ? "values"
    : Object.hasOwn(args, "count") ? "count" : previous.mode;
  const config = patchGuideDash({
    ...previous,
    ...args,
    ...(inferredValues === undefined ? {} : { values: inferredValues }),
    ...(explicitMode ? { inferredValues: false } : {}),
    mode
  }, args);
  if (mode === "values") {
    delete config.count;
    if (!Object.hasOwn(args, "rounding")) delete config.rounding;
  } else delete config.values;
  validateConfig(channel, config);
  return config;
}

function makeEdit(channel) {
  const op = channel === "x" ? "editXAxisTicks" : "editYAxisTicks";
  return action({ op, description: `Edit concrete ${channel}-axis ticks.` }, withGuideLayoutValidation(function (args = {}) {
    validateOptions(args, op, false);
    const selected = selectCartesianAxis(this, channel, args, { create: false });
    const axisId = selected.id; args = selected.options;
    const id = axisGraphicIds(channel, axisId)[1];
    if (this.graphicSpec.objects[id]?.type !== "line") throw new Error(`${op} requires existing axis ticks.`);
    const config = resolveAxisTickEditConfig(this, channel, args, axisId);
    const previous = this.guideConfigs.axis?.[axisId]?.ticks;
    const explicitMode = Object.hasOwn(args, "values") || Object.hasOwn(args, "count");
    const resolved = geometry(this, channel, config, axisId);
    let next = this._withGuideConfig(axisId, config).editGraphics({ target: id, property: "length", value: resolved.values.length });
    for (const property of ["x1", "y1", "x2", "y2"]) next = next.editGraphics({ target: id, property, value: resolved[property] });
    next = editGraphicProperties(next, id, {
      stroke: config.color,
      strokeWidth: config.lineWidth
    });
    if (config.strokeDash !== undefined || config.strokeDashMap !== undefined ||
        previous.strokeDashMap !== undefined) {
      next = next.editGraphics({ target: id, property: "strokeDash", value: resolveGuideDashes(resolved.values, config) });
    }
    // Structural dependency plans own grids during a scale/role handoff.
    const explicitSelection = explicitMode || Object.hasOwn(args, "rounding");
    return explicitSelection ? applyMaterializationPlan(next,
      planAxisTickGridRematerialization(next, channel, axisId, {
        syncLabels: Object.hasOwn(config, "rounding") || Object.hasOwn(previous, "rounding")
      })) : next;
  }));
}

const editXAxisTicks = /* @__PURE__ */ makeEdit("x"), editYAxisTicks = /* @__PURE__ */ makeEdit("y");

function makeCreate(channel) {
  const op = channel === "x" ? "createXAxisTicks" : "createYAxisTicks";
  const edit = channel === "x" ? "editXAxisTicks" : "editYAxisTicks";
  return action({ op, description: `Create concrete ${channel}-axis ticks.` }, withGuideLayoutValidation(function (args = {}) {
    validateOptions(args, op, true);
    const selected = selectCartesianAxis(this, channel, args, { create: true });
    const axisId = selected.id; args = selected.options;
    const scale = validateUserId(args.scale ?? channel, "Scale id");
    const existingGuide = this.semanticSpec.guides.axis?.[axisId]?.scale;
    if (existingGuide && existingGuide !== scale) throw new Error(`${op} conflicts with the existing axis scale.`);
    const id = axisGraphicIds(channel, axisId)[1];
    if (this.graphicSpec.objects[id]) throw new Error(`${op} requires missing axis ticks.`);
    const resolvedScale = this.resolvedScales[scale];
    const labels = this.guideConfigs.axis?.[axisId]?.labels;
    const inheritedSelection = labels?.rounding !== undefined && !Object.hasOwn(args, "values")
      ? { count: labels.count, rounding: labels.rounding } : {};
    args = { ...inheritedSelection, ...args };
    const inferredValues =
      Object.hasOwn(args, "count") || Object.hasOwn(args, "values")
        ? undefined
        : ["ordinal", "band", "point"].includes(resolvedScale?.type)
          ? resolvedScale.domain
          : inferHistogramBoundaries(this, channel, scale);
    const options =
      inferredValues === undefined ? args : { ...args, values: inferredValues };
    const config = patchGuideDash({ scale, position: defaultAxisPosition(channel), length: DEFAULTS.length, color: DEFAULTS.color, lineWidth: DEFAULTS.lineWidth, ...options, inferredValues: inferredValues !== undefined, mode: Object.hasOwn(options, "values") ? "values" : "count" }, args);
    if (config.mode === "values") delete config.count; else config.count ??= DEFAULTS.count;
    validateConfig(channel, config); geometry(this, channel, config, axisId);
    const next = this.editSemantic({ property: `guide.axis.${axisId}.scale`, value: scale })
      .createGraphics({
        id,
        type: "line",
        length: 0,
        ...resolvePlotGraphicPlacement(this)
      })
      ._withGuideConfig(axisId, config)[edit](axisId === channel ? undefined : axisTargetArgs(axisId, channel));
    return applyMaterializationPlan(next, planAxisTickGridRematerialization(next, channel, axisId, {
      syncLabels: config.rounding !== undefined || labels?.rounding !== undefined
    }));
  }));
}

const createXAxisTicks = /* @__PURE__ */ makeCreate("x"), createYAxisTicks = /* @__PURE__ */ makeCreate("y");
export function registerAxisTickActions(Class) {
  Class.prototype.editXAxisTicks = editXAxisTicks; Class.prototype.editYAxisTicks = editYAxisTicks;
  Class.prototype.createXAxisTicks = createXAxisTicks; Class.prototype.createYAxisTicks = createYAxisTicks;
}
