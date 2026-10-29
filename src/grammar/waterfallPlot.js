import { cloneAndFreeze } from "../core/immutable.js";
import { ownRecord } from "../core/ownData.js";
import { rejectUnknownProperties, validateWorkLimit, validateNonEmptyString, validateNonNegativeFinite, validatePositiveFinite, validateUnitInterval, validateFontWeight } from "../core/validation.js";
import { canonicalJSON } from "../core/contentDigest.js";
import { validateFillPaint } from "./paint.js";
import { normalizeMarkEffects, MARK_EFFECT_PROPERTIES } from "./markEffects.js";
import { normalizeBarWidth } from "./bars/geometry.js";
import { validateTextFormat } from "./text.js";
import { resolveWaterfallValues } from "./waterfall.js";

export const WATERFALL_PLOT_FIELDS = Object.freeze(["role", "reset", "width", "bars", "connectors", "labels", "clip"]);
export const WATERFALL_PLOT_DEFAULTS = cloneAndFreeze({
  bars: { positiveFill: "#16a34a", negativeFill: "#dc2626", totalFill: "#2563eb", subtotalFill: "#64748b", stroke: "#334155", strokeWidth: 1, opacity: 1 },
  connectors: { stroke: "#64748b", strokeWidth: 1, opacity: 1 },
  labels: { fill: "#0f172a", fontFamily: "sans-serif", fontSize: 12, fontWeight: "normal", offset: 6 }
});
const BAR = ["positiveFill", "negativeFill", "totalFill", "subtotalFill", "stroke", "strokeWidth", "opacity", ...MARK_EFFECT_PROPERTIES];
const CONNECTOR = ["stroke", "strokeWidth", "opacity", ...MARK_EFFECT_PROPERTIES];
const TEXT = ["fill", "fontFamily", "fontSize", "fontWeight", "offset", ...MARK_EFFECT_PROPERTIES];
function style(input, fields, label, stored) {
  ownRecord(input, label); rejectUnknownProperties(input, fields, label);
  if (Object.values(input).some(value => value === undefined || value === null)) throw new TypeError(`${label} cannot contain null or undefined.`);
  const result = { ...input, ...normalizeMarkEffects(input, label, stored) };
  for (const [key, value] of Object.entries(input)) {
    if (key === "fill" || key.endsWith("Fill")) result[key] = validateFillPaint(value, `${label} ${key}`);
    else if (["stroke", "fontFamily"].includes(key)) validateNonEmptyString(value, `${label} ${key}`);
    else if (["strokeWidth", "offset"].includes(key)) validateNonNegativeFinite(value, `${label} ${key}`);
    else if (key === "opacity") validateUnitInterval(value, `${label} opacity`);
    else if (key === "fontSize") validatePositiveFinite(value, `${label} fontSize`);
    else if (key === "fontWeight") validateFontWeight(value, `${label} fontWeight`);
  }
  return result;
}
export function normalizeWaterfallPlot(patch, previous, previousConfig, stored = false) {
  ownRecord(patch, "Waterfall plot"); rejectUnknownProperties(patch, WATERFALL_PLOT_FIELDS, "Waterfall plot");
  if (Object.values(patch).some(value => value === undefined || value === null)) throw new TypeError("Waterfall options cannot contain null or undefined.");
  const role = patch.role ?? previous?.role;
  validateNonEmptyString(role, "Waterfall role field");
  const reset = patch.reset === false ? undefined : patch.reset ?? previous?.reset;
  if (reset !== undefined) validateNonEmptyString(reset, "Waterfall reset field");
  let labels = previous?.labels ?? false;
  const config = { bars: WATERFALL_PLOT_DEFAULTS.bars, connectors: WATERFALL_PLOT_DEFAULTS.connectors, labels: false, clip: true, width: { band: .72 }, ...previousConfig };
  if (Object.hasOwn(patch, "width")) {
    ownRecord(patch.width, "Waterfall width"); rejectUnknownProperties(patch.width, ["band", "pixels"], "Waterfall width");
    if (Object.values(patch.width).some(value => value === undefined || value === null)) throw new TypeError("Waterfall width cannot contain null or undefined.");
    config.width = normalizeBarWidth(patch.width);
  }
  if (Object.hasOwn(patch, "clip")) config.clip = patch.clip;
  if (typeof config.clip !== "boolean") throw new TypeError("Waterfall clip must be boolean.");
  if (Object.hasOwn(patch, "bars")) config.bars = { ...config.bars, ...style(patch.bars, BAR, "Waterfall bars", stored) };
  if (Object.hasOwn(patch, "connectors")) config.connectors = patch.connectors === false ? false : { ...WATERFALL_PLOT_DEFAULTS.connectors, ...(config.connectors || {}), ...style(patch.connectors, CONNECTOR, "Waterfall connectors", stored) };
  if (Object.hasOwn(patch, "labels")) {
    if (patch.labels === false) { labels = false; config.labels = false; }
    else {
      ownRecord(patch.labels, "Waterfall labels"); rejectUnknownProperties(patch.labels, ["content", "format", ...TEXT], "Waterfall labels");
      if (Object.values(patch.labels).some(value => value === undefined || value === null)) throw new TypeError("Waterfall labels cannot contain null or undefined.");
      const { content = labels?.content ?? "value", format = labels?.format ?? "auto", ...appearance } = patch.labels;
      if (!["value", "end", "category"].includes(content)) throw new TypeError("Waterfall label content must be value, end or category.");
      validateTextFormat(format); labels = { content, format };
      config.labels = { ...WATERFALL_PLOT_DEFAULTS.labels, ...(config.labels || {}), ...style(appearance, TEXT, "Waterfall labels", stored) };
    }
  }
  return cloneAndFreeze({ binding: { role, ...(reset === undefined ? {} : { reset }), labels }, config });
}
export function validateWaterfallBinding(layer, config) {
  ownRecord(layer.waterfall, "Waterfall binding"); rejectUnknownProperties(layer.waterfall, ["role", "reset", "labels"], "Waterfall binding");
  ownRecord(config, "Waterfall configuration"); rejectUnknownProperties(config, ["width", "bars", "connectors", "labels", "clip"], "Waterfall configuration");
  const binding = layer.waterfall;
  if (binding.labels !== false) { ownRecord(binding.labels, "Waterfall label meaning"); rejectUnknownProperties(binding.labels, ["content", "format"], "Waterfall label meaning"); }
  if ((binding.labels === false) !== (config.labels === false)) throw new TypeError("Waterfall label meaning and appearance disagree.");
  const normalized = normalizeWaterfallPlot({ ...binding, ...config, labels: binding.labels === false ? false : { ...config.labels, ...binding.labels } }, undefined, undefined, true);
  if (canonicalJSON(normalized.binding) !== canonicalJSON(binding) || canonicalJSON(normalized.config) !== canonicalJSON(config)) throw new TypeError("Waterfall state requires canonical resolved fields.");
  ownRecord(layer.encoding, "Waterfall encoding"); rejectUnknownProperties(layer.encoding, ["x", "y", "color"], "Waterfall encoding");
  for (const channel of ["x", "y"]) {
    const encoding = layer.encoding[channel]; ownRecord(encoding, `Waterfall ${channel}`);
    rejectUnknownProperties(encoding, ["field", "fieldType", "scale"], `Waterfall ${channel}`);
    validateNonEmptyString(encoding.field, `Waterfall ${channel} field`); validateNonEmptyString(encoding.scale, `Waterfall ${channel} scale`);
  }
  if (!["nominal", "ordinal"].includes(layer.encoding.x.fieldType) || layer.encoding.y.fieldType !== "quantitative") throw new TypeError("Waterfall requires categorical stages and one quantitative value scale.");
  if (layer.conditionals !== undefined || layer.source !== undefined) throw new TypeError("Waterfall uses its own ordered contribution geometry.");
}
export function readWaterfallItems(dataset, layer) {
  const { role, reset } = layer.waterfall, field = layer.encoding.y.field;
  const input = dataset.values.map((row, index) => ({ key: dataset.rowKeys[index], role: row[role],
    ...(Object.hasOwn(row, field) ? { value: row[field] } : {}),
    ...(reset !== undefined && Object.hasOwn(row, reset) ? { reset: row[reset] } : {}) }));
  const result = resolveWaterfallValues(input);
  let contributionCount = 0, work = input.length * 32;
  for (const entry of input) {
    validateWorkLimit(work += entry.role === "delta" || Object.hasOwn(entry, "value") ? 1 : contributionCount + 1, "Waterfall source membership work");
    if (entry.role === "delta") contributionCount++;
    else if (entry.reset === true) contributionCount = 0;
  }
  let contributions = [];
  const items = result.items.map(item => {
    const entry = input[item.sourceIndex];
    const memberIndices = item.role === "delta" || Object.hasOwn(entry, "value") ? [item.sourceIndex] : [...contributions, item.sourceIndex];
    if (item.role === "delta") contributions.push(item.sourceIndex);
    else if (entry.reset === true) contributions = [];
    return { ...item, memberIndices };
  });
  return cloneAndFreeze({ ...result, items });
}
