import { resolveGraphCandidateModel } from "./candidate.js";
import { canonicalJSON } from "../../core/contentDigest.js";
import { encodeValue } from "../../core/valueEncoding.js";
import { encodeRowKey, compareRowKeys } from "../../core/itemIdentity.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateWorkLimit } from "../../core/validation.js";
import { deriveSortedRows, normalizeSortTransform } from "../../grammar/sort.js";
import { normalizeTemporalValue } from "../../grammar/scales/fields.js";
import { stableFiniteSum } from "../../grammar/numeric.js";
import { groupingIdentity } from "../../grammar/rowLineage.js";
import { indexGraphModel } from "../../grammar/graph/model.js";
import { normalizeGraphSourceOptions, INFERRED_GRAPH_FIELDS } from "../../grammar/graph/input.js";
import { graphSourceRows, graphSourceKey, graphAttributes, graphFeatureFields, graphFeatureVector, graphFields, graphKeyField } from "../../grammar/graph/fields.js";
import { normalizeGraphNeighborOptions } from "../../grammar/graph/neighbors.js";
import { normalizeGraphStructuralOptions, resolveGraphGroupHubs } from "../../grammar/graph/structural.js";
import { normalizeGraphSpanningOptions } from "../../grammar/graph/spanning.js";
import { prepareGraphMetricVectors } from "../../grammar/graph/preprocess.js";
import { normalizeGraphSearch } from "../../grammar/graph/search.js";
import { inferredGraphEdgeIdentity } from "../../grammar/graph/edgeIdentity.js";
import { graphMetricPair } from "../../grammar/graph/metrics.js";
import { resolveInputReference } from "../../selectors/resources.js";
import { graphRowReferences } from "./resources.js";

const same = (a, b) => canonicalJSON(encodeValue(a)) === canonicalJSON(encodeValue(b));
function exact(value, fields, label) {
  ownRecord(value, label);
  if (Object.keys(value).length !== fields.length || fields.some(field => !Object.hasOwn(value, field))) throw new TypeError(`${label} requires its exact stored fields.`);
}
function equal(actual, expected, label) {
  if (!same(actual, expected)) throw new TypeError(`Inferred graph ${label} is inconsistent.`);
}
const select = (object, names) => Object.fromEntries(names.filter(key => Object.hasOwn(object, key)).map(key => [key, object[key]]));

function validateSearch(search, policy, preparation, options, keys, pairCount) {
  const approximate = policy.mode === "approximate", indexed = policy.algorithm !== "brute-force";
  exact(search, [...Object.keys(policy), "algorithmVersion", "distanceEvaluations", ...(indexed ? ["work"] : []),
    ...(approximate ? ["candidateCount", "candidateCounts", "fallbackQueries", "holdoutCount", "holdoutSourceIndices", "measuredRecall"] : [])], "Graph search diagnostics");
  for (const [name, value] of Object.entries(policy)) equal(search[name], value, `search ${name}`);
  equal(search.algorithmVersion, `${policy.algorithm}@1`, "search algorithm version");
  if (!Number.isSafeInteger(search.distanceEvaluations) || search.distanceEvaluations < 0) throw new TypeError("Graph search distance evaluations must be a nonnegative integer.");
  if (indexed) {
    if (!Number.isSafeInteger(search.work) || search.work < 0) throw new TypeError("Graph search work must be a nonnegative integer.");
    validateWorkLimit(search.work, "Graph stored search work");
  }
  if (!indexed) return equal(search.distanceEvaluations, pairCount, "search distance evaluations");
  const indices = preparation.sourceIndices, n = indices.length;
  if (!approximate) {
    if (search.distanceEvaluations > pairCount * (options.rule === "knn" ? 2 : 1)) throw new TypeError("Graph search distance evaluations exceed the exact pair bound.");
    return;
  }
  ownArray(search.candidateCounts, "Graph search candidate counts");
  const k = n < 2 ? 0 : options.k;
  if (search.candidateCounts.length !== n || search.candidateCounts.some(count => !Number.isSafeInteger(count) || count < 0 || count >= n)) throw new TypeError("Invalid graph search candidate counts.");
  equal(search.candidateCount, search.candidateCounts.reduce((sum, count) => sum + count, 0), "search candidate total");
  const fallback = indices.filter((_, index) => search.candidateCounts[index] < k);
  equal(search.fallbackQueries, fallback, "search fallback rows");
  if (fallback.length && policy.fallback !== "exact") throw new TypeError("Graph search fallback requires an explicit exact policy.");
  const holdout = [...indices].sort((a, b) => compareRowKeys(keys[a], keys[b])).slice(0, 1000);
  equal(search.holdoutCount, holdout.length, "search holdout count");
  equal(search.holdoutSourceIndices, holdout, "search holdout rows");
  const expectedEvaluations = search.candidateCounts.reduce((sum, count) => sum + (count < k ? n - 1 : count), 0) + holdout.length * Math.max(0, n - 1);
  equal(search.distanceEvaluations, expectedEvaluations, "search distance evaluations");
  const recall = search.measuredRecall, denominator = holdout.length * k, recalled = recall * denominator;
  if (!Number.isFinite(recall) || recall < policy.minRecall || recall > 1 ||
      (k === 0 ? recall !== 1 : Math.abs(recalled - Math.round(recalled)) > Number.EPSILON * denominator * 4)) throw new TypeError("Graph search recall is inconsistent with its qualification policy.");
}

