import { assertAxisFrame, previewAxisFrame } from "./frame.js";
import { axisLabelTexts, axisLabelLines } from "../../../materialization/axisLabelText.js";
import { materializeTextFont } from "../../../materialization/textFont.js";
import { axisTitleAllowsLabelOverlap, axisTitleFollowsLabels } from "../../../grammar/axisTextPlacement.js";
import { selectCartesianAxis, axisTargetArgs } from "../../../selectors/axes.js";
import { axisGraphicIds, hasPendingAxisTitleRematerialization } from "../../../materialization/guides/resources.js";
import { axisThemeTypography } from "../../theme/state.js";
import { validateAxisLabelFlushThreshold, validateAxisTextPlacement } from "../../../grammar/axisTextPlacement.js";
import { canvasOverflowError } from "../../../layout/canvas.js";
import { withGuideLayoutValidation } from "../../../materialization/guides/layout.js";
import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import {
  sameOrderedValues,
  validateGeneratedItemLimit,
  validateTextStyle,
  validateOptionObject,
  validateNonNegativeFinite,
  validatePositiveFinite
} from "../../../core/validation.js";
import { resolveCartesianAxisFrameBounds } from "../../../materialization/coordinateBounds.js";
import {
  isTransformedScaleType,
  mapContinuousScaleValues,
  mapOrdinalPositionValues
} from "../../../grammar/scales/index.js";
import { validateTickRounding } from "../../../grammar/ticks.js";
import { resolveRotation } from "../../../grammar/rotation.js";
import { valuesFromTickConfig } from "../tickValues.js";
import { AXIS_LABEL_FONT_WEIGHT, AXIS_LABEL_FONT_SIZES, DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from
  "../../../theme/defaults.js";
import {
  defaultAxisPosition,
  resolveAxisLabelGeometry,
  validateAxisFormat,
  validateAxisPosition
} from "./policy.js";
import { findCanvasGraphic, resolvePlotGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";
import {
  resolveTextBounds,
  textBoundsFitCanvas,
  textBoundsIntersect
} from "../../../core/textMetrics.js";
import { resolveConcreteGraphicBounds } from
  "../../../grammar/schemas/graphicBounds.js";
import {
  normalizeDisplayLabelMap,
  normalizeDisplayColorMap,
  resolveDisplayLabelColor
} from "../../../grammar/displayLabels.js";

const OPTIONS = [
  "target", "scale", "position", "count", "values", "rounding", "offset", "format", "color",
  "fontSize", "fontFamily", "fontWeight", "rotation", "maxWidth", "wrap",
  "lineHeight", "overlap", "labelMap", "alongOffset", "flush", "flushThreshold", "colorMap", "align"
];

const DEFAULTS = Object.freeze({
  count: 5,
  color: DEFAULT_COLORS.text,
  fontSize: AXIS_LABEL_FONT_SIZES.cartesian,
  fontFamily: DEFAULT_FONT_FAMILY,
  fontWeight: AXIS_LABEL_FONT_WEIGHT,
  rotation: 0,
  overlap: "error"
});
export { DEFAULTS as CARTESIAN_AXIS_LABEL_DEFAULTS };

function normalizeLabelLayout(config, args, operation) {
  const next = { ...config };
  next.rotation = Object.hasOwn(args, "rotation")
    ? resolveRotation(args.rotation, `${operation} rotation`)
    : next.rotation ?? 0;
  next.overlap ??= "error";
  if (args.maxWidth === false) {
    if (Object.hasOwn(args, "wrap") || Object.hasOwn(args, "lineHeight")) {
      throw new Error(`${operation} cannot combine maxWidth false with wrap or lineHeight.`);
    }
    delete next.maxWidth;
    delete next.wrap;
    delete next.lineHeight;
  } else if (next.maxWidth !== undefined) {
    next.wrap ??= "word";
  }
  return next;
}

export { validateTextStyle as validateAxisTextStyle };

function validateOptions(args, operation, create) {
  validateTickRounding(args.rounding, !Object.hasOwn(args, "rounding"));
  if (Object.hasOwn(args, "rounding") && Object.hasOwn(args, "values")) {
    throw new Error(`${operation} cannot use rounding and values together.`);
  }
  validateAxisTextPlacement(args);
  validateAxisLabelFlushThreshold(args.flushThreshold, { allowReset: true });
  validateOptionObject(
    args,
    create ? OPTIONS : OPTIONS.filter(key => key !== "scale"),
    operation
  );
  if (Object.hasOwn(args, "flush") && typeof args.flush !== "boolean") throw new TypeError("Label flush must be a boolean.");
  if (Object.hasOwn(args, "alongOffset") && !Number.isFinite(args.alongOffset)) throw new TypeError("Label alongOffset must be a finite number.");
  if (Object.hasOwn(args, "count") && Object.hasOwn(args, "values")) {
    throw new Error(`${operation} cannot use count and values together.`);
  }
}

function validateConfig(channel, config) {
  validateAxisTextPlacement(config);
  validateAxisPosition(channel, config.position);
  if (config.mode === "count") {
    if (!Number.isInteger(config.count) || config.count <= 0) throw new RangeError("Label count must be a positive integer.");
    validateGeneratedItemLimit(config.count, "Label count");
  }
  if (
    config.mode === "values" &&
    (!Array.isArray(config.values) || !config.values.every(value =>
      typeof value === "string" ||
      typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value))
    ))
  ) throw new TypeError("Label values must be nominal values or finite numbers.");
  if (config.mode === "values") {
    validateGeneratedItemLimit(config.values.length, "Label value count");
  }
  if (config.alongOffset !== undefined && !Number.isFinite(config.alongOffset)) throw new TypeError("Label alongOffset must be a finite number.");
  validateNonNegativeFinite(config.offset, "Label offset");
  validateTextStyle(config, "Label");
  validateAxisFormat(config.format);
  validateAxisLabelFlushThreshold(config.flushThreshold);
  if (config.flush === true && config.rotation !== 0) throw new Error("Label flush requires unrotated Cartesian labels.");
  if (!Number.isFinite(config.rotation)) {
    throw new TypeError("Label rotation must resolve to finite radians.");
  }
  if (config.maxWidth !== undefined) {
    validatePositiveFinite(config.maxWidth, "Label maxWidth");
    if (!["word", "character"].includes(config.wrap)) {
      throw new Error(`Unsupported axis label wrap "${config.wrap}".`);
    }
  } else if (config.wrap !== undefined || config.lineHeight !== undefined) {
    throw new Error("Axis label wrap and lineHeight require maxWidth.");
  }
  if (config.lineHeight !== undefined && (
    !Number.isFinite(config.lineHeight) || config.lineHeight < config.fontSize
  )) {
    throw new RangeError("Axis label lineHeight must cover fontSize.");
  }
  if (!["error", "allow"].includes(config.overlap)) {
    throw new Error(`Unsupported axis label overlap policy "${config.overlap}".`);
  }
}

