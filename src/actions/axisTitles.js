import { action } from "../core/action.js";
import { validateUserId } from "../core/identifiers.js";
import { mapLinearValues } from "../core/scale.js";

const CREATE_OPTIONS = Object.freeze([
  "text", "scale", "position", "at", "offset", "rotation", "color",
  "fontSize", "fontFamily", "fontWeight"
]);
const EDIT_OPTIONS = CREATE_OPTIONS.filter(key => key !== "scale");
const DEFAULTS = Object.freeze({
  color: "#334155",
  fontSize: 13,
  fontFamily: "sans-serif",
  fontWeight: 600
});

function validateOptions(args, supported, operation) {
  for (const key of Object.keys(args)) {
    if (!supported.includes(key)) {
      throw new Error(`Unknown ${operation} option "${key}".`);
    }
  }
}

function validateText(text) {
  if (typeof text !== "string" || text.length === 0) {
    throw new TypeError("Axis title text must be a non-empty string.");
  }
  return text;
}

function validateConfig(channel, config) {
  const supportedPosition = channel === "x" ? "bottom" : "left";
  if (config.position !== supportedPosition) throw new Error(`Unsupported ${channel}-axis position "${config.position}".`);
  if (!["start", "center", "end"].includes(config.at) && !Number.isFinite(config.at)) throw new TypeError("Axis title at must be start, center, end, or a finite number.");
  if (!Number.isFinite(config.offset) || config.offset < 0) throw new RangeError("Axis title offset must be non-negative.");
  if (!Number.isFinite(config.rotation)) throw new TypeError("Axis title rotation must be finite radians.");
  if (typeof config.color !== "string" || !config.color.length) throw new TypeError("Axis title color must be non-empty.");
  if (!Number.isFinite(config.fontSize) || config.fontSize <= 0) throw new RangeError("Axis title fontSize must be positive.");
  if (typeof config.fontFamily !== "string" || !config.fontFamily.length) throw new TypeError("Axis title fontFamily must be non-empty.");
  if (typeof config.fontWeight !== "string" && !Number.isFinite(config.fontWeight)) throw new TypeError("Axis title fontWeight must be a string or number.");
}

function inferText(program, channel, scaleId) {
  const fields = new Set();
  for (const layer of program.semanticSpec.layers) {
    const encoding = layer.encoding?.[channel];
    if (encoding?.scale === scaleId && typeof encoding.field === "string" && encoding.field.length) fields.add(encoding.field);
  }
  if (fields.size !== 1) throw new Error(`Axis title text cannot be inferred for scale "${scaleId}".`);
  return [...fields][0];
}

function resolveGeometry(program, channel, config) {
  const scale = program.resolvedScales[config.scale];
  const bounds = program.context.currentGraphicBounds;
  if (scale?.type !== "linear" || !bounds) throw new Error("Axis title requires a resolved linear scale and Canvas bounds.");
  let along;
  if (config.at === "start") along = scale.range[0];
  else if (config.at === "center") along = (scale.range[0] + scale.range[1]) / 2;
  else if (config.at === "end") along = scale.range[1];
  else {
    const low = Math.min(...scale.domain), high = Math.max(...scale.domain);
    if (config.at < low || config.at > high) throw new RangeError("Axis title at value must be inside the scale domain.");
    along = mapLinearValues([config.at], scale.domain, scale.range)[0];
  }
  return channel === "x"
    ? { x: along, y: bounds.y + bounds.height + config.offset }
    : { x: bounds.x - config.offset, y: along };
}

function names(channel) {
  const prefix = channel === "x" ? "X" : "Y";
  return { create: `create${prefix}AxisTitle`, edit: `edit${prefix}AxisTitle`, graphic: `${channel}AxisTitle` };
}

function makeEdit(channel) {
  const operation = names(channel);
  return action({ op: operation.edit, description: `Edit the ${channel}-axis title.` }, function (args = {}) {
    validateOptions(args, EDIT_OPTIONS, operation.edit);
    if (this.graphicSpec.objects[operation.graphic]?.type !== "text") throw new Error(`${operation.edit} requires an existing axis title.`);
    const previous = this.guideConfigs.axis?.[channel]?.title;
    if (!previous) throw new Error(`${operation.edit} requires title configuration.`);
    const { text, ...appearance } = args;
    const config = { ...previous, ...appearance };
    validateConfig(channel, config);
    let next = this;
    if (Object.hasOwn(args, "text")) next = next.editSemantic({ property: `guide.axis.${channel}.title`, value: validateText(text) });
    const resolvedText = validateText(next.semanticSpec.guides.axis?.[channel]?.title);
    const geometry = resolveGeometry(next, channel, config);
    next = next._withGuideConfig(channel, "title", config);
    const properties = {
      x: geometry.x, y: geometry.y, text: resolvedText, fill: config.color,
      fontSize: config.fontSize, fontFamily: config.fontFamily,
      fontWeight: config.fontWeight, textAlign: "center", textBaseline: "middle",
      rotation: config.rotation
    };
    for (const [property, value] of Object.entries(properties)) next = next.editGraphics({ target: operation.graphic, property, value });
    return next;
  });
}

const editXAxisTitle = makeEdit("x");
const editYAxisTitle = makeEdit("y");

function makeCreate(channel) {
  const operation = names(channel);
  return action({ op: operation.create, description: `Create the ${channel}-axis title.` }, function (args = {}) {
    validateOptions(args, CREATE_OPTIONS, operation.create);
    const scale = validateUserId(args.scale ?? channel, "Scale id");
    const guideScale = this.semanticSpec.guides.axis?.[channel]?.scale;
    if (guideScale && guideScale !== scale) throw new Error(`${operation.create} conflicts with the existing axis scale.`);
    if (this.graphicSpec.objects[operation.graphic]) throw new Error(`${operation.create} requires a missing axis title.`);
    const text = validateText(args.text ?? inferText(this, channel, scale));
    const config = {
      scale,
      position: channel === "x" ? "bottom" : "left",
      at: "center",
      offset: channel === "x" ? 42 : 52,
      rotation: channel === "x" ? 0 : -Math.PI / 2,
      color: DEFAULTS.color,
      fontSize: DEFAULTS.fontSize,
      fontFamily: DEFAULTS.fontFamily,
      fontWeight: DEFAULTS.fontWeight,
      ...Object.fromEntries(Object.entries(args).filter(([key]) => !["text", "scale"].includes(key)))
    };
    validateConfig(channel, config);
    resolveGeometry(this, channel, config);
    return this
      .editSemantic({ property: `guide.axis.${channel}.scale`, value: scale })
      .editSemantic({ property: `guide.axis.${channel}.title`, value: text })
      .createGraphics({ id: operation.graphic, type: "text" })
      ._withGuideConfig(channel, "title", config)[operation.edit]();
  });
}

const createXAxisTitle = makeCreate("x");
const createYAxisTitle = makeCreate("y");

export function registerAxisTitleActions(Class) {
  Class.prototype.createXAxisTitle = createXAxisTitle;
  Class.prototype.createYAxisTitle = createYAxisTitle;
  Class.prototype.editXAxisTitle = editXAxisTitle;
  Class.prototype.editYAxisTitle = editYAxisTitle;
}
