import { MARK_EFFECT_PROPERTIES, normalizeMarkEffects } from "../markEffects.js";
import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { encodeRowKey } from "../../core/itemIdentity.js";
import { validateFillPaint } from "../paint.js";
import { rejectUnknownProperties, validateNonEmptyString, validateNonNegativeFinite, validateUnitInterval,
  validatePositiveFinite, validateFontWeight, validateGeneratedItemLimit } from "../../core/validation.js";

const BODY = ["fill", "stroke", "strokeWidth", "opacity", ...MARK_EFFECT_PROPERTIES];
const LABEL = ["fill", "fontFamily", "fontSize", "fontWeight", ...MARK_EFFECT_PROPERTIES];
const NODE_DEFAULT = { fill: "#2563eb", stroke: "#ffffff", strokeWidth: 1, opacity: 1, overrides: [] };
const LINK_DEFAULT = { fill: "#64748b", stroke: "none", strokeWidth: 0, opacity: .45, overrides: [] };
const LABEL_DEFAULT = { fill: "#0f172a", fontFamily: "sans-serif", fontSize: 12, fontWeight: "normal", offset: [0, 0], overrides: [] };

export const FLOW_PLOT_DEFAULTS = cloneAndFreeze({ nodes: NODE_DEFAULT, links: LINK_DEFAULT, labels: LABEL_DEFAULT });

function paint(input, allowed, label, stored = false) {
  ownRecord(input, label); rejectUnknownProperties(input, allowed, label);
  const result = { ...input, ...normalizeMarkEffects(input, label, stored) };
  for (const [key, value] of Object.entries(input)) {
    if (key === "fill") result.fill = validateFillPaint(value, label);
    else if (key === "stroke" || key === "fontFamily") validateNonEmptyString(value, `${label} ${key}`);
    else if (key === "strokeWidth") validateNonNegativeFinite(value, `${label} strokeWidth`);
    else if (key === "opacity") validateUnitInterval(value, `${label} opacity`);
    else if (key === "fontSize") validatePositiveFinite(value, `${label} fontSize`);
    else if (key === "fontWeight") validateFontWeight(value, `${label} fontWeight`);
  }
  return result;
}
function offset(value) {
  ownArray(value, "Flow label offset");
  if (value.length !== 2 || !value.every(Number.isFinite)) throw new TypeError("Flow label offset requires two finite numbers.");
  return value;
}
function content(value) {
  if (["key", "value"].includes(value)) return value;
  ownRecord(value, "Flow label content"); rejectUnknownProperties(value, ["field"], "flow label content");
  validateNonEmptyString(value.field, "Flow label field");
  return value;
}
function overrides(values, fields, graph, kind, text = false) {
  ownArray(values, "Flow overrides"); validateGeneratedItemLimit(values.length, "Flow override count");
  if (kind === "flow-link" && !Object.hasOwn(graph.options.definition, "edgeKey") && values.length) throw new TypeError("Flow link overrides require an explicit graph edgeKey field.");
  const known = new Set(graph.result.model[kind === "flow-node" ? "nodes" : "edges"].map(item => item.key)), seen = new Set();
  return values.map(value => {
    ownRecord(value, "Flow override");
    if (!Object.hasOwn(value, "key")) throw new TypeError("Flow override requires an explicit typed key.");
    const key = encodeRowKey(value.key);
    if (seen.has(key) || !known.has(key)) throw new TypeError("Flow override key must be unique and exist.");
    seen.add(key);
    const { key: _key, text: label, ...style } = value;
    if (Object.hasOwn(value, "text") && (!text || typeof label !== "string")) throw new TypeError("Flow label text must be a string.");
    return { key, ...paint(style, fields, "Flow override"), ...(label === undefined ? {} : { text: label }) };
  });
}