function normalizeAxisLabelConfig(program, config, args, operation) {
  const next = { ...config };
  if (args.flushThreshold === "auto") delete next.flushThreshold;
  for (const [property, normalize] of [
    ["labelMap", normalizeDisplayLabelMap],
    ["colorMap", normalizeDisplayColorMap]
  ]) {
    if (!Object.hasOwn(args, property)) continue;
    if (args[property] === "auto") delete next[property];
    else next[property] = normalize(args[property], `${operation} ${property}`);
  }
  validateAxisLabelMapScale(next, program.resolvedScales[config.scale], operation);
  return next;
}

function validateAxisLabelMapScale(config, scale, operation = "Axis") {
  if (["ordinal", "band", "point"].includes(scale?.type)) return;
  for (const property of ["labelMap", "colorMap"]) {
    if (config[property] !== undefined &&
        !config[property].every(entry => Number.isFinite(entry.value))) {
      throw new TypeError(`${operation} continuous ${property} values must be finite numbers or timestamps.`);
    }
  }
}

function assertTickCompatibility(ticks, config, operation) {
  if (!ticks) return;
  if (ticks.scale !== config.scale || ticks.mode !== config.mode) throw new Error(`${operation} conflicts with axis ticks.`);
  if (config.mode === "count" && ticks.count !== config.count) throw new Error(`${operation} conflicts with axis ticks.`);
  if (config.mode === "count" && (ticks.rounding ?? "ceiling") !== (config.rounding ?? "ceiling")) {
    throw new Error(`${operation} conflicts with axis tick rounding.`);
  }
  if (config.mode === "values" && !sameOrderedValues(ticks.values, config.values)) throw new Error(`${operation} conflicts with axis ticks.`);
}

