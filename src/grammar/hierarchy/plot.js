import { validateFillPaint } from "../paint.js";
import { cloneAndFreeze } from "../../core/immutable.js";
import { encodeRowKey } from "../../core/itemIdentity.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateNonEmptyString, validateNonNegativeFinite, validateUnitInterval, validateFontWeight, validatePositiveFinite, validateGeneratedItemLimit } from "../../core/validation.js";

const PAINT = ["fill", "stroke", "strokeWidth", "opacity"];
const LABEL = ["fill", "fontSize", "fontFamily", "fontWeight"];
const DEFAULT_NODES = Object.freeze({ radius: 6, fill: "#2563eb", stroke: "#ffffff", strokeWidth: 1, opacity: 1, overrides: [] });
const DEFAULT_CELLS = Object.freeze({ fill: "#3b82f6", stroke: "#ffffff", strokeWidth: 1, opacity: 1, overrides: [] });
const DEFAULT_LINKS = Object.freeze({ stroke: "#94a3b8", strokeWidth: 1.5, opacity: 1 });
const DEFAULT_LABELS = Object.freeze({ fill: "#0f172a", fontSize: 12, fontFamily: "sans-serif", fontWeight: "normal", overrides: [] });

function pair(value, label) {
  ownArray(value, label);
  if (value.length !== 2 || !value.every(Number.isFinite)) throw new TypeError(`${label} requires two finite numbers.`);
  return value;
}
function paint(value, allowed, label) {
  ownRecord(value, label); rejectUnknownProperties(value, allowed, label);
  const normalized = { ...value };
  for (const [key, entry] of Object.entries(value)) {
    if (key === "fill") normalized.fill = validateFillPaint(entry, `${label} fill`);
    else if (["stroke", "fontFamily"].includes(key)) validateNonEmptyString(entry, `${label} ${key}`);
    else if (["radius", "strokeWidth"].includes(key)) validateNonNegativeFinite(entry, `${label} ${key}`);
    else if (key === "opacity") validateUnitInterval(entry, `${label} opacity`);
    else if (key === "fontSize") validatePositiveFinite(entry, `${label} fontSize`);
    else if (key === "fontWeight") validateFontWeight(entry, `${label} fontWeight`);
  }
  return normalized;
}
export function hierarchyTargetKey(target, sourceOptions) {
  const hasKey = Object.hasOwn(target, "key"), hasPath = Object.hasOwn(target, "path");
  if (hasKey === hasPath || hasPath !== (sourceOptions.format === "groups")) throw new TypeError("Hierarchy target requires key for flat/nested or path for grouped sources.");
  if (hasKey) {
    if (Array.isArray(target.key)) throw new TypeError("Hierarchy target key must be a scalar.");
    return encodeRowKey(target.key, "Hierarchy target key");
  }
  ownArray(target.path, "Hierarchy target path");
  if (!target.path.length || target.path.length > sourceOptions.groupFields.length) throw new TypeError("Hierarchy target path has invalid depth.");
  const parts = target.path.map(value => {
    if (Array.isArray(value)) throw new TypeError("Hierarchy target path component must be a scalar.");
    if (value === null) {
      if (sourceOptions.missingCategory !== "include") throw new TypeError("Null hierarchy target requires missingCategory:include.");
      return null;
    }
    return encodeRowKey(value, "Hierarchy target path component");
  });
  return encodeRowKey(JSON.stringify(["group-path", parts]));
}
function overrides(values, allowed, hierarchy, text = false) {
  ownArray(values, "Hierarchy overrides");
  validateGeneratedItemLimit(values.length, "Hierarchy override count");
  const keys = new Set(), nodes = new Set(hierarchy.result.nodes.filter(node => !node.synthetic).map(node => node.key));
  return values.map(value => {
    ownRecord(value, "Hierarchy override");
    const key = hierarchyTargetKey(value, hierarchy.options);
    if (keys.has(key) || !nodes.has(key)) throw new TypeError("Hierarchy override target must be unique and exist.");
    keys.add(key);
    const { key: _key, path: _path, text: label, ...style } = value;
    const normalized = paint(style, allowed, "Hierarchy override");
    if (Object.hasOwn(value, "text") && (!text || typeof label !== "string")) throw new TypeError("Only label overrides accept string text.");
    return { key, ...normalized, ...(label === undefined ? {} : { text: label }) };
  });
}