function definitionPolicy(definition, candidate) {
  const normalized = normalizeGraphSourceOptions(definition, INFERRED_GRAPH_FIELDS);
  validateUserId(normalized.ruleId, "Graph ruleId");
  if (!["knn", "radius", "similarity", "mst", "group", "sequence"].includes(normalized.rule)) throw new TypeError("Unsupported graph inference rule.");
  ownRecord(normalized.options, "Graph inference options");
  if (Object.values(normalized.options).some(value => value === undefined)) throw new TypeError("Graph inference options cannot contain undefined.");
  for (const field of ["ruleId", "rule", "metric", "features", "preprocess"]) if (Object.hasOwn(normalized.options, field)) throw new TypeError("Graph inference source fields must belong to the definition.");
  const structural = ["group", "sequence"].includes(normalized.rule), metric = !candidate && !structural;
  if (candidate && normalized.rule !== "mst") throw new TypeError("Graph candidates require MST inference.");
  for (const field of ["features", "metric", "preprocess"]) if (!metric && Object.hasOwn(normalized, field)) throw new TypeError("This graph rule does not use metric features.");
  let options, preparation;
  if (metric) {
    normalized.features = graphFeatureFields(normalized.features, normalized.metric);
    preparation = prepareGraphMetricVectors([], { ...select(normalized, ["metric", "preprocess"]), ...select(normalized.options, ["missing", "zeroVector"]) });
  }
  if (structural) {
    const sequence = normalized.rule === "sequence";
    const fields = sequence ? ["groupBy", "orderField"] : ["fields"];
    if (sequence) {
      graphFields(normalized.options.groupBy ?? [], "Graph sequence groups", { empty: true });
      if (Array.isArray(graphKeyField(normalized.options.orderField, "Graph sequence orderField"))) throw new TypeError("Graph sequence orderField requires one field.");
      normalizeSortTransform({ sortBy: [{ field: "value", ...select(normalized.options, ["temporalUnit"]) }] });
    } else graphFields(normalized.options.fields, "Graph group fields");
    options = normalizeGraphStructuralOptions({ ...Object.fromEntries(Object.entries(normalized.options).filter(([key]) => !fields.includes(key))), ruleId: normalized.ruleId }, sequence);
  } else if (normalized.rule === "mst") {
    const policy = normalizeGraphSpanningOptions({ ...normalized.options, ruleId: normalized.ruleId,
      ...(metric ? select(normalized, ["metric", "preprocess"]) : {}) }, metric);
    options = { ruleId: policy.ruleId, forest: policy.forest };
  } else {
    options = normalizeGraphNeighborOptions({ ...normalized.options, ruleId: normalized.ruleId, rule: normalized.rule, ...select(normalized, ["metric", "preprocess"]) });
    normalizeGraphSearch(normalized.options.search, options, preparation);
  }
  if (metric) options = { ...options, ...select(preparation, ["metric", "zeroVector", "preprocess", "missing"]) };
  return { normalized, options, metric, structural };
}

