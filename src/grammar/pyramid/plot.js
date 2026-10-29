import { cloneAndFreeze } from "../../core/immutable.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateNonEmptyString, validateNonNegativeFinite, validatePositiveFinite, validateUnitInterval, validateFontWeight } from "../../core/validation.js";
import { validateFillPaint } from "../paint.js";
import { normalizeMarkEffects, MARK_EFFECT_PROPERTIES } from "../markEffects.js";
import { validateTextFormat } from "../text.js";
import { normalizePyramidOptions } from "./layout.js";

export const PYRAMID_LAYOUT_FIELDS = Object.freeze(["orientation", "encoding", "gap", "lastStage", "taperRatio", "percentBase"]);
export const PYRAMID_PLOT_FIELDS = Object.freeze(["stage", "value", ...PYRAMID_LAYOUT_FIELDS, "stages", "labels", "clip"]);
export const PYRAMID_PLOT_DEFAULTS = cloneAndFreeze({
  stages: { fill: "#2563eb", stroke: "none", strokeWidth: 0, opacity: 1 },
  labels: { fill: "#0f172a", fontFamily: "sans-serif", fontSize: 12, fontWeight: "normal" }
});
const BODY = ["fill", "stroke", "strokeWidth", "opacity", ...MARK_EFFECT_PROPERTIES];
const TEXT = ["fill", "fontFamily", "fontSize", "fontWeight", ...MARK_EFFECT_PROPERTIES];

function paint(input, fields, label, stored = false) {
  ownRecord(input, label); rejectUnknownProperties(input, fields, label);
  if (Object.values(input).some(value => value === undefined)) throw new TypeError(`${label} cannot contain undefined.`);
  const output = { ...input, ...normalizeMarkEffects(input, label, stored) };
  for (const [key, value] of Object.entries(input)) {
    if (key === "fill") output[key] = validateFillPaint(value, `${label} fill`);
    else if (["stroke", "fontFamily"].includes(key)) validateNonEmptyString(value, `${label} ${key}`);
    else if (key === "strokeWidth") validateNonNegativeFinite(value, `${label} strokeWidth`);
    else if (key === "opacity") validateUnitInterval(value, `${label} opacity`);
    else if (key === "fontSize") validatePositiveFinite(value, `${label} fontSize`);
    else if (key === "fontWeight") validateFontWeight(value, `${label} fontWeight`);
  }
  return output;
}

export function normalizePyramidPlot(patch, previous, previousConfig, stored = false) {
  ownRecord(patch, "Pyramid plot"); rejectUnknownProperties(patch, PYRAMID_PLOT_FIELDS, "pyramid plot");
  if (Object.values(patch).some(value => value === undefined)) throw new TypeError("Pyramid plot options cannot contain undefined.");
  const stage = patch.stage ?? previous?.stage, value = patch.value ?? previous?.value;
  validateNonEmptyString(stage, "Pyramid stage field"); validateNonEmptyString(value, "Pyramid value field");
  const options = { ...previous?.options };
  // Switching modes releases only the previous mode's implicit/default policy.
  if (patch.encoding !== undefined && patch.encoding !== options.encoding) {
    delete options.lastStage; delete options.taperRatio;
  }
  for (const field of PYRAMID_LAYOUT_FIELDS) if (Object.hasOwn(patch, field)) options[field] = patch[field];
  const { width, height, ...resolved } = normalizePyramidOptions({ ...options, width: 1, height: 1 });
  let labels = previous?.labels ?? { content: "stage", format: "auto" };
  const config = { stages: PYRAMID_PLOT_DEFAULTS.stages, labels: PYRAMID_PLOT_DEFAULTS.labels, clip: true, ...previousConfig };
  if (Object.hasOwn(patch, "clip")) config.clip = patch.clip;
  if (typeof config.clip !== "boolean") throw new TypeError("Pyramid clip must be boolean.");
  if (Object.hasOwn(patch, "stages")) config.stages = { ...config.stages, ...paint(patch.stages, BODY, "Pyramid stages", stored) };
  if (Object.hasOwn(patch, "labels")) {
    if (patch.labels === false) { labels = false; config.labels = false; }
    else {
      ownRecord(patch.labels, "Pyramid labels");
      if (Object.values(patch.labels).some(value => value === undefined)) throw new TypeError("Pyramid labels cannot contain undefined.");
      rejectUnknownProperties(patch.labels, ["content", "format", ...TEXT], "pyramid labels");
      const { content = labels?.content ?? "stage", format = labels?.format ?? "auto", ...style } = patch.labels;
      labels = { content, format };
      config.labels = { ...PYRAMID_PLOT_DEFAULTS.labels, ...(config.labels || {}), ...paint(style, TEXT, "Pyramid labels", stored) };
    }
  }
  if (labels !== false) {
    if (!["stage", "value", "percent"].includes(labels.content)) throw new TypeError("Pyramid label content must be stage, value or percent.");
    validateTextFormat(labels.format);
    if (labels.content === "percent" && resolved.percentBase === undefined) throw new TypeError("Pyramid percent labels require explicit percentBase.");
  }
  return cloneAndFreeze({ binding: { stage, value, options: resolved, labels }, config });
}

export function validatePyramidBinding(layer, config) {
  ownRecord(layer.pyramid, "Pyramid binding");
  rejectUnknownProperties(layer.pyramid, ["stage", "value", "options", "labels"], "pyramid binding");
  ownRecord(config, "Pyramid configuration"); rejectUnknownProperties(config, ["stages", "labels", "clip"], "pyramid configuration");
  const binding = layer.pyramid;
  ownRecord(binding.options, "Pyramid layout options");
  rejectUnknownProperties(binding.options, PYRAMID_LAYOUT_FIELDS, "pyramid layout options");
  if (binding.labels !== false) { ownRecord(binding.labels, "Pyramid label meaning"); rejectUnknownProperties(binding.labels, ["content", "format"], "pyramid label meaning"); }
  if ((binding.labels === false) !== (config.labels === false)) throw new TypeError("Pyramid label meaning and appearance disagree.");
  const normalized = normalizePyramidPlot({ stage: binding.stage, value: binding.value, ...binding.options,
    stages: config.stages, labels: binding.labels === false ? false : { ...config.labels, ...binding.labels }, clip: config.clip }, undefined, undefined, true);
  for (const [actual, expected] of [[binding, normalized.binding], [config, normalized.config]]) {
    const equal = (a, b) => typeof a === "object" && a !== null && typeof b === "object" && b !== null
      ? Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => Object.hasOwn(b, key) && equal(a[key], b[key])) : Object.is(a, b);
    if (!equal(actual, expected)) throw new TypeError("Pyramid state requires canonical resolved fields.");
  }
  if (layer.conditionals !== undefined || layer.source !== undefined) throw new TypeError("Pyramid stages use their own dataset layout.");
  ownRecord(layer.encoding ?? {}, "Pyramid encoding"); rejectUnknownProperties(layer.encoding ?? {}, ["color"], "pyramid encoding");
}

export function readPyramidStages(rows, rowKeys, binding) {
  return rows.map((row, index) => {
    const stage = row[binding.stage], value = row[binding.value];
    if (!Object.hasOwn(row, binding.stage) || !["string", "number", "boolean"].includes(typeof stage) || typeof stage === "number" && !Number.isFinite(stage)) {
      throw new TypeError(`Pyramid stage field "${binding.stage}" requires scalar labels.`);
    }
    if (!Number.isFinite(value) || value < 0) throw new RangeError("Pyramid stage values must be nonnegative and finite.");
    return { key: rowKeys[index], value };
  });
}
