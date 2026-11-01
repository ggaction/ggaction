import { graphSourceKey } from "../../grammar/graph/fields.js";
import { resolveInputReference } from "../../selectors/resources.js";

export function graphNodeSourceKeys(dataset, model, definition) {
  return new Map(model.nodes.map(node => [node.key, graphSourceKey(dataset.values[node.sourceRows[0]], definition.nodeKey)]));
}

export function graphEdgeFields(graph, edge, rawKeys) {
  const inference = graph.provenance.origin === "inferred" ? { rule: graph.options.definition.rule,
    ruleId: graph.options.definition.ruleId, metric: graph.options.definition.metric ?? null } : {};
  return { ...inference, kind: "edge", key: edge.key, sourceKey: rawKeys.get(edge.sourceKey), targetKey: rawKeys.get(edge.targetKey),
    weight: edge.weight, origin: edge.origin, directed: edge.directed, ruleId: edge.ruleId };
}

// Retain the native graph edge grain without inferring any source table or
// decoding private typed keys. Inferred edges reference their endpoint rows.
export function graphEdgeSourceItems(program, graph) {
  const nodes = resolveInputReference(program, graph.inputs[graph.options.roles.nodes]);
  const observed = graph.provenance.origin === "observed";
  const dataset = observed ? resolveInputReference(program, graph.inputs[graph.options.roles.edges]) : nodes;
  const rawKeys = graphNodeSourceKeys(nodes, graph.result.model, graph.options.definition);
  return graph.result.model.edges.map(edge => ({ key: edge.key, fields: graphEdgeFields(graph, edge, rawKeys),
    rows: edge.sourceRows.map(index => ({ data: dataset.id, logicalDataId: dataset.logicalId, revision: dataset.revision,
      rowKey: dataset.rowKeys[index], role: observed ? "edge" : "node", index })) }));
}