// Label meaning is stored on the layer; its paint and placement stay in config.
export function normalizeHierarchyPlot(method, patch, hierarchy, previous, previousLabels = false) {
  ownRecord(patch, "Hierarchy plot options");
  const bodyName = method === "tree" ? "nodes" : "cells", bodyDefault = method === "tree" ? DEFAULT_NODES : DEFAULT_CELLS;
  rejectUnknownProperties(patch, ["origin", "clip", bodyName, "labels", ...(method === "tree" ? ["links"] : [])], "hierarchy plot");
  const config = { origin: "auto", clip: false, [bodyName]: bodyDefault, ...(method === "tree" ? { links: DEFAULT_LINKS } : {}), ...previous };
  for (const key of Object.keys(patch)) if (patch[key] === undefined) throw new TypeError("Hierarchy plot options cannot be undefined.");
  if (Object.hasOwn(patch, "origin")) config.origin = patch.origin === "auto" ? "auto" : pair(patch.origin, "Hierarchy origin");
  if (Object.hasOwn(patch, "clip")) {
    if (typeof patch.clip !== "boolean") throw new TypeError("Hierarchy clip must be boolean.");
    config.clip = patch.clip;
  }
  if (Object.hasOwn(patch, bodyName)) {
    ownRecord(patch[bodyName], "Hierarchy body style");
    if (Object.values(patch[bodyName]).some(value => value === undefined)) throw new TypeError("Hierarchy body options cannot be undefined.");
    const { overrides: requested, ...style } = patch[bodyName];
    const normalized = paint(style, [...PAINT, ...(method === "tree" ? ["radius"] : [])], "Hierarchy body style");
    config[bodyName] = { ...config[bodyName], ...normalized, ...(requested === undefined ? {} : {
      overrides: overrides(requested, [...PAINT, ...(method === "tree" ? ["radius"] : [])], hierarchy) }) };
  }
  if (Object.hasOwn(patch, "links")) {
    config.links = patch.links === false ? false : { ...(config.links || DEFAULT_LINKS), ...paint(patch.links, ["stroke", "strokeWidth", "opacity"], "Hierarchy links") };
  }
  let labels = previousLabels;
  if (Object.hasOwn(patch, "labels")) {
    if (patch.labels === false) { labels = false; delete config.labels; }
    else {
      ownRecord(patch.labels, "Hierarchy labels");
      if (Object.values(patch.labels).some(value => value === undefined)) throw new TypeError("Hierarchy label options cannot be undefined.");
      const { content, offset, overrides: requested, ...style } = patch.labels;
      const normalized = paint(style, LABEL, "Hierarchy labels");
      if (content !== undefined && content !== "value") throw new TypeError("Hierarchy label content must be value.");
      const entries = requested === undefined ? undefined : overrides(requested, LABEL, hierarchy, true);
      labels = { content: "value", overrides: entries === undefined ? (previousLabels?.overrides ?? []) : entries.filter(entry => entry.text !== undefined).map(({ key, text }) => ({ key, text })) };
      config.labels = { ...DEFAULT_LABELS, offset: method === "tree" ? [0, 14] : [0, 0], ...config.labels, ...normalized,
        ...(offset === undefined ? {} : { offset: pair(offset, "Hierarchy label offset") }),
        ...(entries === undefined ? {} : { overrides: entries.map(({ text: _text, ...entry }) => entry) }) };
    }
  }
  return cloneAndFreeze({ config, labels });
}

export function validateHierarchyPlotDefinition(method, config, labels) {
  const bodyName = method === "tree" ? "nodes" : "cells";
  const record = (value, required, optional, label) => {
    ownRecord(value, label);
    rejectUnknownProperties(value, [...required, ...optional], label);
    if (required.some(key => !Object.hasOwn(value, key))) throw new TypeError(`${label} requires all stored fields.`);
  };
  const storedOverrides = (values, allowed) => {
    ownArray(values, "Stored hierarchy overrides");
    validateGeneratedItemLimit(values.length, "Stored hierarchy override count");
    const keys = new Set();
    for (const value of values) {
      record(value, ["key"], allowed, "Stored hierarchy override");
      validateNonEmptyString(value.key, "Stored hierarchy override key");
      if (keys.has(value.key)) throw new TypeError("Stored hierarchy override keys must be unique.");
      keys.add(value.key);
      const { key: _key, ...style } = value;
      paint(style, allowed, "Stored hierarchy override");
    }
  };
  record(config, ["origin", "clip", bodyName, ...(method === "tree" ? ["links"] : [])], ["labels"], "Stored hierarchy plot");
  if (config.origin !== "auto") pair(config.origin, "Stored hierarchy origin");
  if (typeof config.clip !== "boolean") throw new TypeError("Stored hierarchy clip must be boolean.");
  const fields = [...PAINT, ...(method === "tree" ? ["radius"] : [])];
  record(config[bodyName], [...fields, "overrides"], [], "Stored hierarchy body");
  const { overrides: bodyOverrides, ...style } = config[bodyName]; paint(style, fields, "Stored hierarchy body");
  storedOverrides(bodyOverrides, fields);
  if (method === "tree" && config.links !== false) {
    record(config.links, ["stroke", "strokeWidth", "opacity"], [], "Stored hierarchy links");
    paint(config.links, ["stroke", "strokeWidth", "opacity"], "Stored hierarchy links");
  }
  if (labels === false) {
    if (Object.hasOwn(config, "labels")) throw new TypeError("Disabled hierarchy labels cannot retain active placement.");
  } else {
    record(labels, ["content", "overrides"], [], "Stored hierarchy label meaning");
    if (labels.content !== "value") throw new TypeError("Stored hierarchy labels require value content.");
    ownArray(labels.overrides, "Stored hierarchy label text");
    validateGeneratedItemLimit(labels.overrides.length, "Stored hierarchy label count");
    const keys = new Set();
    for (const item of labels.overrides) {
      record(item, ["key", "text"], [], "Stored hierarchy label text");
      if (typeof item.key !== "string" || !item.key || typeof item.text !== "string" || keys.has(item.key)) throw new TypeError("Stored hierarchy label text requires unique keys and strings.");
      keys.add(item.key);
    }
    record(config.labels, [...LABEL, "offset", "overrides"], [], "Stored hierarchy label paint");
    const { offset, overrides: labelOverrides, ...labelPaint } = config.labels;
    pair(offset, "Stored hierarchy label offset"); paint(labelPaint, LABEL, "Stored hierarchy label paint"); storedOverrides(labelOverrides, LABEL);
  }
  return config;
}