function validateStored(resource) {
  if (resource.provenance.origin !== "inferred" || !same(resource.ownership, { mode: "authored" })) throw new TypeError("Inferred graphs require authored ownership and inferred provenance.");
  exact(resource.options, ["roles", "definition"], "Inferred graph options");
  equal(resource.options.roles, { nodes: 0, edges: 0 }, "source roles");
  if (![1, 2].includes(resource.inputs.length) || resource.inputs[0].kind !== "data" || resource.inputs.length === 2 && resource.inputs[1].kind !== "graph") throw new TypeError("Inferred graphs require one data source and an optional candidate graph.");
  const { normalized, options, metric, structural } = definitionPolicy(resource.options.definition, resource.inputs.length === 2);
  equal(normalized, resource.options.definition, "definition defaults");
  exact(resource.result, ["model", "diagnostics"], "Inferred graph result");
  const { model, diagnostics } = resource.result;
  indexGraphModel(model, { maxNodes: normalized.maxNodes, maxEdges: normalized.maxEdges });
  const directed = normalized.rule === "sequence" || options.directed === true;
  if (model.selfLoops || model.directed !== directed || model.edges.some(edge => edge.origin !== "inferred" || edge.ruleId !== normalized.ruleId)) throw new TypeError("Inferred graph topology disagrees with its rule.");
  const fields = structural ? ["sourceIndices", "omitted", "options"] : normalized.rule === "mst"
    ? ["cost", "components", "componentNodes", "candidateCount", "options", ...(metric ? ["preparation", "pairCount"] : [])]
    : ["preparation", "options", "pairCount", ...(normalized.rule === "knn" ? ["effectiveK"] : []), ...(Object.hasOwn(normalized.options, "search") ? ["search"] : [])];
  exact(diagnostics, fields, "Inferred graph diagnostics"); equal(diagnostics.options, options, "resolved options");
  const n = model.nodes.length;
  if (Object.hasOwn(diagnostics, "pairCount")) equal(diagnostics.pairCount, n < 2 ? 0 : n * (n - 1) / 2, "pair count");
  if (normalized.rule === "knn") {
    if (n > 1 && options.k >= n) throw new TypeError("Graph k must be below its included node count.");
    equal(diagnostics.effectiveK, n < 2 ? 0 : options.k, "effective k");
    if (options.directed && model.adjacency.some(node => node.outgoing.length !== diagnostics.effectiveK)) throw new TypeError("Directed graph kNN must retain exactly k neighbors.");
  }
  if (normalized.rule === "mst") {
    if (!Number.isFinite(diagnostics.cost) || diagnostics.cost < 0 || !Number.isSafeInteger(diagnostics.components) || diagnostics.components < 0 ||
        diagnostics.components > n || !Number.isSafeInteger(diagnostics.candidateCount) || diagnostics.candidateCount < model.edges.length) throw new TypeError("Invalid graph spanning diagnostics.");
    ownArray(diagnostics.componentNodes, "Graph spanning components");
    if (diagnostics.componentNodes.length !== diagnostics.components || model.edges.length !== n - diagnostics.components) throw new TypeError("Graph spanning components disagree with edges.");
    if (!options.forest && diagnostics.components > 1) throw new TypeError("Disconnected graph components require the explicit forest policy.");
  }
}

