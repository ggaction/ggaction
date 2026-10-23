import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { schemaField } from "./datasetSchema.js";
import { readQuantitativeField } from "./scales/fields.js";
import { applyItemMissingPolicy } from "./itemMissing.js";
import { validateOptionObject } from "../core/validation.js";
import { validateConcreteGraphicValue } from "./schemas/concreteGraphic.js";
import {
  formatValue,
  isUtcValueFormat,
  validateValueFormat
} from "./valueFormat.js";
import { resolveRotation } from "./rotation.js";

export function isSourceOwnedText(layer) {
  return layer?.mark?.type === "text" && layer.source !== undefined;
}

export function isIndependentText(layer) {
  return layer?.mark?.type === "text" && layer.source === undefined;
}

export function validateTextOffsetEncoding(encoding, channel) {
  if (!isPlainObject(encoding)) throw new TypeError(`Text ${channel} encoding must be an object.`);
  const field = Object.hasOwn(encoding, "field");
  const datum = Object.hasOwn(encoding, "datum");
  if (field === datum) throw new Error(`Text ${channel} requires exactly one field or datum.`);
  const allowed = field ? ["field", "fieldType"] : ["datum"];
  if (Object.keys(encoding).some(key => !allowed.includes(key))) {
    throw new Error(`Unsupported Text ${channel} encoding option.`);
  }
  if (field) {
    if (typeof encoding.field !== "string" || encoding.field.length === 0 ||
        encoding.fieldType !== "quantitative") {
      throw new TypeError(`Text ${channel} requires a quantitative field.`);
    }
  } else if (!Number.isFinite(encoding.datum)) {
    throw new TypeError(`Text ${channel} datum must be finite logical pixels.`);
  }
}

export function normalizeTextOffsetAssignment(args, channel) {
  const operation = channel === "dx" ? "encodeDx" : "encodeDy";
  validateOptionObject(args, ["target", "field", "value"], operation);
  const field = Object.hasOwn(args, "field");
  if (field === Object.hasOwn(args, "value")) {
    throw new Error(`${operation} requires exactly one of field or value.`);
  }
  const encoding = field ? { field: args.field, fieldType: "quantitative" } : { datum: args.value };
  validateTextOffsetEncoding(encoding, channel);
  return cloneAndFreeze(encoding);
}

// Resolve missing rows once for positions, content, color and both pixel offsets.
export function resolveTextOffsetDataset(layer, sourceDataset) {
  const channels = ["dx", "dy"].filter(channel => layer.encoding?.[channel] !== undefined);
  if (channels.length && !isIndependentText(layer)) {
    throw new Error("Numeric text offsets require independent Text marks.");
  }
  const dataset = applyItemMissingPolicy(layer, sourceDataset);
  for (const channel of channels) {
    const encoding = layer.encoding[channel];
    validateTextOffsetEncoding(encoding, channel);
    if (!Object.hasOwn(encoding, "field")) continue;
    if (sourceDataset.values.length === 0 &&
        schemaField(sourceDataset.schema, encoding.field)?.storageType !== "number") {
      throw new Error(`Empty Text ${channel} data requires a known numeric field "${encoding.field}".`);
    }
    readQuantitativeField(dataset.values, encoding.field);
  }
  return dataset;
}

export function textOffsetValue(encoding, row, fallback) {
  if (encoding === undefined) return fallback;
  return Object.hasOwn(encoding, "field") ? row[encoding.field] : encoding.datum;
}

export const TEXT_MARK_STYLE_OPTIONS = Object.freeze([
  "fill", "opacity", "fontSize", "fontFamily", "fontWeight",
  "align", "baseline", "rotation", "dx", "dy", "inheritColor", "lineHeight", "blockAlign"
]);

export const DEFAULT_TEXT_MARK = cloneAndFreeze({
  fill: "#334155",
  opacity: 1,
  fontSize: 12,
  fontFamily: "sans-serif",
  fontWeight: "normal",
  align: "left",
  baseline: "alphabetic",
  rotation: 0,
  dx: 0,
  dy: 0
});

export function validateTextFormat(format) {
  if (format !== undefined && typeof format !== "string") {
    throw new Error(
      'Text format must be "auto" or a supported numeric/UTC format string.'
    );
  }
  return validateValueFormat(format, "Text format");
}

export function formatTextValue(value, format = "auto") {
  const resolved = validateTextFormat(format);
  if (value === undefined || value === null) return undefined;
  if (resolved === "auto") {
    const text = String(value);
    return text.length === 0 ? undefined : text;
  }
  return formatValue(value, {
    format: resolved,
    valueType: isUtcValueFormat(resolved) ? "temporal" : "quantitative",
    label: "Text format"
  });
}

export function normalizeTextMarkConfig(options, base = DEFAULT_TEXT_MARK) {
  const config = { ...base };
  if (Object.hasOwn(options, "lineHeight")) {
    if (!Number.isFinite(options.lineHeight) || options.lineHeight <= 0) throw new RangeError("Text lineHeight must be positive and finite.");
    config.lineHeight = options.lineHeight;
  }
  if (Object.hasOwn(options, "blockAlign")) {
    if (!["first", "middle"].includes(options.blockAlign)) throw new Error("Text blockAlign must be first or middle.");
    config.blockAlign = options.blockAlign;
  }
  if (Object.hasOwn(options, "inheritColor")) {
    if (![false, "fill", "stroke"].includes(options.inheritColor)) throw new Error("Text inheritColor must be fill, stroke, or false.");
    config.inheritColor = options.inheritColor;
  }
  const mapping = {
    fill: "fill",
    opacity: "opacity",
    fontSize: "fontSize",
    fontFamily: "fontFamily",
    fontWeight: "fontWeight",
    align: "textAlign",
    baseline: "textBaseline"
  };
  for (const [option, property] of Object.entries(mapping)) {
    if (!Object.hasOwn(options, option)) continue;
    validateConcreteGraphicValue("text", property, options[option]);
    config[option] = options[option];
  }
  if (Object.hasOwn(options, "rotation")) {
    config.rotation = resolveRotation(options.rotation, "Text rotation");
  }
  for (const property of ["dx", "dy"]) {
    if (!Object.hasOwn(options, property)) continue;
    if (!Number.isFinite(options[property])) {
      throw new TypeError(`Text ${property} must be a finite number.`);
    }
    config[property] = options[property];
  }
  return cloneAndFreeze(config);
}

export { resolveTextLines } from "../core/textMetrics.js";
