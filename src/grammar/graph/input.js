import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { encodeRowKey } from "../../core/itemIdentity.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { normalizeObservedGraph } from "./normalize.js";
import { createGraphModel, graphLimits, indexGraphModel } from "./model.js";
import { inferGraphNeighbors } from "./neighbors.js";
import { inferGraphGroups, inferGraphSequence } from "./structural.js";
import { inferGraphMst, selectGraphSpanningForest } from "./spanning.js";
import { graphFields, graphKeyField, graphSourceRows, graphSourceKey, graphFieldValue, graphAttributes,
  graphFeatureFields, graphFeatureVector } from "./fields.js";

export const OBSERVED_GRAPH_FIELDS = Object.freeze(["nodeKey", "source", "target", "edgeKey", "weight", "attributes", "directed", "selfLoops", "maxNodes", "maxEdges"]);
export const INFERRED_GRAPH_FIELDS = Object.freeze(["nodeKey", "ruleId", "rule", "features", "metric", "preprocess", "attributes", "options", "maxNodes", "maxEdges"]);

export function normalizeGraphSourceOptions(input, allowed) {
  ownRecord(input, "Graph source options");
  rejectUnknownProperties(input, allowed, "graph source");
  if (Object.values(input).some(value => value === undefined)) throw new TypeError("Graph source options cannot be undefined.");
  const limits = graphLimits(Object.fromEntries(["maxNodes", "maxEdges"].filter(key => Object.hasOwn(input, key)).map(key => [key, input[key]])));
  return { ...input, nodeKey: graphKeyField(input.nodeKey, "Graph nodeKey"),
    attributes: graphFields(Object.hasOwn(input, "attributes") ? input.attributes : [], "Graph attributes", { empty: true }), ...limits };
}

// Dataset revisions supply their persisted row keys. Array offsets are lineage,
// never observed parallel-edge identities.
export function resolveObservedGraphInput(nodeRows, edgeRows, input, occurrenceKeys) {
  const options = normalizeGraphSourceOptions(input, OBSERVED_GRAPH_FIELDS);
  for (const field of ["source", "target", "edgeKey"]) if (field !== "edgeKey" || Object.hasOwn(options, field)) options[field] = graphKeyField(options[field], `Graph ${field}`);
  if (Object.hasOwn(options, "weight")) options.weight = graphKeyField(options.weight, "Graph weight");
  if (Array.isArray(options.weight)) throw new TypeError("Graph weight requires one field.");
  if (!Object.hasOwn(options, "directed")) options.directed = false;
  if (!Object.hasOwn(options, "selfLoops")) options.selfLoops = false;
  graphSourceRows(nodeRows, options.maxNodes, "Graph node rows");
  graphSourceRows(edgeRows, options.maxEdges, "Graph edge rows");
  if (!Object.hasOwn(options, "edgeKey")) {
    ownArray(occurrenceKeys, "Graph occurrence keys");
    if (occurrenceKeys.length !== edgeRows.length) throw new TypeError("Graph occurrence keys must cover every edge row.");
  } else if (occurrenceKeys !== undefined) throw new TypeError("Explicit graph edge keys cannot also use occurrence keys.");
  const nodes = nodeRows.map((row, index) => ({ key: graphSourceKey(row, options.nodeKey), sourceRows: [index], attributes: graphAttributes(row, options.attributes) }));
  const edges = edgeRows.map((row, index) => {
    const weight = Object.hasOwn(options, "weight") ? graphFieldValue(row, options.weight, true) : 1;
    if (!Number.isFinite(weight)) throw new TypeError("Graph weight fields require finite numbers.");
    return {
    ...(Object.hasOwn(options, "edgeKey") ? { key: graphSourceKey(row, options.edgeKey) } : { occurrenceKey: occurrenceKeys[index] }),
    sourceKey: graphSourceKey(row, options.source), targetKey: graphSourceKey(row, options.target), sourceRows: [index],
    weight
  }; });
  return cloneAndFreeze({ options, model: normalizeObservedGraph(nodes, edges, { directed: options.directed,
    selfLoops: options.selfLoops, maxNodes: options.maxNodes, maxEdges: options.maxEdges }) });
}

function metricInput(rows, options) {
  options.features = graphFeatureFields(options.features, options.metric);
  return rows.map(row => graphFeatureVector(row, options.features));
}

