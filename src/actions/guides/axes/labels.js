import { withGuideLayoutValidation } from "../../../materialization/guides/layout.js";
import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import {
  sameOrderedValues,
  validateGeneratedItemLimit,
  validateOptionObject,
  validateNonEmptyString,
  validateNonNegativeFinite,
  validatePositiveFinite
} from "../../../core/validation.js";
import { resolveGraphicBounds } from "../../../layout/canvas.js";
import {
  isTransformedScaleType,
  mapContinuousScaleValues,
  formatTransformedTick,
  mapOrdinalPositionValues
} from "../../../grammar/scales/index.js";
import { formatTimeTick, formatTimeTicks } from "../../../grammar/ticks.js";
import { resolveRotation } from "../../../grammar/rotation.js";
import { valuesFromTickConfig } from "../tickValues.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from
  "../../../theme/defaults.js";
import {
  defaultAxisPosition,
  formatAxisValue,
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
import { wrapText } from "../../../layout/text.js";

const OPTIONS = [
  "scale", "position", "count", "values", "offset", "format", "color",
  "fontSize", "fontFamily", "fontWeight", "rotation", "maxWidth", "wrap",
  "lineHeight", "overlap"
];

const DEFAULTS = {
  count: 5,
  color: DEFAULT_COLORS.text,
  fontSize: 12,
  fontFamily: DEFAULT_FONT_FAMILY,
  fontWeight: "normal",
  rotation: 0,
  overlap: "error"
};

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

export function validateAxisTextStyle(config, label) {
  validateNonEmptyString(config.color, `${label} color`);
  validatePositiveFinite(config.fontSize, `${label} fontSize`);
  validateNonEmptyString(config.fontFamily, `${label} fontFamily`);
  if (typeof config.fontWeight !== "string" &&
    !Number.isFinite(config.fontWeight)) {
    throw new TypeError(`${label} fontWeight must be a string or number.`);
  }
}

function validateOptions(args, operation, create) {
  validateOptionObject(
    args,
    create ? OPTIONS : OPTIONS.filter(key => key !== "scale"),
    operation
  );
  if (Object.hasOwn(args, "count") && Object.hasOwn(args, "values")) {
    throw new Error(`${operation} cannot use count and values together.`);
  }
}

function validateConfig(channel, config) {
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
  validateNonNegativeFinite(config.offset, "Label offset");
  validateAxisTextStyle(config, "Label");
  validateAxisFormat(config.format);
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

function assertTickCompatibility(ticks, config, operation) {
  if (!ticks) return;
  if (ticks.scale !== config.scale || ticks.mode !== config.mode) throw new Error(`${operation} conflicts with axis ticks.`);
  if (config.mode === "count" && ticks.count !== config.count) throw new Error(`${operation} conflicts with axis ticks.`);
  if (config.mode === "values" && !sameOrderedValues(ticks.values, config.values)) throw new Error(`${operation} conflicts with axis ticks.`);
}

function expandWrappedLabels(resolved, text, config, channel) {
  if (config.maxWidth === undefined) {
    return {
      ...resolved,
      text,
      groups: text.map((_, index) => index)
    };
  }
  const style = {
    fontSize: config.fontSize,
    fontFamily: config.fontFamily,
    fontWeight: config.fontWeight
  };
  const lineHeight = config.lineHeight ?? config.fontSize * 1.2;
  const expanded = { text: [], x: [], y: [], groups: [] };
  for (let index = 0; index < text.length; index += 1) {
    const lines = wrapText(text[index], {
      maxWidth: config.maxWidth,
      mode: config.wrap,
      style
    });
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

function resolve(program, channel, config) {
  const scale = program.resolvedScales[config.scale];
  const bounds = resolveGraphicBounds(program);
  const discrete = ["ordinal", "band", "point"].includes(scale?.type);
  if ((
    !["linear", "time", "ordinal", "band", "point"].includes(scale?.type) &&
    !isTransformedScaleType(scale?.type)
  ) || !bounds) throw new Error("Axis labels require a supported resolved scale and Canvas bounds.");
  if (discrete && config.mode !== "values") throw new Error("Discrete axis labels require explicit or inferred values, not count.");
  const values = valuesFromTickConfig(program, config);
  validateGeneratedItemLimit(values.length, "Label value count");
  if (discrete) {
    const domainValues = new Set(scale.domain);
    if (!values.every(value => domainValues.has(value))) throw new RangeError("Label values must be inside the scale domain.");
  } else {
    const low = Math.min(...scale.domain), high = Math.max(...scale.domain);
    if (!values.every(value => value >= low && value <= high)) throw new RangeError("Label values must be inside the scale domain.");
  }
  const positions = discrete
    ? mapOrdinalPositionValues(values, scale)
    : mapContinuousScaleValues(values, scale);
  const text = scale.type === "time" && config.format === "auto"
    ? formatTimeTicks(values, scale.domain)
    : values.map(value => formatAxisValue(
        value,
        scale.type,
        config.format,
        item => scale.type === "time"
          ? formatTimeTick(item, scale.domain)
          : isTransformedScaleType(scale.type)
            ? formatTransformedTick(scale.type, item)
            : String(item)
      ));
  const geometry = {
    values,
    ...resolveAxisLabelGeometry({
      bounds,
      channel,
      position: config.position,
      positions,
      offset: config.offset
    })
  };
  const resolved = expandWrappedLabels(geometry, text, config, channel);
  const canvas = findCanvasGraphic(program)?.properties;
  const labelBounds = resolved.text.map((value, index) => resolveTextBounds({
    x: Array.isArray(resolved.x) ? resolved.x[index] : resolved.x,
    y: Array.isArray(resolved.y) ? resolved.y[index] : resolved.y,
    text: value,
    fontSize: config.fontSize,
    fontFamily: config.fontFamily,
    fontWeight: config.fontWeight,
    textAlign: resolved.textAlign,
    textBaseline: resolved.textBaseline,
    rotation: config.rotation
  }));
  const groupedBounds = unionLabelBounds(labelBounds.map((bounds, index) => ({
    bounds,
    group: resolved.groups[index]
  })));
  const orderedBounds = groupedBounds.sort((left, right) => channel === "x"
    ? left.left - right.left
    : left.top - right.top);
  if (!canvas || !labelBounds.every(item => textBoundsFitCanvas(item, canvas))) {
    throw new Error(`The ${channel}-axis labels do not fit the Canvas margin.`);
  }
  if (config.overlap === "error" && orderedBounds.some((item, index) => index > 0 &&
    textBoundsIntersect(orderedBounds[index - 1], item))) {
    throw new Error(`The ${channel}-axis labels overlap each other.`);
  }
  const title = program.graphicSpec.objects[`${channel}AxisTitle`]
    ? resolveConcreteGraphicBounds(program.graphicSpec, `${channel}AxisTitle`)
    : undefined;
  if (title &&
    program.guideConfigs.axis?.[channel]?.title?.inferredOffset !== true &&
    labelBounds.some(item => textBoundsIntersect(item, title))) {
    throw new Error(`The ${channel}-axis labels overlap the axis title.`);
  }
  return resolved;
}

function makeEdit(channel) {
  const op = channel === "x" ? "editXAxisLabels" : "editYAxisLabels";
  return action({ op, description: `Edit concrete ${channel}-axis labels.` }, withGuideLayoutValidation(function (args = {}) {
    validateOptions(args, op, false);
    const id = `${channel}AxisLabels`;
    if (this.graphicSpec.objects[id]?.type !== "text") throw new Error(`${op} requires existing axis labels.`);
    const previous = this.guideConfigs.axis?.[channel]?.labels;
    if (!previous) throw new Error(`${op} requires label configuration.`);
    const explicitMode = Object.hasOwn(args, "values") || Object.hasOwn(args, "count");
    const ticks = this.guideConfigs.axis?.[channel]?.ticks;
    const inferredValues = !explicitMode && previous.inferredValues === true &&
      ticks?.mode === "values"
      ? ticks.values
      : undefined;
    const mode = Object.hasOwn(args, "values") || inferredValues !== undefined
      ? "values"
      : Object.hasOwn(args, "count") ? "count" : previous.mode;
    const config = normalizeLabelLayout({
      ...previous,
      ...args,
      ...(inferredValues === undefined ? {} : { values: inferredValues }),
      ...(explicitMode ? { inferredValues: false } : {}),
      mode
    }, args, op);
    if (mode === "values") delete config.count; else delete config.values;
    validateConfig(channel, config);
    assertTickCompatibility(this.guideConfigs.axis?.[channel]?.ticks, config, op);
    const resolved = resolve(this, channel, config);
    let next = this._withGuideConfig(channel, "labels", config);
    const properties = {
      length: resolved.text.length,
      x: resolved.x,
      y: resolved.y,
      text: resolved.text,
      fill: config.color,
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
    const titleConfig = next.guideConfigs.axis?.[channel]?.title;
    if (titleConfig?.inferredOffset === true) {
      const editTitle = channel === "x" ? "editXAxisTitle" : "editYAxisTitle";
      next = next[editTitle]();
    }
    return next;
  }));
}

const editXAxisLabels = makeEdit("x");
const editYAxisLabels = makeEdit("y");

function makeCreate(channel) {
  const op = channel === "x" ? "createXAxisLabels" : "createYAxisLabels";
  const edit = channel === "x" ? "editXAxisLabels" : "editYAxisLabels";
  return action({ op, description: `Create concrete ${channel}-axis labels.` }, withGuideLayoutValidation(function (args = {}) {
    validateOptions(args, op, true);
    const scale = validateUserId(args.scale ?? channel, "Scale id");
    const guideScale = this.semanticSpec.guides.axis?.[channel]?.scale;
    if (guideScale && guideScale !== scale) throw new Error(`${op} conflicts with the existing axis scale.`);
    const id = `${channel}AxisLabels`;
    if (this.graphicSpec.objects[id]) throw new Error(`${op} requires missing axis labels.`);
    const ticks = this.guideConfigs.axis?.[channel]?.ticks;
    const hasValues = Object.hasOwn(args, "values");
    const hasCount = Object.hasOwn(args, "count");
    const mode = hasValues ? "values" : hasCount ? "count" : ticks?.mode ?? "count";
    const config = normalizeLabelLayout({
      scale,
      position: defaultAxisPosition(channel),
      offset: channel === "x" ? 18 : 12,
      format: "auto",
      color: DEFAULTS.color,
      fontSize: DEFAULTS.fontSize,
      fontFamily: DEFAULTS.fontFamily,
      fontWeight: DEFAULTS.fontWeight,
      rotation: DEFAULTS.rotation,
      overlap: DEFAULTS.overlap,
      ...args,
      inferredValues: !hasValues && !hasCount && ticks?.inferredValues === true,
      mode
    }, args, op);
    if (mode === "values") config.values ??= ticks?.values; else config.count ??= ticks?.count ?? DEFAULTS.count;
    validateConfig(channel, config);
    assertTickCompatibility(ticks, config, op);
    resolve(this, channel, config);
    return this.editSemantic({ property: `guide.axis.${channel}.scale`, value: scale })
      .createGraphics({
        id,
        type: "text",
        length: 0,
        ...resolvePlotGraphicPlacement(this)
      })
      ._withGuideConfig(channel, "labels", config)[edit]();
  }));
}

const createXAxisLabels = makeCreate("x");
const createYAxisLabels = makeCreate("y");

export function registerAxisLabelActions(Class) {
  Class.prototype.editXAxisLabels = editXAxisLabels;
  Class.prototype.editYAxisLabels = editYAxisLabels;
  Class.prototype.createXAxisLabels = createXAxisLabels;
  Class.prototype.createYAxisLabels = createYAxisLabels;
}