function expandWrappedLabels(resolved, text, config, channel, profile) {
  if (config.maxWidth === undefined && !text.some(value => /[\r\n]/u.test(value))) {
    return {
      ...resolved,
      text,
      groups: text.map((_, index) => index)
    };
  }
  const lineHeight = config.lineHeight ?? config.fontSize * 1.2;
  const expanded = { text: [], x: [], y: [], groups: [] };
  for (let index = 0; index < text.length; index += 1) {
    const lines = axisLabelLines(text[index], config, profile);
    validateGeneratedItemLimit(
      expanded.text.length + lines.length,
      "Axis label line count"
    );
    const baseX = Array.isArray(resolved.x) ? resolved.x[index] : resolved.x;
    const baseY = Array.isArray(resolved.y) ? resolved.y[index] : resolved.y;
    for (let line = 0; line < lines.length; line += 1) {
      expanded.text.push(lines[line]);
      expanded.x.push(baseX);
      expanded.y.push(channel === "x"
        ? baseY + (resolved.textBaseline === "top" ? line : -line) * lineHeight
        : baseY + (line - (lines.length - 1) / 2) * lineHeight);
      expanded.groups.push(index);
    }
  }
  return { ...resolved, ...expanded };
}

function unionLabelBounds(records) {
  const byGroup = new Map();
  for (const { bounds, group } of records) {
    const previous = byGroup.get(group);
    byGroup.set(group, previous === undefined ? bounds : {
      left: Math.min(previous.left, bounds.left),
      right: Math.max(previous.right, bounds.right),
      top: Math.min(previous.top, bounds.top),
      bottom: Math.max(previous.bottom, bounds.bottom)
    });
  }
  return [...byGroup.values()];
}

