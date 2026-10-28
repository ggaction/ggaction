import { cloneAndFreeze } from "../../core/immutable.js";
import { compareRowKeys, encodeRowKey } from "../../core/itemIdentity.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateWorkLimit } from "../../core/validation.js";
import { deriveSortedRows, normalizeSortTransform } from "../sort.js";
import { indexHierarchyModel } from "./model.js";

// The semantic caller resolves authored fields and keys before this boundary.
// Encoded node identities are never decoded or used to infer source fields.
export function orderHierarchyModel(model, options, sortValues) {
  ownRecord(options, "Hierarchy order options");
  const by = Object.hasOwn(options, "by") ? options.by : undefined;
  if (!["input", "value", "key", "field"].includes(by)) throw new Error("Hierarchy order requires an explicit input, value, key or field mode.");
  rejectUnknownProperties(options, by === "input" ? ["by", "maxNodes"]
    : by === "field" ? ["by", "direction", "nulls", "temporalUnit", "maxNodes"]
      : ["by", "direction", "maxNodes"], "hierarchy order");
  if (by !== "input" && (!Object.hasOwn(options, "direction") || !["ascending", "descending"].includes(options.direction))) throw new Error("Hierarchy sort direction must be explicit.");
  const { nodes, indexes, work: initialWork } = indexHierarchyModel(model, Object.hasOwn(options, "maxNodes") ? options.maxNodes : undefined);
  let work = initialWork;
  const charge = amount => validateWorkLimit(work += amount, "Hierarchy ordering work");
  charge(nodes.length * 32);
  if (by === "key" || by === "field") {
    if (Array.isArray(sortValues) && sortValues.length !== nodes.length) throw new Error("Hierarchy sort values must align exactly with canonical nodes.");
    ownArray(sortValues, "Hierarchy sort values");
    sortValues.forEach((value, index) => {
      const comparisons = Math.ceil(Math.log2(Math.max(2, nodes[index].parentKey === null ? 1 : nodes[indexes.get(nodes[index].parentKey)].childrenKeys.length)));
      if (typeof value === "string") charge(value.length * comparisons * 4);
      if (by === "key" && !Object.hasOwn(nodes[index], "synthetic")) {
        if (Array.isArray(value)) throw new TypeError("Hierarchy order keys must be typed scalars.");
        const token = encodeRowKey(value, "Hierarchy order key");
        charge(token.length * comparisons * 4);
        if (token !== nodes[index].key) throw new Error("Hierarchy sort key disagrees with its node identity.");
      }
    });
  } else if (sortValues !== undefined) throw new Error("Input and value hierarchy ordering do not accept external sort values.");
  const transform = by === "field" ? normalizeSortTransform({ sortBy: [{ field: "value", order: options.direction,
    ...(Object.hasOwn(options, "nulls") ? { nulls: options.nulls } : {}),
    ...(Object.hasOwn(options, "temporalUnit") ? { temporalUnit: options.temporalUnit } : {}) }] }) : undefined;
  const children = nodes.map(node => {
    const entries = node.childrenKeys.map(key => indexes.get(key));
    if (by === "input") return entries;
    charge(entries.length * Math.ceil(Math.log2(Math.max(2, entries.length))) * 32);
    if (by === "field") return deriveSortedRows(entries.map(index => ({ index, value: sortValues[index] })), transform).map(entry => entry.index);
    const direction = options.direction === "ascending" ? 1 : -1;
    return entries.sort((left, right) => direction * (by === "key" ? compareRowKeys(sortValues[left], sortValues[right])
      : nodes[left].totalValue - nodes[right].totalValue) || left - right);
  });
  const ordered = [], pending = nodes.length ? [0] : [];
  while (pending.length) {
    const index = pending.pop();
    ordered.push({ ...nodes[index], childrenKeys: children[index].map(child => nodes[child].key) });
    for (let i = children[index].length - 1; i >= 0; i--) pending.push(children[index][i]);
  }
  return cloneAndFreeze({ ...model, nodes: ordered });
}
