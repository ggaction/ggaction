import { cloneAndFreeze } from "../core/immutable.js";
import { validateConcreteGraphicValue } from "./schemas/concreteGraphic.js";
import {
  formatValue,
  isUtcValueFormat,
  validateValueFormat
} from "./valueFormat.js";

export function isSourceOwnedText(layer) {
  return layer?.mark?.type === "text" && layer.source !== undefined;
}

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
  const mapping = {
    fill: "fill",
    opacity: "opacity",
    fontSize: "fontSize",
    fontFamily: "fontFamily",
    fontWeight: "fontWeight",
    align: "textAlign",
    baseline: "textBaseline",
    rotation: "rotation"
  };
  for (const [option, property] of Object.entries(mapping)) {
    if (!Object.hasOwn(options, option)) continue;
    validateConcreteGraphicValue("text", property, options[option]);
    config[option] = options[option];
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
