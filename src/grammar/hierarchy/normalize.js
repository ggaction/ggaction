import { cloneAndFreeze } from "../../core/immutable.js";
import { encodeRowKey } from "../../core/itemIdentity.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { stableFiniteSum } from "../numeric.js";

const SYNTHETIC_ROOT = '["hierarchy-root"]';
const MODES = new Set(["leaf-sum", "inclusive", "own-plus-children"]);

// This is a private explicit-node boundary. Field/nested/path adapters share it;
// it does not resolve datasets, store resources or materialize graphical output.
export function normalizeHierarchyNodes(input, options = {}) {
  ownRecord(options, "Hierarchy options");
  rejectUnknownProperties(options, ["valueMode", "forest", "maxNodes"], "hierarchy options");
  const option = (name, fallback) => !Object.hasOwn(options, name) || options[name] === undefined ? fallback : options[name];
  const valueMode = option("valueMode", "leaf-sum"), forest = option("forest", false), maxNodes = option("maxNodes", 10_000);
  if (!MODES.has(valueMode)) throw new Error("Unsupported hierarchy value mode.");
  if (typeof forest !== "boolean") throw new TypeError("Hierarchy forest must be boolean.");
  if (!Number.isSafeInteger(maxNodes) || maxNodes < 1) throw new RangeError("Hierarchy maxNodes must be a positive safe integer.");
  let work = 0;
  const charge = amount => validateWorkLimit(work += amount, "Hierarchy normalization work");
  if (Array.isArray(input)) {
    validateGeneratedItemLimit(input.length + (forest && input.length > 0 ? 1 : 0), "Hierarchy node count", maxNodes);
    charge(input.length * 48);
  }
  ownArray(input, "Hierarchy nodes");
  const key = (value, label) => {
    if (Array.isArray(value)) throw new TypeError("Hierarchy node keys must be typed scalars.");
    if (typeof value === "string") charge(value.length);
    const token = encodeRowKey(value, label);
    charge(token.length);
    return token;
  };
  const records = [], indexes = new Map();
  for (let index = 0; index < input.length; index++) {
    const row = ownRecord(input[index], `Hierarchy node ${index}`);
    rejectUnknownProperties(row, ["key", "parentKey", "value", "sourceRows"], "hierarchy node");
    if (!Object.hasOwn(row, "key") || !Object.hasOwn(row, "parentKey")) {
      throw new Error("Hierarchy nodes require own key and parentKey fields.");
    }
    const token = key(row.key, `Hierarchy node ${index} key`);
    if (indexes.has(token)) throw new Error("Hierarchy node keys must be unique.");
    const parentKey = row.parentKey === null ? null : key(row.parentKey, `Hierarchy node ${index} parentKey`);
    if (token === parentKey) throw new Error("Hierarchy nodes cannot parent themselves.");
    const hasValue = Object.hasOwn(row, "value");
    if (hasValue && (!Number.isFinite(row.value) || row.value < 0)) {
      throw new TypeError("Hierarchy weights must be nonnegative finite numbers.");
    }
    const sourceRows = !Object.hasOwn(row, "sourceRows") || row.sourceRows === undefined ? [index] : row.sourceRows;
    if (Array.isArray(sourceRows)) charge(sourceRows.length * 3);
    ownArray(sourceRows, "Hierarchy sourceRows");
    const seen = new Set();
    for (const sourceRow of sourceRows) {
      if (!Number.isSafeInteger(sourceRow) || sourceRow < 0 || seen.has(sourceRow)) {
        throw new TypeError("Hierarchy sourceRows must contain unique nonnegative safe integers.");
      }
      seen.add(sourceRow);
    }
    indexes.set(token, index);
    records.push({ key: token, parentKey, children: [], depth: 0, hasValue, value: hasValue ? row.value : undefined, sourceRows });
  }
  const roots = [];
  records.forEach((node, index) => {
    if (node.parentKey === null) roots.push(index);
    else {
      const parent = indexes.get(node.parentKey);
      if (parent === undefined) throw new Error("Hierarchy parent key is absent from the input.");
      records[parent].children.push(index);
    }
  });
  // Every node has at most one parent. A component unreachable from a root is
  // cyclic; this iterative pass also handles chains beyond the call-stack limit.
  const preorder = [], pending = roots.slice().reverse();
  while (pending.length > 0) {
    const index = pending.pop(), node = records[index];
    preorder.push(index);
    for (let child = node.children.length - 1; child >= 0; child--) {
      const next = node.children[child];
      records[next].depth = node.depth + 1;
      pending.push(next);
    }
  }
  if (preorder.length !== records.length) throw new Error("Hierarchy contains a cycle.");
  if (roots.length > 1 && !forest) throw new Error("Multiple hierarchy roots require forest:true.");
  const ignoredInternalValues = [];
  for (let i = preorder.length - 1; i >= 0; i--) {
    const node = records[preorder[i]], internal = node.children.length > 0;
    const childrenTotal = stableFiniteSum(node.children.map(index => records[index].totalValue), "Hierarchy child total");
    if (!node.hasValue && (!internal || valueMode === "inclusive")) {
      throw new Error("Hierarchy leaf weights and inclusive internal totals are required.");
    }
    if (valueMode === "leaf-sum" && internal) {
      node.ownValue = 0;
      node.totalValue = childrenTotal;
      if (node.hasValue) ignoredInternalValues.push({ key: node.key, value: node.value });
    } else if (valueMode === "inclusive") {
      if (childrenTotal > node.value) throw new RangeError("Hierarchy child total exceeds its inclusive parent total.");
      node.totalValue = node.value;
      node.ownValue = node.value - childrenTotal;
    } else {
      node.ownValue = node.value ?? 0;
      node.totalValue = stableFiniteSum([node.ownValue, childrenTotal], "Hierarchy subtree total");
    }
    node.residual = node.ownValue;
  }
  const nodes = preorder.map(index => {
    const node = records[index];
    return { key: node.key, parentKey: forest && node.parentKey === null ? SYNTHETIC_ROOT : node.parentKey,
      childrenKeys: node.children.map(child => records[child].key), depth: node.depth + (forest ? 1 : 0),
      ownValue: node.ownValue, totalValue: node.totalValue, residual: node.residual, sourceRows: node.sourceRows };
  });
  if (forest && nodes.length > 0) nodes.unshift({ key: SYNTHETIC_ROOT, parentKey: null,
    childrenKeys: roots.map(index => records[index].key), depth: 0, ownValue: 0,
    totalValue: stableFiniteSum(roots.map(index => records[index].totalValue), "Hierarchy forest total"),
    residual: 0, sourceRows: [], synthetic: true });
  const totalValue = nodes[0]?.totalValue ?? 0;
  return cloneAndFreeze({ nodes, rootKey: nodes[0]?.key ?? null, valueMode, totalValue,
    diagnostics: { emptyHierarchy: nodes.length === 0, emptyValue: totalValue === 0,
      ignoredInternalValues: ignoredInternalValues.reverse() } });
}
