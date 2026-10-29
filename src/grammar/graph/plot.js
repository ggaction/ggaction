import { MARK_EFFECT_PROPERTIES, normalizeMarkEffects } from "../markEffects.js";
import { normalizeMarkSelector } from "../markSelection.js";
import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { encodeRowKey } from "../../core/itemIdentity.js";
import { validateFillPaint } from "../paint.js";
import { rejectUnknownProperties, validateNonEmptyString, validateNonNegativeFinite, validatePositiveFinite, validateFontWeight, validateUnitInterval, validateGeneratedItemLimit } from "../../core/validation.js";

const NODE_FIELDS = ["radius", "fill", "stroke", "strokeWidth", "opacity", ...MARK_EFFECT_PROPERTIES];
const EDGE_FIELDS = ["stroke", "strokeWidth", "opacity", "parallelGap", "loopRadius", "arrowSize", "arrows", "shadow"];
const LABEL_FIELDS = ["fill", "fontSize", "fontFamily", "fontWeight", ...MARK_EFFECT_PROPERTIES];
export const GRAPH_PLOT_DEFAULTS = cloneAndFreeze({
  nodes: { radius: 6, fill: "#2563eb", stroke: "#ffffff", strokeWidth: 1, opacity: 1, overrides: [] },
  edges: { stroke: "#94a3b8", strokeWidth: 1.5, opacity: 1, parallelGap: 16, loopRadius: 20, arrowSize: 8, arrows: "auto" },
  labels: { fill: "#0f172a", fontSize: 12, fontFamily: "sans-serif", fontWeight: "normal", offset: [0, 14], overrides: [] }
});
const { nodes: NODES, edges: EDGES, labels: LABELS } = GRAPH_PLOT_DEFAULTS;
function record(input, fields, label) {
  ownRecord(input, label); rejectUnknownProperties(input, fields, label);
  if (Object.values(input).some(value => value === undefined || value === null)) throw new TypeError(`${label} cannot contain null or undefined.`);
  return Object.assign(Object.create(null), input);
}
function pair(value, label) {
  ownArray(value, label);
  if (value.length !== 2 || !value.every(Number.isFinite)) throw new TypeError(`${label} requires two finite coordinates.`);
  return value;
}
function paint(input, fields, label, stored = false) {
  const value = record(input, fields, label);
  for (const [key, entry] of Object.entries(value)) {
    if (key === "fill") value.fill = validateFillPaint(entry, `${label} fill`);
    else if (["stroke", "fontFamily"].includes(key)) validateNonEmptyString(entry, `${label} ${key}`);
    else if (["radius", "strokeWidth", "parallelGap", "loopRadius", "arrowSize"].includes(key)) validateNonNegativeFinite(entry, `${label} ${key}`);
    else if (key === "opacity") validateUnitInterval(entry, `${label} opacity`);
    else if (key === "fontSize") validatePositiveFinite(entry, `${label} fontSize`);
    else if (key === "fontWeight") validateFontWeight(entry, `${label} fontWeight`);
    else if (key === "arrows" && entry !== "auto" && typeof entry !== "boolean") throw new TypeError("Graph arrows must be auto or boolean.");
  }
  return Object.assign(value, normalizeMarkEffects(value, label, stored));
}
function overrides(input, fields, graph, labels) {
  ownArray(input, "Graph node overrides"); validateGeneratedItemLimit(input.length, "Graph override count");
  const known = new Set(graph.result.model.nodes.map(node => node.key)), seen = new Set();
  return input.map(item => {
    const value = record(item, ["key", ...fields, ...(labels ? ["text"] : [])], "Graph override");
    if (!Object.hasOwn(value, "key")) throw new TypeError("Graph overrides require a typed node key.");
    const key = encodeRowKey(value.key);
    if (!known.has(key) || seen.has(key)) throw new TypeError("Graph override keys must exist and be unique.");
    seen.add(key);
    const { key: _key, text, ...style } = value; Object.assign(style, paint(style, fields, "Graph override style"));
    if (Object.hasOwn(value, "text") && typeof text !== "string") throw new TypeError("Graph label overrides require string text.");
    return { key, ...style, ...(text === undefined ? {} : { text }) };
  });
}

