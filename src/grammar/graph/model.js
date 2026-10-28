import { cloneAndFreeze, isPlainObject } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";

export function graphLimits(options = {}) {
  ownRecord(options, "Graph limits");
  rejectUnknownProperties(options, ["maxNodes", "maxEdges"], "graph limits");
  const result = Object.fromEntries(["maxNodes", "maxEdges"].map(name => [name, Object.hasOwn(options, name) ? options[name] ?? 10_000 : 10_000]));
  for (const name of ["maxNodes", "maxEdges"]) {
    if ((Object.hasOwn(options, name) && options[name] === null) || !Number.isSafeInteger(result[name]) || result[name] < 1) {
      throw new RangeError(`Graph ${name} must be a positive safe integer.`);
    }
  }
  return result;
}

function requiredFields(record, fields, label) {
  if (fields.some(field => !Object.hasOwn(record, field))) throw new TypeError(`${label} requires all own fields.`);
}

function attributes(value, charge) {
  if (!isPlainObject(value)) throw new TypeError("Graph node attributes must be a plain object.");
  const pending = [{ value, depth: 0 }], ancestors = new Set();
  while (pending.length) {
    const entry = pending.pop(), item = entry.value;
    if (entry.exit) { ancestors.delete(item); continue; }
    charge(4);
    if (typeof item === "string") charge(item.length);
    if (item === null || ["undefined", "boolean", "number", "bigint", "string"].includes(typeof item)) continue;
    if (entry.depth > 64 || ancestors.has(item)) throw new Error("Graph attributes cannot be cyclic or exceed depth 64.");
    if (Array.isArray(item)) { charge(item.length * 4); ownArray(item, "Graph attribute array"); }
    else {
      if (!isPlainObject(item)) throw new TypeError("Graph attributes require plain data values.");
      charge(Reflect.ownKeys(item).length * 4);
      ownRecord(item, "Graph attribute object");
    }
    ancestors.add(item); pending.push({ value: item, exit: true });
    for (const key of Object.keys(item)) {
      charge(key.length);
      pending.push({ value: item[key], depth: entry.depth + 1 });
    }
  }
}

function sourceRows(value, charge) {
  if (Array.isArray(value)) charge(value.length * 3);
  ownArray(value, "Graph sourceRows");
  const seen = new Set();
  for (const row of value) {
    if (!Number.isSafeInteger(row) || row < 0 || seen.has(row)) throw new TypeError("Graph sourceRows require unique nonnegative safe integers.");
    seen.add(row);
  }
}