function structuralInput(rows, keys, options) {
  for (const name of ["features", "metric", "preprocess"]) if (Object.hasOwn(options, name)) throw new TypeError(`Graph ${options.rule} does not use ${name}.`);
  const fields = options.rule === "group" ? graphFields(options.options.fields, "Graph group fields")
    : graphFields(options.options.groupBy ?? [], "Graph sequence groups", { empty: true });
  const { fields: _fields, groupBy: _groupBy, orderField, ...policy } = options.options;
  if (options.rule === "group") {
    if (Object.hasOwn(options.options, "groupBy") || Object.hasOwn(options.options, "orderField")) throw new TypeError("Graph group does not use sequence fields.");
    return inferGraphGroups(keys, rows.map(row => fields.map(field => graphFieldValue(row, field))), { ...policy, ruleId: options.ruleId });
  }
  if (Object.hasOwn(options.options, "fields")) throw new TypeError("Graph sequence does not use group fields.");
  const order = graphKeyField(orderField, "Graph sequence orderField");
  if (Array.isArray(order)) throw new TypeError("Graph sequence orderField requires one field.");
  return inferGraphSequence(keys, rows.map(row => fields.map(field => graphFieldValue(row, field))),
    rows.map(row => graphFieldValue(row, order)), { ...policy, ruleId: options.ruleId });
}

function candidateInput(keys, candidate) {
  indexGraphModel(candidate);
  if (candidate.directed) throw new TypeError("Graph MST candidates must be undirected.");
  const indexes = new Map(keys.map((key, index) => [encodeRowKey(key), index]));
  if (candidate.nodes.some(node => !indexes.has(node.key))) throw new TypeError("Graph MST candidate nodes must belong to the source data.");
  return candidate.edges.map(edge => ({ sourceIndex: indexes.get(edge.sourceKey), targetIndex: indexes.get(edge.targetKey), weight: edge.weight }));
}

// Pure field adapter: every topology is computed by its rule owner, then lowered
// once into the common graph model. Resource identity and revision stay outside.
export function resolveInferredGraphInput(rows, input, candidate) {
  const options = normalizeGraphSourceOptions(input, INFERRED_GRAPH_FIELDS);
  graphSourceRows(rows, options.maxNodes, "Graph source rows");
  ownRecord(Object.hasOwn(options, "options") ? options.options : {}, "Graph inference options");
  options.options = { ...options.options };
  for (const key of ["ruleId", "rule", "metric", "features", "preprocess"]) {
    if (Object.hasOwn(options.options, key)) throw new TypeError(`Graph ${key} belongs to the source definition.`);
  }
  if (Object.values(options.options).some(value => value === undefined)) throw new TypeError("Graph inference options cannot be undefined.");
  const keys = rows.map(row => graphSourceKey(row, options.nodeKey));
  const structural = ["group", "sequence"].includes(options.rule);
  let inferred;
  if (candidate !== undefined) {
    if (options.rule !== "mst") throw new TypeError("Graph candidates require MST inference.");
    for (const field of ["metric", "features", "preprocess"]) if (Object.hasOwn(options, field)) throw new TypeError("Graph candidate MST cannot also use metric features.");
    inferred = selectGraphSpanningForest(keys, candidateInput(keys, candidate), { ...options.options, ruleId: options.ruleId });
  } else if (structural) inferred = structuralInput(rows, keys, options);
  else {
    const vectors = metricInput(rows, options);
    const policy = { ...options.options, ruleId: options.ruleId, metric: options.metric,
      ...(Object.hasOwn(options, "preprocess") ? { preprocess: options.preprocess } : {}) };
    inferred = options.rule === "mst" ? inferGraphMst(keys, vectors, policy)
      : inferGraphNeighbors(keys, vectors, { ...policy, rule: options.rule });
  }
  const included = inferred.preparation?.sourceIndices ?? inferred.sourceIndices ?? rows.map((_, index) => index);
  const directed = options.rule === "sequence" || inferred.options.directed === true;
  const nodes = included.map(index => ({ key: encodeRowKey(keys[index]), sourceRows: [index], attributes: graphAttributes(rows[index], options.attributes) }));
  const edges = inferred.edges.map(({ key, sourceKey, targetKey, weight, sourceIndex, targetIndex }) => ({
    key, sourceKey, targetKey, weight, directed, origin: "inferred", ruleId: options.ruleId, sourceRows: [sourceIndex, targetIndex]
  }));
  const model = createGraphModel(nodes, edges, { directed, selfLoops: false, maxNodes: options.maxNodes, maxEdges: options.maxEdges });
  return cloneAndFreeze({ options, model, inference: inferred });
}
