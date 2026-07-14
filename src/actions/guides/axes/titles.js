import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import { validateKeys } from "../../../core/validation.js";
import { resolveGraphicBounds } from "../../../layout/canvas.js";
import {
  mapLinearValues,
  mapOrdinalPositionValues
} from "../../../grammar/scales.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from
  "../../../theme/defaults.js";
import { findDataset } from "../../../selectors/datasets.js";
import { formatAggregateTitle } from "../../../grammar/aggregate.js";

const CREATE_OPTIONS = Object.freeze([
  "text", "scale", "position", "at", "offset", "rotation", "color",
  "fontSize", "fontFamily", "fontWeight"
]);
const EDIT_OPTIONS = CREATE_OPTIONS.filter(key => key !== "scale");
const DEFAULTS = Object.freeze({
  color: DEFAULT_COLORS.text,
  fontSize: 13,
  fontFamily: DEFAULT_FONT_FAMILY,
  fontWeight: 600
});

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
  const titles = new Set();
  const primaryTitles = new Set();
  for (const layer of program.semanticSpec.layers) {
    const encoding = layer.encoding?.[channel];
    if (
      encoding?.scale === scaleId &&
      typeof encoding.field === "string" &&
      encoding.field.length
    ) {
      const dataset = findDataset(program, layer.data);
      const density = dataset?.transform?.length === 1 &&
        dataset.transform[0].type === "density"
        ? dataset.transform[0]
        : undefined;
      const densityTitle = density === undefined
        ? undefined
        : encoding.field === density.as?.[0]
          ? density.field
          : encoding.field === density.as?.[1]
            ? "Density"
            : undefined;
      const title = densityTitle ?? (encoding.aggregate === undefined
        ? encoding.field
        : formatAggregateTitle(encoding.aggregate, encoding.field));
      titles.add(title);
      if (layer.mark?.type === "point") primaryTitles.add(title);
    }
  }
  if (primaryTitles.size === 1) return [...primaryTitles][0];
  if (titles.size !== 1) throw new Error(`Axis title text cannot be inferred for scale "${scaleId}".`);
  return [...titles][0];
}

function resolveGeometry(program, channel, config) {
  const scale = program.resolvedScales[config.scale];
  const bounds = resolveGraphicBounds(program);
  if (!["linear", "time", "ordinal"].includes(scale?.type) || !bounds) throw new Error("Axis title requires a supported resolved scale and Canvas bounds.");
  if (scale.type === "ordinal" && channel !== "x") throw new Error("Ordinal axis title currently requires the x channel.");
  let along;
  if (config.at === "start") along = scale.range[0];
  else if (config.at === "center") along = (scale.range[0] + scale.range[1]) / 2;
  else if (config.at === "end") along = scale.range[1];
  else {
    if (scale.type === "ordinal") {
      if (!scale.domain.includes(config.at)) throw new RangeError("Axis title at value must be inside the scale domain.");
      along = mapOrdinalPositionValues([config.at], scale)[0];
    } else {
      const low = Math.min(...scale.domain), high = Math.max(...scale.domain);
      if (config.at < low || config.at > high) throw new RangeError("Axis title at value must be inside the scale domain.");
      along = mapLinearValues(
        [config.at],
        scale.domain,
        scale.range,
        { clamp: scale.clamp ?? false }
      )[0];
    }
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
      validateKeys(args, EDIT_OPTIONS, operation.edit);
    if (this.graphicSpec.objects[operation.graphic]?.type !== "text") throw new Error(`${operation.edit} requires an existing axis title.`);
    const previous = this.guideConfigs.axis?.[channel]?.title;
    if (!previous) throw new Error(`${operation.edit} requires title configuration.`);
    const { text, ...appearance } = args;
    const explicitText = Object.hasOwn(args, "text");
    const config = {
      ...previous,
      ...appearance,
      ...(explicitText ? { inferredText: false } : {})
    };
    validateConfig(channel, config);
    let next = this;
    const resolvedTitle = explicitText
      ? validateText(text)
      : config.inferredText === true
        ? inferText(this, channel, config.scale)
        : this.semanticSpec.guides.axis?.[channel]?.title;
    if (resolvedTitle !== this.semanticSpec.guides.axis?.[channel]?.title) {
      next = next.editSemantic({
        property: `guide.axis.${channel}.title`,
        value: validateText(resolvedTitle)
      });
    }
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
      validateKeys(args, CREATE_OPTIONS, operation.create);
    const scale = validateUserId(args.scale ?? channel, "Scale id");
    const guideScale = this.semanticSpec.guides.axis?.[channel]?.scale;
    if (guideScale && guideScale !== scale) throw new Error(`${operation.create} conflicts with the existing axis scale.`);
    if (this.graphicSpec.objects[operation.graphic]) throw new Error(`${operation.create} requires a missing axis title.`);
    const inferredText = !Object.hasOwn(args, "text");
    const text = validateText(args.text ?? inferText(this, channel, scale));
    const config = {
      scale,
      inferredText,
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
