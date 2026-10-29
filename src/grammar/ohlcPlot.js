import { cloneAndFreeze } from "../core/immutable.js";
import { ownRecord } from "../core/ownData.js";
import { rejectUnknownProperties, validateNonEmptyString, validateNonNegativeFinite, validatePositiveFinite, validateUnitInterval, validateFontWeight } from "../core/validation.js";
import { canonicalJSON } from "../core/contentDigest.js";
import { validateFillPaint } from "./paint.js";
import { normalizeMarkEffects, MARK_EFFECT_PROPERTIES } from "./markEffects.js";
import { normalizeBarWidth } from "./bars/geometry.js";
import { validateTextFormat } from "./text.js";
import { resolveOHLCValues } from "./ohlc.js";

export const OHLC_PLOT_FIELDS = Object.freeze(["open", "close", "invalid", "doji", "width", "body", "stem", "labels", "clip"]);
export const OHLC_PLOT_DEFAULTS = cloneAndFreeze({
  body: { upFill: "#16a34a", downFill: "#dc2626", stroke: "#334155", strokeWidth: 1, opacity: 1 },
  stem: { stroke: "#334155", strokeWidth: 1, opacity: 1 },
  labels: { fill: "#0f172a", fontFamily: "sans-serif", fontSize: 12, fontWeight: "normal", offset: 6 }
});
const BODY = ["upFill", "downFill", "stroke", "strokeWidth", "opacity", ...MARK_EFFECT_PROPERTIES];
const STEM = ["stroke", "strokeWidth", "opacity", ...MARK_EFFECT_PROPERTIES];
const TEXT = ["fill", "fontFamily", "fontSize", "fontWeight", "offset", ...MARK_EFFECT_PROPERTIES];
function style(input, fields, label, stored) {
  ownRecord(input, label); rejectUnknownProperties(input, fields, label);
  if (Object.values(input).some(value => value === undefined || value === null)) throw new TypeError(`${label} cannot contain null or undefined.`);
  const result = { ...input, ...normalizeMarkEffects(input, label, stored) };
  for (const [key, value] of Object.entries(input)) {
    if (["fill", "upFill", "downFill"].includes(key)) result[key] = validateFillPaint(value, `${label} ${key}`);
    else if (["stroke", "fontFamily"].includes(key)) validateNonEmptyString(value, `${label} ${key}`);
    else if (["strokeWidth", "offset"].includes(key)) validateNonNegativeFinite(value, `${label} ${key}`);
    else if (key === "opacity") validateUnitInterval(value, `${label} opacity`);
    else if (key === "fontSize") validatePositiveFinite(value, `${label} fontSize`);
    else if (key === "fontWeight") validateFontWeight(value, `${label} fontWeight`);
  }
  return result;
}
export function normalizeOHLCPlot(patch, previous, previousConfig, stored = false) {
  ownRecord(patch, "OHLC plot"); rejectUnknownProperties(patch, OHLC_PLOT_FIELDS, "OHLC plot");
  if (Object.values(patch).some(value => value === undefined || value === null)) throw new TypeError("OHLC plot options cannot contain null or undefined.");
  const open = patch.open ?? previous?.open, close = patch.close ?? previous?.close;
  validateNonEmptyString(open, "OHLC open field"); validateNonEmptyString(close, "OHLC close field");
  const invalid = patch.invalid ?? previous?.invalid ?? "error", doji = patch.doji ?? previous?.doji ?? "line";
  resolveOHLCValues([], { invalid });
  if (!["line", "none"].includes(doji)) throw new TypeError("OHLC doji must be line or none.");
  let labels = previous?.labels ?? false;
  const config = { body: OHLC_PLOT_DEFAULTS.body, stem: OHLC_PLOT_DEFAULTS.stem, labels: false, clip: true, ...previousConfig };
  if (Object.hasOwn(patch, "width")) {
    ownRecord(patch.width, "OHLC width"); rejectUnknownProperties(patch.width, ["band", "pixels", "interval"], "OHLC width");
    if (Object.values(patch.width).some(value => value === undefined || value === null)) throw new TypeError("OHLC width cannot contain null or undefined.");
    config.width = normalizeBarWidth(patch.width);
  }
  if (Object.hasOwn(patch, "clip")) config.clip = patch.clip;
  if (typeof config.clip !== "boolean") throw new TypeError("OHLC clip must be boolean.");
  for (const [key, fields] of [["body", BODY], ["stem", STEM]]) if (Object.hasOwn(patch, key)) config[key] = { ...config[key], ...style(patch[key], fields, `OHLC ${key}`, stored) };
  if (Object.hasOwn(patch, "labels")) {
    if (patch.labels === false) { labels = false; config.labels = false; }
    else {
      ownRecord(patch.labels, "OHLC labels"); rejectUnknownProperties(patch.labels, ["content", "format", ...TEXT], "OHLC labels");
      if (Object.values(patch.labels).some(value => value === undefined || value === null)) throw new TypeError("OHLC labels cannot contain null or undefined.");
      const { content = labels?.content ?? "close", format = labels?.format ?? "auto", ...appearance } = patch.labels;
      if (!["open", "close", "low", "high"].includes(content)) throw new TypeError("OHLC label content must be open, close, low or high.");
      validateTextFormat(format);
      labels = { content, format };
      config.labels = { ...OHLC_PLOT_DEFAULTS.labels, ...(config.labels || {}), ...style(appearance, TEXT, "OHLC labels", stored) };
    }
  }
  return cloneAndFreeze({ binding: { open, close, invalid, doji, labels }, config });
}
export function validateOHLCBinding(layer, config) {
  ownRecord(layer.ohlc, "OHLC binding"); rejectUnknownProperties(layer.ohlc, ["open", "close", "invalid", "doji", "labels"], "OHLC binding");
  ownRecord(config, "OHLC configuration"); rejectUnknownProperties(config, ["width", "body", "stem", "labels", "clip"], "OHLC configuration");
  const b = layer.ohlc;
  if (b.labels !== false) { ownRecord(b.labels, "OHLC label meaning"); rejectUnknownProperties(b.labels, ["content", "format"], "OHLC label meaning"); }
  if ((b.labels === false) !== (config.labels === false)) throw new TypeError("OHLC label meaning and appearance disagree.");
  const normalized = normalizeOHLCPlot({ ...b, ...config, labels: b.labels === false ? false : { ...config.labels, ...b.labels } }, undefined, undefined, true);
  if (canonicalJSON(normalized.binding) !== canonicalJSON(b) || canonicalJSON(normalized.config) !== canonicalJSON(config)) throw new TypeError("OHLC state requires canonical resolved fields.");
  ownRecord(layer.encoding, "OHLC encoding"); rejectUnknownProperties(layer.encoding, ["x", "y", "y2", "color"], "OHLC encoding");
  for (const channel of ["x", "y", "y2"]) {
    const encoding = layer.encoding[channel]; ownRecord(encoding, `OHLC ${channel}`);
    rejectUnknownProperties(encoding, ["field", "fieldType", "scale", ...(channel === "x" ? ["temporalUnit"] : [])], `OHLC ${channel}`);
    validateNonEmptyString(encoding.field, `OHLC ${channel} field`); validateNonEmptyString(encoding.scale, `OHLC ${channel} scale`);
  }
  if (!["nominal", "ordinal", "quantitative", "temporal"].includes(layer.encoding.x.fieldType) || layer.encoding.y.fieldType !== "quantitative" || layer.encoding.y2.fieldType !== "quantitative" || layer.encoding.y.scale !== layer.encoding.y2.scale) throw new TypeError("OHLC requires one quantitative price scale and compatible x positions.");
  if (layer.conditionals !== undefined || layer.source !== undefined) throw new TypeError("OHLC uses its own row-owned price geometry.");
}
export function readOHLCItems(dataset, layer) {
  const { open, close, invalid } = layer.ohlc, low = layer.encoding.y.field, high = layer.encoding.y2.field;
  return resolveOHLCValues(dataset.values.map((row, i) => ({ key: dataset.rowKeys[i], low: row[low], high: row[high], open: row[open], close: row[close] })), { invalid });
}