function validateBindings(program, resource) {
  const definition = resource.options.definition, data = resolveInputReference(program, resource.inputs[0]);
  const candidate = resource.inputs.length === 2 ? resolveInputReference(program, resource.inputs[1]) : undefined;
  const candidateModel = resolveGraphCandidateModel(program, data, candidate, definition);
  const { metric, structural } = definitionPolicy(definition, candidate !== undefined);
  graphSourceRows(data.values, definition.maxNodes, "Graph source rows");
  const { model, diagnostics } = resource.result, keys = data.values.map(row => graphSourceKey(row, definition.nodeKey));
  const tokens = keys.map(key => encodeRowKey(key));
  if (new Set(tokens).size !== tokens.length) throw new TypeError("Graph source keys must be unique.");
  let included, preparation;
  if (metric) {
    preparation = prepareGraphMetricVectors(data.values.map(row => graphFeatureVector(row, definition.features)), {
      ...select(definition, ["metric", "preprocess"]), ...select(definition.options, ["missing", "zeroVector"]) });
    const { vectors: _vectors, ...retained } = preparation;
    equal(diagnostics.preparation, retained, "feature preparation"); included = preparation.sourceIndices;
    if (diagnostics.search) {
      const search = normalizeGraphSearch(definition.options.search, diagnostics.options, preparation);
      validateSearch(diagnostics.search, search, preparation, diagnostics.options, keys, diagnostics.pairCount);
    }
  } else if (structural) {
    included = diagnostics.sourceIndices; ownArray(included, "Graph included rows"); ownArray(diagnostics.omitted, "Graph omitted rows");
    const groupFields = definition.rule === "group" ? definition.options.fields : definition.options.groupBy ?? [];
    const omittedRows = [];
    data.values.forEach((row, index) => {
      const tuple = groupFields.map(field => row[field]);
      if (tuple.some(Array.isArray)) throw new TypeError("Graph group fields require scalar values.");
      groupingIdentity(tuple);
      const missingGroup = tuple.some(value => value === null || value === undefined);
      const missingOrder = definition.rule === "sequence" && (row[definition.options.orderField] === null || row[definition.options.orderField] === undefined);
      if ((missingGroup || missingOrder) && diagnostics.options.missing === "error") throw new TypeError("Graph source has missing structural fields.");
      if (diagnostics.options.missing === "omit-node" && (missingGroup || missingOrder)) omittedRows.push({ index, reason: missingGroup ? "missing-group" : "missing-order" });
    });
    equal(diagnostics.omitted, omittedRows, "omitted rows");
    const excluded = new Set(diagnostics.omitted.map(item => item.index));
    equal(included, data.values.map((_, index) => index).filter(index => !excluded.has(index)), "included rows");
    for (const omitted of diagnostics.omitted) if (!Number.isSafeInteger(omitted.index) || omitted.index < 0 || omitted.index >= keys.length || !["missing-group", "missing-order"].includes(omitted.reason)) throw new TypeError("Invalid graph omitted row.");
  } else included = data.values.map((_, index) => index);
  equal(model.nodes.map(node => node.sourceRows[0]), included, "node membership");
  model.nodes.forEach(node => {
    const index = node.sourceRows[0];
    if (node.key !== tokens[index] || !same(node.sourceRows, [index]) || !same(node.attributes, graphAttributes(data.values[index], definition.attributes))) throw new TypeError("Inferred graph node binding is stale.");
  });
  const prepared = preparation === undefined ? undefined : new Map(preparation.sourceIndices.map((index, offset) => [index, preparation.vectors[offset]]));
  const known = new Set(model.nodes.map(node => node.key)), tokenSet = new Set(tokens), includedSet = new Set(included);
  if (candidate && (candidateModel.directed || candidateModel.nodes.some(node => !tokenSet.has(node.key)) || candidateModel.edges.some(edge => edge.weight < 0))) throw new TypeError("Invalid graph spanning candidate binding.");
  const candidatePairs = new Set((candidateModel?.edges ?? []).flatMap(edge => [
    JSON.stringify([edge.sourceKey, edge.targetKey, edge.weight]), JSON.stringify([edge.targetKey, edge.sourceKey, edge.weight])
  ]));
  const sequencePositions = new Map(), sequenceValues = new Map(), groups = new Map(), groupKeys = [];
  let hubs;
  if (structural) {
    const fields = definition.rule === "group" ? definition.options.fields : definition.options.groupBy ?? [];
    data.values.forEach((row, index) => { groupKeys[index] = groupingIdentity(fields.map(field => row[field])); });
    for (const index of included) {
      const group = groupKeys[index];
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(index);
    }
    if (definition.rule === "group") {
      hubs = resolveGraphGroupHubs(diagnostics.options, { tokens, sourceIndices: included, groups, groupKeys, width: fields.length, work: 0 });
      let expectedEdges = 0;
      for (const [group, members] of groups) {
        if (diagnostics.options.mode === "star" && members.length > 1 && !hubs.has(group)) throw new TypeError("Graph star requires a hub for each non-singleton group.");
        expectedEdges += diagnostics.options.mode === "clique" ? members.length * (members.length - 1) / 2 : Math.max(0, members.length - 1);
      }
      equal(model.edges.length, expectedEdges, "group edge count");
    }
  }
  if (definition.rule === "sequence") {
    const groupFields = definition.options.groupBy ?? [], sort = normalizeSortTransform({ sortBy: [{ field: "value", ...select(definition.options, ["temporalUnit"]) }] });
    const present = data.values.map((row, index) => ({ index, value: row[definition.options.orderField] })).filter(row => row.value !== null && row.value !== undefined);
    const sorted = deriveSortedRows(present.sort((a, b) => compareRowKeys(keys[a.index], keys[b.index])), sort), counts = new Map();
    for (const row of sorted) {
      if (Object.hasOwn(diagnostics.options, "maxGap")) {
        const value = Object.hasOwn(diagnostics.options, "temporalUnit") ? normalizeTemporalValue(row.value, definition.options.orderField, row.index, diagnostics.options.temporalUnit) : row.value;
        if (!Number.isFinite(value)) throw new TypeError("Graph sequence gap requires numeric or explicit temporal order.");
        sequenceValues.set(row.index, value);
      }
      if (!includedSet.has(row.index)) continue;
      const group = groupingIdentity(groupFields.map(field => data.values[row.index][field])), position = counts.get(group) ?? 0;
      sequencePositions.set(row.index, position); counts.set(group, position + 1);
    }
    let expectedEdges = 0;
    for (const members of groups.values()) {
      members.sort((a, b) => sequencePositions.get(a) - sequencePositions.get(b));
      for (let i = 0; i + diagnostics.options.lag < members.length; i++) {
        if (Object.hasOwn(diagnostics.options, "maxGap")) {
          const from = sequenceValues.get(members[i]), to = sequenceValues.get(members[i + diagnostics.options.lag]);
          if (to - from > diagnostics.options.maxGap) continue;
        }
        expectedEdges++;
      }
    }
    equal(model.edges.length, expectedEdges, "sequence edge count");
  }
  model.edges.forEach(edge => {
    if (edge.sourceRows.length !== 2) throw new TypeError("Inferred edges require both endpoint source rows.");
    const [a, b] = edge.sourceRows;
    if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || !known.has(tokens[a]) || !known.has(tokens[b])) throw new TypeError("Inferred graph edge row is outside its source.");
    const identity = inferredGraphEdgeIdentity({ ruleId: definition.ruleId, directed: model.directed, sourceKey: keys[a], targetKey: keys[b] });
    for (const field of ["key", "sourceKey", "targetKey", "directed"]) equal(edge[field], identity[field], `edge ${field}`);
    if (prepared) {
      const pair = graphMetricPair(prepared.get(a), prepared.get(b), select(preparation, ["metric", "zeroVector"]));
      equal(edge.weight, definition.rule === "similarity" ? pair.similarity : pair.distance, "edge weight");
      if (definition.rule === "radius" && edge.weight > diagnostics.options.radius || definition.rule === "similarity" && edge.weight < diagnostics.options.threshold) throw new TypeError("Graph edge is outside its rule threshold.");
    } else if (structural) {
      equal(edge.weight, 1, "structural weight");
      const fields = definition.rule === "group" ? definition.options.fields : definition.options.groupBy ?? [];
      equal(groupingIdentity(fields.map(field => data.values[a][field])), groupingIdentity(fields.map(field => data.values[b][field])), "edge group");
      if (definition.rule === "group" && diagnostics.options.mode === "star" && a !== hubs.get(groupKeys[a]) && b !== hubs.get(groupKeys[a])) throw new TypeError("Graph star edges must connect to their explicit hub.");
      if (definition.rule === "sequence") {
        equal(sequencePositions.get(b) - sequencePositions.get(a), diagnostics.options.lag, "sequence lag");
        if (Object.hasOwn(diagnostics.options, "maxGap")) {
          if (sequenceValues.get(b) - sequenceValues.get(a) > diagnostics.options.maxGap) throw new TypeError("Graph sequence gap is invalid.");
        }
      }
    }
    else if (!candidatePairs.has(JSON.stringify([edge.sourceKey, edge.targetKey, edge.weight]))) throw new TypeError("Graph spanning edge does not belong to its candidate input.");
  });
  if (definition.rule === "mst") {
    equal(diagnostics.cost, stableFiniteSum(model.edges.map(edge => edge.weight), "Graph spanning cost"), "spanning cost");
    equal(diagnostics.candidateCount, candidateModel?.edges.length ?? (included.length < 2 ? 0 : included.length * (included.length - 1) / 2), "candidate count");
    const memberships = new Map();
    for (const [component, indices] of diagnostics.componentNodes.entries()) {
      ownArray(indices, "Graph spanning component rows");
      if (indices.length === 0) throw new TypeError("Graph spanning components cannot be empty.");
      for (const index of indices) {
        if (!includedSet.has(index) || memberships.has(index)) throw new TypeError("Graph spanning components must partition included rows.");
        memberships.set(index, component);
      }
    }
    if (memberships.size !== included.length || model.edges.some(edge => memberships.get(edge.sourceRows[0]) !== memberships.get(edge.sourceRows[1]))) throw new TypeError("Graph spanning component binding is stale.");
    const adjacency = new Map(model.adjacency.map(node => [node.key, node.neighbors]));
    for (const indices of diagnostics.componentNodes) {
      const visited = new Set(), pending = [tokens[indices[0]]];
      while (pending.length) {
        const key = pending.pop(); if (visited.has(key)) continue;
        visited.add(key); pending.push(...adjacency.get(key).filter(next => !visited.has(next)));
      }
      if (visited.size !== indices.length) throw new TypeError("Graph spanning component must be connected.");
    }
  }
  equal(resource.provenance.sourceRows, graphRowReferences(data, "node"), "row provenance");
}

export const inferredGraphResourceHandler = Object.freeze({ validateStored, validateBindings });
