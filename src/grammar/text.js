import { validateGeneratedItemLimit } from "../core/validation.js";
import { resolveTextBounds } from "../core/textMetrics.js";
import { cloneAndFreeze } from "../core/immutable.js";
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

export function resolveTextLines(text, config) {
  const parts = text.split(/\r\n|\r|\n/u);
  if (parts.length === 1 && config.blockAlign !== "middle") return undefined;
  validateGeneratedItemLimit(parts.length, "Text line count");
  const lineHeight = config.lineHeight ?? config.fontSize * 1.2;
  const bounds = resolveTextBounds({ x: 0, y: 0, text: "", fontSize: config.fontSize,
    textBaseline: config.baseline, textAlign: config.align });
  const offset = config.blockAlign === "middle"
    ? -(bounds.top + bounds.bottom + (parts.length - 1) * lineHeight) / 2 : 0;
  return parts.map((text, index) => ({ text, x: 0, y: offset + index * lineHeight }));
}
