import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { stableFiniteSum } from "../numeric.js";

// Layouts consume opaque normalized keys. Authored typed-key parsing remains in
// normalize.js; this shared boundary validates compiled model integrity only.
export function indexHierarchyModel(model, maxNodes = 10_000) {
  if (!Number.isSafeInteger(maxNodes) || maxNodes < 1) throw new RangeError("Hierarchy maxNodes must be a positive safe integer.");
  ownRecord(model, "Hierarchy model");
  rejectUnknownProperties(model, ["nodes", "rootKey", "valueMode", "totalValue", "diagnostics"], "hierarchy model");
  if (!["leaf-sum", "inclusive", "own-plus-children"].includes(model.valueMode)) throw new Error("Unsupported hierarchy value mode.");
  const nodes = model.nodes;
  let work = 0;
  const charge = amount => validateWorkLimit(work += amount, "Hierarchy model work");
  if (Array.isArray(nodes)) {
    validateGeneratedItemLimit(nodes.length, "Hierarchy node count", maxNodes);
    charge(nodes.length * 48);
  }
  ownArray(nodes, "Hierarchy model nodes");
  const indexes = new Map();
  nodes.forEach((node, index) => {
    ownRecord(node, "Hierarchy model node");
    rejectUnknownProperties(node, ["key", "parentKey", "childrenKeys", "depth", "ownValue", "totalValue", "residual", "sourceRows", "synthetic"], "hierarchy model node");
    if (typeof node.key !== "string" || node.key.length === 0 || indexes.has(node.key)) throw new Error("Hierarchy model node keys must be unique non-empty strings.");
    if (node.parentKey !== null && (typeof node.parentKey !== "string" || node.parentKey.length === 0)) throw new Error("Hierarchy model parent keys must be strings or null.");
    if (!Number.isSafeInteger(node.depth) || node.depth < 0) throw new Error("Hierarchy model depths must be nonnegative safe integers.");
    if (![node.ownValue, node.totalValue, node.residual].every(value => Number.isFinite(value) && value >= 0) || node.ownValue !== node.residual) {
      throw new Error("Hierarchy model values must be finite, nonnegative and consistent.");
    }
    charge(node.key.length + (node.parentKey?.length ?? 0));
    if (Array.isArray(node.childrenKeys)) charge(node.childrenKeys.length * 3);
    if (Array.isArray(node.sourceRows)) charge(node.sourceRows.length * 3);
    ownArray(node.childrenKeys, "Hierarchy model childrenKeys");
    ownArray(node.sourceRows, "Hierarchy model sourceRows");
    if (new Set(node.sourceRows).size !== node.sourceRows.length || node.sourceRows.some(row => !Number.isSafeInteger(row) || row < 0)) throw new Error("Hierarchy model sourceRows are invalid.");
    if (Object.hasOwn(node, "synthetic") && (node.synthetic !== true || index !== 0 || node.parentKey !== null || node.sourceRows.length !== 0 || node.ownValue !== 0)) {
      throw new Error("Only the hierarchy root can be synthetic and have no authored contribution.");
    }
    indexes.set(node.key, index);
  });
  if (nodes.length === 0) {
    if (model.rootKey !== null || model.totalValue !== 0) throw new Error("Empty hierarchy models require a null root and zero total.");
  } else if (model.rootKey !== nodes[0].key || nodes[0].parentKey !== null || nodes[0].depth !== 0 || model.totalValue !== nodes[0].totalValue) {
    throw new Error("Hierarchy model root metadata is inconsistent.");
  }
  let visited = 0;
  const pending = nodes.length ? [0] : [];
  while (pending.length > 0) {
    const index = pending.pop(), node = nodes[index];
    if (index !== visited++) throw new Error("Hierarchy model nodes must form a unique preorder tree.");
    const children = [], seen = new Set();
    for (const key of node.childrenKeys) {
      if (typeof key !== "string") throw new Error("Hierarchy model child keys must be strings.");
      charge(key.length);
      const child = indexes.get(key);
      if (child === undefined || seen.has(key) || nodes[child].parentKey !== node.key || nodes[child].depth !== node.depth + 1) {
        throw new Error("Hierarchy model child and parent references are inconsistent.");
      }
      seen.add(key); children.push(child);
    }
    const childTotal = stableFiniteSum(children.map(child => nodes[child].totalValue), "Hierarchy model child total", { compensated: true });
    if (stableFiniteSum([node.ownValue, childTotal], "Hierarchy model total", { compensated: true }) !== node.totalValue ||
        (model.valueMode === "leaf-sum" && children.length > 0 && node.ownValue !== 0)) {
      throw new Error("Hierarchy model child values disagree with its total.");
    }
    for (let i = children.length - 1; i >= 0; i--) pending.push(children[i]);
  }
  if (visited !== nodes.length) throw new Error("Hierarchy model contains unreachable nodes.");
  const diagnostics = ownRecord(model.diagnostics, "Hierarchy model diagnostics");
  rejectUnknownProperties(diagnostics, ["emptyHierarchy", "emptyValue", "ignoredInternalValues"], "hierarchy model diagnostics");
  if (diagnostics.emptyHierarchy !== (nodes.length === 0) || diagnostics.emptyValue !== (model.totalValue === 0)) throw new Error("Hierarchy model empty diagnostics are inconsistent.");
  if (Array.isArray(diagnostics.ignoredInternalValues)) charge(diagnostics.ignoredInternalValues.length * 4);
  ownArray(diagnostics.ignoredInternalValues, "Hierarchy ignored internal values");
  const ignored = new Set();
  for (const item of diagnostics.ignoredInternalValues) {
    ownRecord(item, "Hierarchy ignored internal value");
    rejectUnknownProperties(item, ["key", "value"], "hierarchy ignored value");
    const index = indexes.get(item.key);
    if (model.valueMode !== "leaf-sum" || index === undefined || nodes[index].synthetic || nodes[index].childrenKeys.length === 0 ||
        ignored.has(item.key) || !Number.isFinite(item.value) || item.value < 0) throw new Error("Hierarchy ignored internal value is inconsistent.");
    ignored.add(item.key);
  }
  return { nodes, indexes, work };
}
