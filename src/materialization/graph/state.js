import { canonicalJSON } from "../../core/contentDigest.js";
import { encodeValue } from "../../core/valueEncoding.js";
import { encodeRowKey } from "../../core/itemIdentity.js";
import { ownRecord } from "../../core/ownData.js";
import { indexGraphModel } from "../../grammar/graph/model.js";
import { normalizeFlowBalance, summarizeFlow } from "../../grammar/flow/model.js";
import { resolveObservedGraphInput } from "../../grammar/graph/input.js";
import { graphSourceRows, graphSourceKey, graphAttributes, graphFieldValue } from "../../grammar/graph/fields.js";
import { resolveInputReference } from "../../selectors/resources.js";
import { graphOccurrenceKeys, graphRowReferences } from "./resources.js";

const same = (a, b) => canonicalJSON(encodeValue(a)) === canonicalJSON(encodeValue(b));
function exact(value, fields, label) {
  ownRecord(value, label);
  if (Object.keys(value).length !== fields.length || fields.some(field => !Object.hasOwn(value, field))) throw new TypeError(`${label} requires its exact stored fields.`);
}

function validateStored(resource) {
  if (resource.provenance.origin !== "observed" || !same(resource.ownership, { mode: "authored" })) throw new TypeError("Observed graph resources require authored ownership and observed provenance.");
  const flow = Object.hasOwn(resource.options, "flow");
  exact(resource.options, flow ? ["roles", "definition", "flow"] : ["roles", "definition"], "Graph options");
  exact(resource.options.roles, ["nodes", "edges"], "Observed graph roles");
  if (![1, 2].includes(resource.inputs.length) || resource.inputs.some(input => input.kind !== "data") ||
      resource.options.roles.nodes !== 0 || resource.options.roles.edges !== resource.inputs.length - 1) throw new TypeError("Observed graph inputs require canonical node and edge roles.");
  const definition = resource.options.definition;
  ownRecord(definition, "Graph definition");
  const normalized = resolveObservedGraphInput([], [], definition, Object.hasOwn(definition, "edgeKey") ? undefined : []).options;
  if (!same(normalized, definition)) throw new TypeError("Observed graph options must store all resolved defaults.");
  exact(resource.result, ["model", "diagnostics"], "Graph result");
  if (!flow && resource.result.diagnostics !== null) throw new TypeError("Observed graphs do not have inference diagnostics.");
  const model = resource.result.model;
  indexGraphModel(model, { maxNodes: definition.maxNodes, maxEdges: definition.maxEdges });
  if (model.directed !== definition.directed || model.selfLoops !== definition.selfLoops || model.edges.some(edge => edge.origin !== "observed")) throw new TypeError("Observed graph topology disagrees with its definition.");
  if (flow && (!same(normalizeFlowBalance(resource.options.flow), resource.options.flow) || !Object.hasOwn(definition, "weight") ||
      !same(resource.result.diagnostics, { flow: summarizeFlow(model, resource.options.flow) }))) throw new TypeError("Flow graph diagnostics or definition are stale.");
}

function validateBindings(program, resource) {
  const { definition, roles } = resource.options;
  const nodes = resolveInputReference(program, resource.inputs[roles.nodes]);
  const edges = resolveInputReference(program, resource.inputs[roles.edges]);
  graphSourceRows(nodes.values, definition.maxNodes, "Graph node rows");
  graphSourceRows(edges.values, definition.maxEdges, "Graph edge rows");
  const model = resource.result.model;
  if (model.nodes.length !== nodes.values.length || model.edges.length !== edges.values.length) throw new TypeError("Observed graph source membership is stale.");
  model.nodes.forEach((node, index) => {
    const row = nodes.values[index];
    if (node.key !== encodeRowKey(graphSourceKey(row, definition.nodeKey)) || !same(node.sourceRows, [index]) ||
        !same(node.attributes, graphAttributes(row, definition.attributes))) throw new TypeError("Observed graph node binding is stale.");
  });
  const occurrences = Object.hasOwn(definition, "edgeKey") ? undefined : graphOccurrenceKeys(edges);
  model.edges.forEach((edge, index) => {
    const row = edges.values[index];
    const key = occurrences === undefined ? encodeRowKey(graphSourceKey(row, definition.edgeKey)) : JSON.stringify(["observed-occurrence", occurrences[index]]);
    const weight = Object.hasOwn(definition, "weight") ? graphFieldValue(row, definition.weight, true) : 1;
    if (edge.key !== key || edge.sourceKey !== encodeRowKey(graphSourceKey(row, definition.source)) ||
        edge.targetKey !== encodeRowKey(graphSourceKey(row, definition.target)) || edge.weight !== weight || !same(edge.sourceRows, [index])) throw new TypeError("Observed graph edge binding is stale.");
  });
  const provenance = [...graphRowReferences(nodes, "node"), ...graphRowReferences(edges, "edge")];
  if (!same(resource.provenance.sourceRows, provenance)) throw new TypeError("Observed graph row provenance is stale.");
}

export const graphResourceHandler = Object.freeze({ validateStored, validateBindings });