export function resolveAxisLabels(program, channel, config, axisId = channel) {
  const scale = program.resolvedScales[config.scale];
  const bounds = resolveCartesianAxisFrameBounds(program, channel, config.position, config.scale, axisId);
  const discrete = ["ordinal", "band", "point"].includes(scale?.type);
  validateAxisLabelMapScale(config, scale);
  if ((
    !["linear", "time", "ordinal", "band", "point"].includes(scale?.type) &&
    !isTransformedScaleType(scale?.type)
  ) || !bounds) throw new Error("Axis labels require a supported resolved scale and Canvas bounds.");
  if (discrete && config.mode !== "values") throw new Error("Discrete axis labels require explicit or inferred values, not count.");
  let values = valuesFromTickConfig(program, config);
  validateGeneratedItemLimit(values.length, "Label value count");
  if (discrete) {
    const domainValues = new Set(scale.domain);
    if (!values.every(value => domainValues.has(value))) throw new RangeError("Label values must be inside the scale domain.");
  } else {
    const low = Math.min(...scale.domain), high = Math.max(...scale.domain);
    if (!values.every(value => value >= low && value <= high)) throw new RangeError("Label values must be inside the scale domain.");
  }
  let positions = discrete
    ? mapOrdinalPositionValues(values, scale)
    : mapContinuousScaleValues(values, scale);
  let text = axisLabelTexts(values, scale, config);
  // Empty mapped text suppresses the label, never its raw tick or scale value.
  // Filter all aligned arrays before wrapping so group/color indices stay dense.
  if (text.includes("")) {
    const visible = text.map((value, index) => value === "" ? -1 : index)
      .filter(index => index !== -1);
    values = visible.map(index => values[index]);
    positions = visible.map(index => positions[index]);
    text = visible.map(index => text[index]);
  }
  const geometry = {
    values,
    ...resolveAxisLabelGeometry({
      bounds,
      channel,
      position: config.position,
      positions: positions.map(value => value + (config.alongOffset ?? 0)),
      offset: config.offset
    })
  };
  const resolved = expandWrappedLabels(geometry, text, config, channel, program.materializationConfigs.textMetrics);
  if (channel === "x" && Math.abs(Math.sin(config.rotation)) > 1e-9) {
    const outward = config.position === "bottom" ? 1 : -1;
    resolved.textAlign = Math.sin(config.rotation) * outward < 0 ? "right" : "left";
    resolved.textBaseline = "middle";
  }
  const canvas = findCanvasGraphic(program)?.properties;
  const measuredBounds = () => resolved.text.map((value, index) => resolveTextBounds({
    x: Array.isArray(resolved.x) ? resolved.x[index] : resolved.x,
    y: Array.isArray(resolved.y) ? resolved.y[index] : resolved.y,
    text: value,
    fontSize: config.fontSize,
    fontFamily: config.fontFamily,
    fontWeight: config.fontWeight,
    textAlign: resolved.textAlign,
    textBaseline: resolved.textBaseline,
    rotation: config.rotation
  }, program.materializationConfigs.textMetrics));
  let labelBounds = measuredBounds();
  if (program.materializationConfigs.canvas?.plot !== undefined || config.rotation !== 0) {
    const horizontal = channel === "x";
    const near = ["bottom", "right"].includes(config.position);
    const edge = horizontal ? bounds.y + (near ? bounds.height : 0)
      : bounds.x + (near ? bounds.width : 0);
    const boundKey = horizontal ? (near ? "top" : "bottom") : (near ? "left" : "right");
    const grouped = unionLabelBounds(labelBounds.map((bounds, index) => ({ bounds, group: resolved.groups[index] })));
    const shifts = grouped.map(item => edge + (near ? config.offset : -config.offset) - item[boundKey]);
    const axis = horizontal ? "y" : "x";
    const positions = resolved[axis];
    resolved[axis] = resolved.text.map((_, index) =>
      (Array.isArray(positions) ? positions[index] : positions) + shifts[resolved.groups[index]]);
    labelBounds = labelBounds.map((item, index) => {
      const delta = shifts[resolved.groups[index]];
      return horizontal ? { ...item, top: item.top + delta, bottom: item.bottom + delta }
        : { ...item, left: item.left + delta, right: item.right + delta };
    });
  }
  if (config.flush === true) {
    const along = channel === "x" ? "x" : "y";
    const lowKey = channel === "x" ? "left" : "top";
    const highKey = channel === "x" ? "right" : "bottom";
    const low = Math.min(...scale.range) + (config.alongOffset ?? 0);
    const high = Math.max(...scale.range) + (config.alongOffset ?? 0);
    const grouped = unionLabelBounds(labelBounds.map((bounds, index) => ({ bounds, group: resolved.groups[index] })));
    const shifts = grouped.map((item, index) => {
      const position = positions[index] + (config.alongOffset ?? 0);
      if (config.flushThreshold !== undefined &&
          Math.min(Math.abs(position - low), Math.abs(position - high)) > config.flushThreshold) return 0;
      if (item[highKey] - item[lowKey] > high - low + 1e-9) {
        throw new Error(`The ${channel}-axis label cannot flush inside the scale span.`);
      }
      return item[lowKey] < low ? low - item[lowKey]
        : item[highKey] > high ? high - item[highKey] : 0;
    });
    const labelPositions = resolved[along];
    resolved[along] = resolved.text.map((_, index) =>
      (Array.isArray(labelPositions) ? labelPositions[index] : labelPositions) + shifts[resolved.groups[index]]);
    labelBounds = labelBounds.map((item, index) => {
      const delta = shifts[resolved.groups[index]];
      return { ...item, [lowKey]: item[lowKey] + delta, [highKey]: item[highKey] + delta };
    });
  }
  if (config.align !== undefined) {
    resolved.textAlign = config.align;
    labelBounds = measuredBounds();
  }
  const rotatedOverlap = config.rotation !== 0;
  const collisionBounds = rotatedOverlap ? resolved.text.map((text, index) => {
    const x = Array.isArray(resolved.x) ? resolved.x[index] : resolved.x;
    const y = Array.isArray(resolved.y) ? resolved.y[index] : resolved.y;
    const cosine = Math.cos(config.rotation), sine = Math.sin(config.rotation);
    return resolveTextBounds({
      x: x * cosine + y * sine, y: -x * sine + y * cosine, text,
      fontSize: config.fontSize, fontFamily: config.fontFamily, fontWeight: config.fontWeight,
      textAlign: resolved.textAlign, textBaseline: resolved.textBaseline
    }, program.materializationConfigs.textMetrics);
  }) : labelBounds;
  const groupedBounds = unionLabelBounds(collisionBounds.map((bounds, index) => ({
    bounds,
    group: resolved.groups[index]
  })));
  const orderedBounds = groupedBounds.sort((left, right) => channel === "x"
    ? left.left - right.left
    : left.top - right.top);
  if (!canvas || !labelBounds.every(item => textBoundsFitCanvas(item, canvas))) {
    throw canvasOverflowError(`The ${channel}-axis labels do not fit the Canvas margin.`, labelBounds, canvas);
  }
  if (config.overlap === "error" && orderedBounds.some((item, index) => rotatedOverlap
    ? orderedBounds.slice(0, index).some(previous => textBoundsIntersect(previous, item))
    : index > 0 && textBoundsIntersect(orderedBounds[index - 1], item))) {
    throw new Error(`The ${channel}-axis labels overlap each other.`);
  }
  const title = program.graphicSpec.objects[axisGraphicIds(channel, axisId)[3]]
    ? resolveConcreteGraphicBounds(program.graphicSpec, axisGraphicIds(channel, axisId)[3], program.materializationConfigs.textMetrics)
    : undefined;
  if (title && !axisTitleAllowsLabelOverlap(program.guideConfigs.axis?.[axisId]?.title) &&
    !axisTitleFollowsLabels(program.guideConfigs.axis?.[axisId]?.title) &&
    !hasPendingAxisTitleRematerialization(program, channel, axisId) &&
    labelBounds.some(item => textBoundsIntersect(item, title))) {
    throw new Error(`The ${channel}-axis labels overlap the axis title.`);
  }
  return resolved;
}

