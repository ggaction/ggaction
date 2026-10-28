import { cloneAndFreeze } from "../../core/immutable.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, requireStringValue } from "../../core/validation.js";
import { normalizeHierarchyInput } from "./input.js";
import { normalizeTreeOptions } from "./tree.js";
import { normalizeTreemapOptions } from "./treemap.js";

export const HIERARCHY_SOURCE_FIELDS = Object.freeze(["key", "parent", "children", "groupFields", "value", "valueMode", "forest", "missingCategory", "maxNodes"]);

export function normalizeHierarchySource(options, previous) {
  ownRecord(options, "Hierarchy source options");
  rejectUnknownProperties(options, ["format", ...HIERARCHY_SOURCE_FIELDS], "hierarchy source");
  const supplied = { ...previous, ...options };
  const forms = ["parent", "children", "groupFields"].filter(key => Object.hasOwn(supplied, key));
  if (forms.length !== 1) throw new TypeError("Hierarchy source requires exactly one parent, children or groupFields form.");
  const format = { parent: "flat", children: "nested", groupFields: "groups" }[forms[0]];
  if (supplied.format !== undefined && supplied.format !== format) throw new TypeError("Hierarchy edits preserve their source form.");
  for (const key of Object.keys(supplied)) if (supplied[key] === undefined) throw new TypeError("Hierarchy source options cannot be undefined.");
  const result = { ...supplied, format, valueMode: supplied.valueMode ?? "leaf-sum", maxNodes: supplied.maxNodes ?? 10_000,
    ...(format === "groups" ? { missingCategory: supplied.missingCategory ?? "error" } : { forest: supplied.forest ?? false }) };
  normalizeHierarchyInput([], result);
  return cloneAndFreeze(result);
}

export function normalizeHierarchyOrder(value = "input") {
  if (value === "input") return "input";
  ownRecord(value, "Hierarchy order");
  if (!["key", "value", "field"].includes(value.by)) throw new TypeError("Hierarchy order must be input or a key, value or field order.");
  rejectUnknownProperties(value, value.by === "field" ? ["by", "field", "direction", "nulls", "temporalUnit"] : ["by", "direction"], "hierarchy order");
  if (!["ascending", "descending"].includes(value.direction)) throw new TypeError("Hierarchy order requires an explicit direction.");
  if (value.by === "field") {
    requireStringValue(value.field, "Hierarchy order field");
    if (value.nulls !== undefined && !["first", "last"].includes(value.nulls)) throw new TypeError("Hierarchy null order must be first or last.");
    if (value.temporalUnit !== undefined && !["year", "timestamp"].includes(value.temporalUnit)) throw new TypeError("Hierarchy temporal unit must be year or timestamp.");
  }
  for (const key of Object.keys(value)) if (value[key] === undefined) throw new TypeError("Hierarchy order options cannot be undefined.");
  return cloneAndFreeze(value);
}

export function normalizeHierarchyLayout({ method, order = "input", options = {} }) {
  if (!["partition", "tree", "treemap"].includes(method)) throw new TypeError("Hierarchy layout method must be partition, tree or treemap.");
  ownRecord(options, "Hierarchy layout options");
  if (Object.hasOwn(options, "maxNodes") && (!Number.isSafeInteger(options.maxNodes) || options.maxNodes < 1)) throw new RangeError("Hierarchy maxNodes must be a positive safe integer.");
  let resolved;
  if (method === "tree") resolved = normalizeTreeOptions(options);
  else if (method === "treemap") resolved = normalizeTreemapOptions(options);
  else { rejectUnknownProperties(options, ["maxNodes"], "hierarchy partition"); resolved = options; }
  for (const key of Object.keys(resolved)) if (resolved[key] === undefined) throw new TypeError("Hierarchy layout options cannot be undefined.");
  return cloneAndFreeze({ method, order: normalizeHierarchyOrder(order), options: resolved });
}