export function normalizeGraphPlot(input, graph, previous, previousLabels = false) {
  const patch = record(input, ["origin", "clip", "nodes", "edges", "labels"], "Graph plot options");
  const config = Object.assign(Object.create(null), { origin: "auto", clip: false, nodes: NODES, edges: EDGES }, previous);
  if (Object.hasOwn(patch, "origin")) config.origin = patch.origin === "auto" ? "auto" : pair(patch.origin, "Graph plot origin");
  if (Object.hasOwn(patch, "clip")) {
    if (typeof patch.clip !== "boolean") throw new TypeError("Graph plot clip must be boolean.");
    config.clip = patch.clip;
  }
  if (Object.hasOwn(patch, "nodes")) {
    const value = record(patch.nodes, [...NODE_FIELDS, "overrides"], "Graph nodes");
    const { overrides: requested, ...style } = value; Object.assign(style, paint(style, NODE_FIELDS, "Graph node style"));
    config.nodes = { ...config.nodes, ...style, ...(requested === undefined ? {} : { overrides: overrides(requested, NODE_FIELDS, graph, false) }) };
  }
  if (Object.hasOwn(patch, "edges")) config.edges = { ...config.edges, ...paint(patch.edges, EDGE_FIELDS, "Graph edges") };
  let labels = previousLabels;
  if (Object.hasOwn(patch, "labels")) {
    if (patch.labels === false) { labels = false; delete config.labels; }
    else {
      const value = record(patch.labels, ["field", "offset", "overrides", ...LABEL_FIELDS], "Graph labels");
      const { field, offset, overrides: requested, ...style } = value; Object.assign(style, paint(style, LABEL_FIELDS, "Graph label style"));
      if (field !== undefined) validateNonEmptyString(field, "Graph label field");
      const entries = requested === undefined ? undefined : overrides(requested, LABEL_FIELDS, graph, true);
      labels = { ...(previousLabels === false ? {} : previousLabels), ...(field === undefined ? {} : { field }),
        overrides: entries === undefined ? (previousLabels === false ? [] : previousLabels.overrides) : entries.filter(entry => Object.hasOwn(entry, "text")).map(({ key, text }) => ({ key, text })) };
      config.labels = { ...LABELS, ...config.labels, ...style, ...(offset === undefined ? {} : { offset: pair(offset, "Graph label offset") }),
        ...(entries === undefined ? {} : { overrides: entries.map(({ text: _text, ...entry }) => entry) }) };
    }
  }
  return cloneAndFreeze({ config: { ...config }, labels });
}

export function validateGraphPlotDefinition(config, labels) {
  const exact = (value, required, optional, label) => {
    const checked = record(value, [...required, ...optional], label);
    if (required.some(key => !Object.hasOwn(checked, key))) throw new TypeError(`${label} requires its stored fields.`);
    return checked;
  };
  const entries = (values, fields, text = false) => {
    ownArray(values, "Stored graph overrides"); validateGeneratedItemLimit(values.length, "Stored graph override count");
    const seen = new Set();
    for (const input of values) {
      const entry = exact(input, text ? ["key", "text"] : ["key"], fields, "Stored graph override");
      validateNonEmptyString(entry.key, "Stored graph override key");
      if (seen.has(entry.key)) throw new TypeError("Stored graph override keys must be unique.");
      seen.add(entry.key);
      const { key: _key, text: content, ...style } = entry; paint(style, fields, "Stored graph style", true);
      if (text && typeof content !== "string") throw new TypeError("Stored graph label text must be a string.");
    }
  };
  exact(config, ["origin", "clip", "nodes", "edges"], ["labels", "view"], "Stored graph plot");
  if (config.view !== undefined) {
    exact(config.view, ["selectors"], [], "Stored graph view");
    ownArray(config.view.selectors, "Stored graph view selectors");
    validateGeneratedItemLimit(config.view.selectors.length, "Graph view selector count");
    if (!config.view.selectors.length) throw new TypeError("Graph view requires at least one selector.");
    for (const selector of config.view.selectors) {
      if (normalizeMarkSelector(selector).grain !== "item") throw new TypeError("Graph views support node item grain only.");
      if (selector.channel !== undefined) throw new TypeError("Graph views select node fields, rows or concrete properties; graph nodes have no encoding channels.");
    }
  }
  if (config.origin !== "auto") pair(config.origin, "Stored graph origin");
  if (typeof config.clip !== "boolean") throw new TypeError("Stored graph clip must be boolean.");
  exact(config.nodes, [...NODE_FIELDS.filter(key => !MARK_EFFECT_PROPERTIES.includes(key)), "overrides"], MARK_EFFECT_PROPERTIES, "Stored graph node style");
  const { overrides: nodeOverrides, ...nodeStyle } = config.nodes; paint(nodeStyle, NODE_FIELDS, "Stored graph node style", true); entries(nodeOverrides, NODE_FIELDS);
  exact(config.edges, EDGE_FIELDS.filter(key => key !== "shadow"), ["shadow"], "Stored graph edge style"); paint(config.edges, EDGE_FIELDS, "Stored graph edge style", true);
  if (labels === false) {
    if (Object.hasOwn(config, "labels")) throw new TypeError("Disabled graph labels cannot retain paint.");
  } else {
    exact(labels, ["overrides"], ["field"], "Stored graph label meaning");
    if (Object.hasOwn(labels, "field")) validateNonEmptyString(labels.field, "Stored graph label field");
    entries(labels.overrides, [], true);
    exact(config.labels, [...LABEL_FIELDS.filter(key => !MARK_EFFECT_PROPERTIES.includes(key)), "offset", "overrides"], MARK_EFFECT_PROPERTIES, "Stored graph label style");
    const { offset, overrides: labelOverrides, ...labelStyle } = config.labels;
    pair(offset, "Stored graph label offset"); paint(labelStyle, LABEL_FIELDS, "Stored graph label style", true); entries(labelOverrides, LABEL_FIELDS);
  }
}