export function normalizeFlowPlot(kind, patch, graph, previous, previousLabels = false) {
  ownRecord(patch, "Flow plot options");
  const body = kind === "flow-node" ? "nodes" : "links";
  rejectUnknownProperties(patch, [body, "clip", ...(kind === "flow-node" ? ["labels"] : [])], "flow plot");
  if (Object.values(patch).some(value => value === undefined)) throw new TypeError("Flow plot options cannot be undefined.");
  const config = { clip: true, body: kind === "flow-node" ? NODE_DEFAULT : LINK_DEFAULT, ...previous };
  if (Object.hasOwn(patch, "clip")) {
    if (typeof patch.clip !== "boolean") throw new TypeError("Flow clip must be boolean.");
    config.clip = patch.clip;
  }
  if (Object.hasOwn(patch, body)) {
    ownRecord(patch[body], "Flow body style");
    const { overrides: requested, ...style } = patch[body];
    if (Object.hasOwn(patch[body], "overrides") && requested === undefined) throw new TypeError("Flow overrides cannot be undefined.");
    config.body = { ...config.body, ...paint(style, BODY, "Flow body style"), ...(requested === undefined ? {} : { overrides: overrides(requested, BODY, graph, kind) }) };
  }
  let labels = previousLabels;
  if (Object.hasOwn(patch, "labels")) {
    if (patch.labels === false) { labels = false; delete config.labels; }
    else {
      ownRecord(patch.labels, "Flow labels");
      if (Object.values(patch.labels).some(value => value === undefined)) throw new TypeError("Flow label options cannot be undefined.");
      const { content: requestedContent, offset: requestedOffset, overrides: requested, ...style } = patch.labels;
      const entries = requested === undefined ? undefined : overrides(requested, LABEL, graph, kind, true);
      labels = { content: content(requestedContent ?? previousLabels?.content ?? "key"),
        overrides: entries === undefined ? previousLabels?.overrides ?? [] : entries.filter(item => item.text !== undefined).map(({ key, text }) => ({ key, text })) };
      config.labels = { ...LABEL_DEFAULT, ...config.labels, ...paint(style, LABEL, "Flow labels"),
        ...(requestedOffset === undefined ? {} : { offset: offset(requestedOffset) }),
        ...(entries === undefined ? {} : { overrides: entries.map(({ text: _text, ...item }) => item) }) };
    }
  }
  return cloneAndFreeze({ config, labels });
}

export function validateFlowPlotDefinition(kind, config, labels) {
  const record = (value, required, optional, label) => {
    ownRecord(value, label); rejectUnknownProperties(value, [...required, ...optional], label);
    if (required.some(key => !Object.hasOwn(value, key))) throw new TypeError(`${label} requires all stored fields.`);
  };
  const storedOverrides = (values, fields, text = false) => {
    ownArray(values, "Stored flow overrides"); validateGeneratedItemLimit(values.length, "Stored flow overrides");
    const seen = new Set();
    for (const value of values) {
      record(value, ["key", ...(text ? ["text"] : [])], fields, "Stored flow override");
      validateNonEmptyString(value.key, "Stored flow override key");
      if (seen.has(value.key)) throw new TypeError("Stored flow override keys must be unique.");
      seen.add(value.key);
      const { key: _key, text: label, ...style } = value;
      if (text && typeof label !== "string") throw new TypeError("Stored flow label text requires a string.");
      paint(style, fields, "Stored flow override", true);
    }
  };
  record(config, ["clip", "body"], ["labels"], "Stored flow plot");
  if (typeof config.clip !== "boolean") throw new TypeError("Stored flow clip must be boolean.");
  record(config.body, [...BODY.filter(key => !MARK_EFFECT_PROPERTIES.includes(key)), "overrides"], MARK_EFFECT_PROPERTIES, "Stored flow body");
  const { overrides: bodyOverrides, ...style } = config.body;
  paint(style, BODY, "Stored flow body", true); storedOverrides(bodyOverrides, BODY);
  if (labels === false) {
    if (Object.hasOwn(config, "labels")) throw new TypeError("Disabled flow labels cannot retain placement.");
  } else {
    if (kind !== "flow-node") throw new TypeError("Only flow nodes support labels.");
    record(labels, ["content", "overrides"], [], "Stored flow label meaning"); content(labels.content); storedOverrides(labels.overrides, [], true);
    record(config.labels, [...LABEL.filter(key => !MARK_EFFECT_PROPERTIES.includes(key)), "offset", "overrides"], MARK_EFFECT_PROPERTIES, "Stored flow label paint");
    const { offset: requestedOffset, overrides: labelOverrides, ...labelStyle } = config.labels;
    offset(requestedOffset); paint(labelStyle, LABEL, "Stored flow labels", true); storedOverrides(labelOverrides, LABEL);
  }
}
