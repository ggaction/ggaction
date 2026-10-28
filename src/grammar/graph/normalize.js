import { encodeRowKey } from "../../core/itemIdentity.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { createGraphModel, graphLimits } from "./model.js";

// Callers resolve fields and persist occurrence identities before this boundary.
// Raw typed keys are encoded once; normalized graph consumers keep them opaque.
export function normalizeObservedGraph(nodes, edges, options) {
  ownRecord(options, "Observed graph options");
  rejectUnknownProperties(options, ["directed", "selfLoops", "maxNodes", "maxEdges"], "observed graph");
  if (!Object.hasOwn(options, "directed")) throw new TypeError("Observed graph requires own directed option.");
  const { directed, selfLoops = false, ...limitOptions } = Object.assign(Object.create(null), options), limits = graphLimits(limitOptions);
  if (typeof directed !== "boolean" || typeof selfLoops !== "boolean") throw new TypeError("Observed graph directed and selfLoops must be boolean.");
  let work = 0;
  const charge = amount => validateWorkLimit(work += amount, "Observed graph work");
  for (const [values, maximum, label] of [[nodes, limits.maxNodes, "nodes"], [edges, limits.maxEdges, "edges"]]) {
    if (Array.isArray(values)) { validateGeneratedItemLimit(values.length, `Graph ${label}`, maximum); charge(values.length * 24); }
    ownArray(values, `Observed graph ${label}`);
  }
  const key = (value, label) => {
    if (Array.isArray(value)) {
      validateGeneratedItemLimit(value.length, "Graph key components", 64);
      charge(value.length * 4); ownArray(value, label);
      for (const part of value) if (typeof part === "string") charge(part.length);
    } else if (typeof value === "string") charge(value.length);
    const encoded = encodeRowKey(value, label);
    charge(encoded.length);
    return encoded;
  };
  const normalizedNodes = nodes.map((node, index) => {
    ownRecord(node, "Observed graph node");
    rejectUnknownProperties(node, ["key", "sourceRows", "attributes"], "observed graph node");
    if (!Object.hasOwn(node, "key")) throw new TypeError("Observed graph node requires own key.");
    return { key: key(node.key, "Graph node key"), sourceRows: !Object.hasOwn(node, "sourceRows") || node.sourceRows === undefined ? [index] : node.sourceRows,
      attributes: !Object.hasOwn(node, "attributes") || node.attributes === undefined ? {} : node.attributes };
  });
  const normalizedEdges = edges.map((edge, index) => {
    ownRecord(edge, "Observed graph edge");
    rejectUnknownProperties(edge, ["key", "occurrenceKey", "sourceKey", "targetKey", "weight", "sourceRows"], "observed graph edge");
    if (!["sourceKey", "targetKey"].every(key => Object.hasOwn(edge, key))) throw new TypeError("Observed graph edge requires own endpoints.");
    const explicit = Object.hasOwn(edge, "key"), occurrence = Object.hasOwn(edge, "occurrenceKey");
    if (explicit === occurrence) throw new Error("Observed edges require exactly one explicit key or persisted occurrenceKey.");
    let edgeKey;
    if (explicit) edgeKey = key(edge.key, "Graph edge key");
    else {
      if (typeof edge.occurrenceKey !== "string" || !edge.occurrenceKey) throw new TypeError("Graph occurrenceKey must be a non-empty persisted token.");
      charge(edge.occurrenceKey.length * 2);
      edgeKey = JSON.stringify(["observed-occurrence", edge.occurrenceKey]);
    }
    return { key: edgeKey, sourceKey: key(edge.sourceKey, "Graph source key"), targetKey: key(edge.targetKey, "Graph target key"),
      directed, weight: !Object.hasOwn(edge, "weight") || edge.weight === undefined ? 1 : edge.weight, origin: "observed", ruleId: null,
      sourceRows: !Object.hasOwn(edge, "sourceRows") || edge.sourceRows === undefined ? [index] : edge.sourceRows };
  });
  return createGraphModel(normalizedNodes, normalizedEdges, { directed, selfLoops, ...limits }, work);
}
