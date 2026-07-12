import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import { mapLinearValues } from "../../../grammar/scales.js";
import { formatTimeTick, niceTicks, timeTicks } from "../../../grammar/ticks.js";

const OPTIONS = Object.freeze([
  "scale", "position", "count", "values", "offset", "format", "color",
  "fontSize", "fontFamily", "fontWeight"
]);

const DEFAULTS = Object.freeze({
  count: 5,
  color: "#334155",
  fontSize: 12,
  fontFamily: "sans-serif",
  fontWeight: "normal"
});

function validateOptions(args, operation, create) {
  for (const key of Object.keys(args)) {
    if (!OPTIONS.includes(key) || (!create && key === "scale")) {
      throw new Error(`Unknown ${operation} option "${key}".`);
    }
  }
  if (Object.hasOwn(args, "count") && Object.hasOwn(args, "values")) {
    throw new Error(`${operation} cannot use count and values together.`);
  }
}

function validateConfig(channel, config) {
  const supported = channel === "x" ? "bottom" : "left";
  if (config.position !== supported) throw new Error(`Unsupported ${channel}-axis position "${config.position}".`);
  if (config.mode === "count" && (!Number.isInteger(config.count) || config.count <= 0)) throw new RangeError("Label count must be a positive integer.");
  if (config.mode === "values" && (!Array.isArray(config.values) || !config.values.every(Number.isFinite))) throw new TypeError("Label values must be finite numbers.");
  if (!Number.isFinite(config.offset) || config.offset < 0) throw new RangeError("Label offset must be non-negative.");
  if (!Number.isFinite(config.fontSize) || config.fontSize <= 0) throw new RangeError("Label fontSize must be positive.");
  if (typeof config.color !== "string" || !config.color.length) throw new TypeError("Label color must be non-empty.");
  if (typeof config.fontFamily !== "string" || !config.fontFamily.length) throw new TypeError("Label fontFamily must be non-empty.");
  if ((typeof config.fontWeight !== "string" && !Number.isFinite(config.fontWeight))) throw new TypeError("Label fontWeight must be a string or number.");
  if (config.format !== "auto" && (!config.format || !Number.isInteger(config.format.decimals) || config.format.decimals < 0)) throw new TypeError('Label format must be "auto" or { decimals }.');
}

function sameValues(left, right) {
  return left?.length === right?.length && left.every((value, index) => value === right[index]);
}

function assertTickCompatibility(ticks, config, operation) {
  if (!ticks) return;
  if (ticks.scale !== config.scale || ticks.mode !== config.mode) throw new Error(`${operation} conflicts with axis ticks.`);
  if (config.mode === "count" && ticks.count !== config.count) throw new Error(`${operation} conflicts with axis ticks.`);
  if (config.mode === "values" && !sameValues(ticks.values, config.values)) throw new Error(`${operation} conflicts with axis ticks.`);
}

function resolve(program, channel, config) {
  const scale = program.resolvedScales[config.scale];
  const bounds = program.context.currentGraphicBounds;
  if (!["linear", "time"].includes(scale?.type) || !bounds) throw new Error("Axis labels require a resolved continuous scale and Canvas bounds.");
  if (scale.type === "time" && config.format !== "auto") throw new Error('Time axis labels currently require format "auto".');
  const values = config.mode === "values"
    ? config.values
    : scale.type === "time"
      ? timeTicks(scale.domain, config.count)
      : niceTicks(scale.domain, config.count);
  const low = Math.min(...scale.domain), high = Math.max(...scale.domain);
  if (!values.every(value => value >= low && value <= high)) throw new RangeError("Label values must be inside the scale domain.");
  const positions = mapLinearValues(values, scale.domain, scale.range);
  const text = values.map(value =>
    scale.type === "time"
      ? formatTimeTick(value, scale.domain)
      : config.format === "auto"
        ? String(value)
        : value.toFixed(config.format.decimals)
  );
  return channel === "x"
    ? { values, x: positions, y: bounds.y + bounds.height + config.offset, text, textAlign: "center", textBaseline: "top" }
    : { values, x: bounds.x - config.offset, y: positions, text, textAlign: "right", textBaseline: "middle" };
}

function makeEdit(channel) {
  const op = channel === "x" ? "editXAxisLabels" : "editYAxisLabels";
  return action({ op, description: `Edit concrete ${channel}-axis labels.` }, function (args = {}) {
    validateOptions(args, op, false);
    const id = `${channel}AxisLabels`;
    if (this.graphicSpec.objects[id]?.type !== "text") throw new Error(`${op} requires existing axis labels.`);
    const previous = this.guideConfigs.axis?.[channel]?.labels;
    if (!previous) throw new Error(`${op} requires label configuration.`);
    const mode = Object.hasOwn(args, "values") ? "values" : Object.hasOwn(args, "count") ? "count" : previous.mode;
    const config = { ...previous, ...args, mode };
    if (mode === "values") delete config.count; else delete config.values;
    validateConfig(channel, config);
    assertTickCompatibility(this.guideConfigs.axis?.[channel]?.ticks, config, op);
    const resolved = resolve(this, channel, config);
    let next = this._withGuideConfig(channel, "labels", config)
      .editGraphics({ target: id, property: "length", value: resolved.values.length });
    for (const property of ["x", "y", "text"]) next = next.editGraphics({ target: id, property, value: resolved[property] });
    return next
      .editGraphics({ target: id, property: "fill", value: config.color })
      .editGraphics({ target: id, property: "fontSize", value: config.fontSize })
      .editGraphics({ target: id, property: "fontFamily", value: config.fontFamily })
      .editGraphics({ target: id, property: "fontWeight", value: config.fontWeight })
      .editGraphics({ target: id, property: "textAlign", value: resolved.textAlign })
      .editGraphics({ target: id, property: "textBaseline", value: resolved.textBaseline });
  });
}

const editXAxisLabels = makeEdit("x");
const editYAxisLabels = makeEdit("y");

function makeCreate(channel) {
  const op = channel === "x" ? "createXAxisLabels" : "createYAxisLabels";
  const edit = channel === "x" ? "editXAxisLabels" : "editYAxisLabels";
  return action({ op, description: `Create concrete ${channel}-axis labels.` }, function (args = {}) {
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
    const config = {
      scale,
      position: channel === "x" ? "bottom" : "left",
      offset: channel === "x" ? 18 : 12,
      format: "auto",
      color: DEFAULTS.color,
      fontSize: DEFAULTS.fontSize,
      fontFamily: DEFAULTS.fontFamily,
      fontWeight: DEFAULTS.fontWeight,
      ...args,
      mode
    };
    if (mode === "values") config.values ??= ticks?.values; else config.count ??= ticks?.count ?? DEFAULTS.count;
    validateConfig(channel, config);
    assertTickCompatibility(ticks, config, op);
    resolve(this, channel, config);
    return this.editSemantic({ property: `guide.axis.${channel}.scale`, value: scale })
      .createGraphics({ id, type: "text", length: 0 })
      ._withGuideConfig(channel, "labels", config)[edit]();
  });
}

const createXAxisLabels = makeCreate("x");
const createYAxisLabels = makeCreate("y");

export function registerAxisLabelActions(Class) {
  Class.prototype.editXAxisLabels = editXAxisLabels;
  Class.prototype.editYAxisLabels = editYAxisLabels;
  Class.prototype.createXAxisLabels = createXAxisLabels;
  Class.prototype.createYAxisLabels = createYAxisLabels;
}
