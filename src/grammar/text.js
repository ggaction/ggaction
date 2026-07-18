import { cloneAndFreeze } from "../core/immutable.js";
import { validateConcreteGraphicValue } from "./schemas/concreteGraphic.js";

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

const FIXED_FORMAT = /^\.(\d{1,2})f$/;

export function validateTextFormat(format) {
  if (format === undefined || format === "auto") return format ?? "auto";
  if (typeof format !== "string" || !FIXED_FORMAT.test(format)) {
    throw new Error(
      'Text format must be "auto" or a fixed-decimal token such as ".1f".'
    );
  }
  const decimals = Number(format.match(FIXED_FORMAT)[1]);
  if (decimals > 12) {
    throw new RangeError("Text fixed-decimal format supports at most 12 decimals.");
  }
  return format;
}

export function formatTextValue(value, format = "auto") {
  const resolved = validateTextFormat(format);
  if (value === undefined || value === null) return undefined;
  if (resolved === "auto") {
    const text = String(value);
    return text.length === 0 ? undefined : text;
  }
  if (!Number.isFinite(value)) {
    throw new TypeError(`Text format "${resolved}" requires a finite number.`);
  }
  return value.toFixed(Number(resolved.match(FIXED_FORMAT)[1]));
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