export function resolveAxisLabelEditConfig(program, channel, args, axisId = channel) {
  const op = channel === "x" ? "editXAxisLabels" : "editYAxisLabels";
  validateOptions(args, op, false);
  const previous = program.guideConfigs.axis?.[axisId]?.labels;
  if (!previous) throw new Error(`${op} requires label configuration.`);
  const explicitMode = Object.hasOwn(args, "values") || Object.hasOwn(args, "count");
  const ticks = program.guideConfigs.axis?.[axisId]?.ticks;
  const inferredValues = !explicitMode && previous.inferredValues === true &&
    ticks?.mode === "values"
    ? ticks.values
    : undefined;
  const mode = Object.hasOwn(args, "values") || inferredValues !== undefined
    ? "values"
    : Object.hasOwn(args, "count") ? "count" : previous.mode;
  let config = normalizeLabelLayout({
    ...previous,
    ...args,
    ...(inferredValues === undefined ? {} : { values: inferredValues }),
    ...(explicitMode ? { inferredValues: false } : {}),
    mode
  }, args, op);
  config = normalizeAxisLabelConfig(program, config, args, op);
  if (mode === "values") {
    delete config.count;
    if (!Object.hasOwn(args, "rounding")) delete config.rounding;
  } else delete config.values;
  validateConfig(channel, config);
  return config;
}

function makeEdit(channel) {
  const op = channel === "x" ? "editXAxisLabels" : "editYAxisLabels";
  return action({ op, description: `Edit concrete ${channel}-axis labels.` }, withGuideLayoutValidation(function (args = {}) {
    validateOptions(args, op, false);
    const selected = selectCartesianAxis(this, channel, args, { create: false });
    const axisId = selected.id; args = selected.options;
    const id = axisGraphicIds(channel, axisId)[2];
    if (this.graphicSpec.objects[id]?.type !== "text") throw new Error(`${op} requires existing axis labels.`);
    const config = resolveAxisLabelEditConfig(this, channel, args, axisId);
    assertTickCompatibility(this.guideConfigs.axis?.[axisId]?.ticks, config, op);
    const resolved = resolveAxisLabels(this, channel, config, axisId);
    let next = this._withGuideConfig(axisId, "labels", config);
    const properties = {
      length: resolved.text.length,
      x: resolved.x,
      y: resolved.y,
      text: resolved.text,
      fill: config.colorMap === undefined ? config.color
        : resolved.text.map((_, index) => resolveDisplayLabelColor(
          resolved.values[resolved.groups[index]], config.colorMap, config.color)),
      fontSize: config.fontSize,
      fontFamily: config.fontFamily,
      fontWeight: config.fontWeight,
      textAlign: resolved.textAlign,
      textBaseline: resolved.textBaseline
    };
    if (config.rotation !== 0 || this.graphicSpec.objects[id].items.some(
      item => Object.hasOwn(item.properties, "rotation")
    )) properties.rotation = config.rotation;
    for (const [property, value] of Object.entries(properties)) {
      next = next.editGraphics({ target: id, property, value });
    }
    next = materializeTextFont(next, id);
    const titleConfig = next.guideConfigs.axis?.[axisId]?.title;
    if (axisTitleFollowsLabels(titleConfig) && next.context.pendingRelativeTitleAxis !== axisId) {
      const editTitle = channel === "x" ? "editXAxisTitle" : "editYAxisTitle";
      next = next[editTitle](axisId === channel ? undefined : axisTargetArgs(axisId, channel));
    }
    return next;
  }));
}

