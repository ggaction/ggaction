import { requestedStrokeDetails, STROKE_STYLE_PROPERTIES } from "./strokeStyle.js";
import { requestedMarkOutline } from "./markOutline.js";
import { normalizeConditionalEncoding } from "./conditionalEncoding.js";
import { validateFillPaint } from "./paint.js";
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

export function conditionalTextUsesRows(layer) {
  return ["text", "dx", "dy"].some(channel => {
    const definition = layer.conditionals?.[channel];
    if (definition === undefined) return false;
    const normalized = normalizeConditionalEncoding({ conditions: definition.conditions, otherwise: definition.otherwise });
    return normalized.fields.length > 0 || normalized.selections.length > 0 ||
      [...definition.conditions.map(condition => condition.value), definition.otherwise].some(value => value.field !== undefined);
  });
}

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
  ...STROKE_STYLE_PROPERTIES, "fill", "opacity", "outline", "fontSize", "fontFamily", "fontWeight",
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
  const config = { ...base, ...requestedMarkOutline(options, "Text"), ...requestedStrokeDetails(options, "Text") };
  if (options.textOverrides === "auto") delete config.textOverrides;
  else if (Object.hasOwn(options, "textOverrides")) config.textOverrides = normalizeTextOverrides(options.textOverrides);
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
    if (option === "fill") config.fill = validateFillPaint(options.fill, "Text fill");
    else {
      validateConcreteGraphicValue("text", property, options[option]);
      config[option] = options[option];
    }
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


export const isTextIdentityValue = value => value === null || typeof value === "string" ||
  typeof value === "boolean" || typeof value === "number" && Number.isFinite(value);
export const textIdentity = (fields = {}, channels = {}) => Object.fromEntries(
  Object.entries({ fields, channels }).map(([part, values]) => [part,
    Object.fromEntries(Object.entries(values).filter(([, value]) => isTextIdentityValue(value)))]));
export const textIdentityKey = match => JSON.stringify(["fields", "channels"].map(part =>
  Object.entries(match[part] ?? {}).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)));

export function normalizeTextOverrides(value) {
  if (!Array.isArray(value)) throw new TypeError("textOverrides must be an array or auto.");
  const seen = new Set();
  for (const entry of value) {
    if (!isPlainObject(entry) || Object.keys(entry).length !== 3 ||
        !isPlainObject(entry.match) || typeof entry.text !== "string" ||
        !Number.isInteger(entry.occurrence) || entry.occurrence < 0) {
      throw new TypeError("Each text override requires match, occurrence and text.");
    }
    if (!Object.keys(entry.match).length || Object.keys(entry.match).some(part =>
      !["fields", "channels"].includes(part) || !isPlainObject(entry.match[part]) ||
      !Object.keys(entry.match[part]).length || !Object.values(entry.match[part]).every(isTextIdentityValue))) {
      throw new TypeError("Text match requires nonempty fields or channels containing scalar values.");
    }
    const key = `${textIdentityKey(entry.match)}/${entry.occurrence}`;
    if (seen.has(key)) throw new Error("Duplicate text override selector.");
    seen.add(key);
  }
  return cloneAndFreeze(value);
}

// Count semantic matches before visibility/placement filtering. Never address a graphic index.
export function resolveTextOverrides(items, overrides) {
  const result = new Map();
  if (!overrides?.length) return result;
  const groups = new Map(), priorities = new Map();
  for (const [priority, { match, occurrence, text }] of overrides.entries()) {
    const keys = ["fields", "channels"].flatMap(part => Object.keys(match[part] ?? {}).sort().map(key => [part, key]));
    const shape = JSON.stringify(keys);
    if (!groups.has(shape)) groups.set(shape, { keys, values: new Map() });
    const values = groups.get(shape).values, key = JSON.stringify(keys.map(([part, field]) => match[part][field]));
    if (!values.has(key)) values.set(key, new Map());
    values.get(key).set(occurrence, { text, priority });
  }
  // Complete identities from the editor share one shape: O(items + overrides),
  // rather than scanning all items once for every previously edited label.
  for (const { keys, values } of groups.values()) {
    const counts = new Map();
    for (const item of items) {
      if (!keys.every(([part, field]) => Object.hasOwn(item[part] ?? {}, field) && isTextIdentityValue(item[part][field]))) continue;
      const key = JSON.stringify(keys.map(([part, field]) => item[part][field]));
      const candidates = values.get(key); if (!candidates) continue;
      const occurrence = counts.get(key) ?? 0; counts.set(key, occurrence + 1);
      const chosen = candidates.get(occurrence);
      if (chosen && chosen.priority > (priorities.get(item) ?? -1)) {
        result.set(item, chosen.text); priorities.set(item, chosen.priority);
      }
    }
  }
  return result;
}

export function textIdentityOccurrences(items) {
  const counts = new Map();
  return items.map(item => {
    const identity = textIdentity(item.fields, item.channels), key = textIdentityKey(identity);
    const occurrence = counts.get(key) ?? 0; counts.set(key, occurrence + 1);
    return { identity, occurrence };
  });
}