function records(nodes, edges, directed, selfLoops, limits, priorWork = 0) {
  if (typeof directed !== "boolean" || typeof selfLoops !== "boolean") throw new TypeError("Graph directed and selfLoops must be explicit booleans.");
  if (!Number.isSafeInteger(priorWork) || priorWork < 0) throw new RangeError("Graph prior work must be a nonnegative safe integer.");
  let work = priorWork;
  const charge = amount => validateWorkLimit(work += amount, "Graph model work");
  for (const [values, maximum, label] of [[nodes, limits.maxNodes, "nodes"], [edges, limits.maxEdges, "edges"]]) {
    if (Array.isArray(values)) { validateGeneratedItemLimit(values.length, `Graph ${label}`, maximum); charge(values.length * 48); }
    ownArray(values, `Graph ${label}`);
  }
  const token = value => {
    if (typeof value !== "string" || value.length === 0) throw new TypeError("Normalized graph keys must be non-empty opaque strings.");
    charge(value.length * 4);
    return value;
  };
  const nodeIndexes = new Map(), edgeIndexes = new Map();
  nodes.forEach((node, index) => {
    ownRecord(node, "Graph node");
    rejectUnknownProperties(node, ["key", "sourceRows", "attributes"], "graph node");
    requiredFields(node, ["key", "sourceRows", "attributes"], "Graph node");
    token(node.key);
    if (nodeIndexes.has(node.key)) throw new Error("Graph node keys must be unique.");
    sourceRows(node.sourceRows, charge); attributes(node.attributes, charge);
    nodeIndexes.set(node.key, index);
  });
  const adjacency = nodes.map(node => ({ key: node.key, incoming: [], outgoing: [], neighbors: [] }));
  const neighbors = nodes.map(() => new Set());
  edges.forEach((edge, index) => {
    ownRecord(edge, "Graph edge");
    rejectUnknownProperties(edge, ["key", "sourceKey", "targetKey", "directed", "weight", "origin", "ruleId", "sourceRows"], "graph edge");
    requiredFields(edge, ["key", "sourceKey", "targetKey", "directed", "weight", "origin", "ruleId", "sourceRows"], "Graph edge");
    token(edge.key); token(edge.sourceKey); token(edge.targetKey);
    if (edgeIndexes.has(edge.key)) throw new Error("Graph edge keys must be unique.");
    const source = nodeIndexes.get(edge.sourceKey), target = nodeIndexes.get(edge.targetKey);
    if (source === undefined || target === undefined) throw new Error("Graph edge endpoints must reference existing nodes.");
    if (edge.directed !== directed || !Number.isFinite(edge.weight)) throw new TypeError("Graph edges require matching direction and finite weight.");
    if (edge.origin === "observed" ? edge.ruleId !== null : edge.origin !== "inferred" || typeof edge.ruleId !== "string" || !edge.ruleId) {
      throw new TypeError("Graph edge origin and ruleId are inconsistent.");
    }
    if (source === target && (!selfLoops || edge.origin === "inferred")) throw new Error("Graph self edges require observed origin and selfLoops:true.");
    if (edge.ruleId !== null) charge(edge.ruleId.length);
    sourceRows(edge.sourceRows, charge);
    adjacency[source].outgoing.push(edge.key); adjacency[target].incoming.push(edge.key);
    if (!directed && source !== target) { adjacency[source].incoming.push(edge.key); adjacency[target].outgoing.push(edge.key); }
    for (const [from, to] of [[source, target], [target, source]]) {
      if (!neighbors[from].has(to)) { neighbors[from].add(to); adjacency[from].neighbors.push(nodes[to].key); }
    }
    edgeIndexes.set(edge.key, index);
  });
  return { nodeIndexes, edgeIndexes, adjacency, work, charge };
}

// This explicit token boundary is shared by observed normalization and layouts.
// It accepts no resources, datasets, encoded-key parser or inference policy.
export function createGraphModel(nodes, edges, options, priorWork = 0) {
  ownRecord(options, "Graph model options");
  requiredFields(options, ["directed", "selfLoops"], "Graph model options");
  const { directed, selfLoops, ...limitOptions } = options;
  const resolved = graphLimits(limitOptions), indexed = records(nodes, edges, directed, selfLoops, resolved, priorWork);
  return cloneAndFreeze({ nodes, edges, directed, selfLoops, adjacency: indexed.adjacency });
}

export function indexGraphModel(model, options = {}) {
  const limits = graphLimits(options);
  ownRecord(model, "Graph model");
  rejectUnknownProperties(model, ["nodes", "edges", "directed", "selfLoops", "adjacency"], "graph model");
  requiredFields(model, ["nodes", "edges", "directed", "selfLoops", "adjacency"], "Graph model");
  const indexed = records(model.nodes, model.edges, model.directed, model.selfLoops, limits);
  if (Array.isArray(model.adjacency)) indexed.charge(model.adjacency.length * 8);
  ownArray(model.adjacency, "Graph adjacency");
  if (model.adjacency.length !== model.nodes.length) throw new Error("Graph adjacency must match its nodes.");
  model.adjacency.forEach((entry, index) => {
    ownRecord(entry, "Graph adjacency entry");
    rejectUnknownProperties(entry, ["key", "incoming", "outgoing", "neighbors"], "graph adjacency entry");
    requiredFields(entry, ["key", "incoming", "outgoing", "neighbors"], "Graph adjacency entry");
    const expected = indexed.adjacency[index];
    if (entry.key !== expected.key) throw new Error("Graph adjacency keys must follow node order.");
    for (const property of ["incoming", "outgoing", "neighbors"]) {
      if (Array.isArray(entry[property])) indexed.charge(entry[property].length * 4);
      ownArray(entry[property], `Graph adjacency ${property}`);
      if (entry[property].length !== expected[property].length || entry[property].some((key, i) => key !== expected[property][i])) {
        throw new Error("Graph adjacency disagrees with its edges.");
      }
    }
  });
  return { nodes: model.nodes, edges: model.edges, nodeIndexes: indexed.nodeIndexes, edgeIndexes: indexed.edgeIndexes, work: indexed.charge(0) };
}