const editXAxisLabels = /* @__PURE__ */ makeEdit("x");
const editYAxisLabels = /* @__PURE__ */ makeEdit("y");

function makeCreate(channel) {
  const op = channel === "x" ? "createXAxisLabels" : "createYAxisLabels";
  const edit = channel === "x" ? "editXAxisLabels" : "editYAxisLabels";
  return action({ op, description: `Create concrete ${channel}-axis labels.` }, withGuideLayoutValidation(function (args = {}) {
    validateOptions(args, op, true);
    const selected = selectCartesianAxis(this, channel, args, { create: true });
    const axisId = selected.id; args = selected.options;
    const scale = validateUserId(args.scale ?? channel, "Scale id");
    const guideScale = this.semanticSpec.guides.axis?.[axisId]?.scale;
    if (guideScale && guideScale !== scale) throw new Error(`${op} conflicts with the existing axis scale.`);
    const id = axisGraphicIds(channel, axisId)[2];
    if (this.graphicSpec.objects[id]) throw new Error(`${op} requires missing axis labels.`);
    const ticks = this.guideConfigs.axis?.[axisId]?.ticks;
    const hasValues = Object.hasOwn(args, "values");
    const hasCount = Object.hasOwn(args, "count");
    const resolvedScale = this.resolvedScales[scale];
    const inferredDiscreteValues = !hasValues && !hasCount && ticks === undefined &&
      ["ordinal", "band", "point"].includes(resolvedScale?.type)
      ? resolvedScale.domain
      : undefined;
    const mode = hasValues || inferredDiscreteValues !== undefined
      ? "values"
      : hasCount ? "count" : ticks?.mode ?? "count";
    let config = normalizeLabelLayout({
      scale,
      position: defaultAxisPosition(channel),
      offset: channel === "x" ? 18 : 12,
      format: "auto",
      color: DEFAULTS.color,
      fontSize: DEFAULTS.fontSize,
      fontFamily: DEFAULTS.fontFamily,
      fontWeight: DEFAULTS.fontWeight,
      ...axisThemeTypography(this.materializationConfigs.theme, "labels"),
      rotation: DEFAULTS.rotation,
      overlap: DEFAULTS.overlap,
      ...(ticks?.rounding === undefined ? {} : { rounding: ticks.rounding }),
      ...args,
      inferredValues: !hasValues && !hasCount &&
        (ticks?.inferredValues === true || inferredDiscreteValues !== undefined),
      mode
    }, args, op);
    config = normalizeAxisLabelConfig(this, config, args, op);
    if (mode === "values") {
      config.values ??= ticks?.values ?? inferredDiscreteValues;
      if (!Object.hasOwn(args, "rounding")) delete config.rounding;
    } else {
      config.count ??= ticks?.count ?? DEFAULTS.count;
    }
    validateConfig(channel, config);
    assertTickCompatibility(ticks, config, op);
    resolveAxisLabels(this, channel, config, axisId);
    assertAxisFrame(previewAxisFrame(this, channel, axisId, { scale }, { labels: true }));
    return this.editSemantic({ property: `guide.axis.${axisId}.scale`, value: scale })
      .createGraphics({
        id,
        type: "text",
        length: 0,
        ...resolvePlotGraphicPlacement(this)
      })
      ._withGuideConfig(axisId, "labels", config)[edit](axisId === channel ? undefined : axisTargetArgs(axisId, channel));
  }));
}

const createXAxisLabels = /* @__PURE__ */ makeCreate("x");
const createYAxisLabels = /* @__PURE__ */ makeCreate("y");

export function registerAxisLabelActions(Class) {
  Class.prototype.editXAxisLabels = editXAxisLabels;
  Class.prototype.editYAxisLabels = editYAxisLabels;
  Class.prototype.createXAxisLabels = createXAxisLabels;
  Class.prototype.createYAxisLabels = createYAxisLabels;
}
