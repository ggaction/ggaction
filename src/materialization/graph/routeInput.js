import { cloneAndFreeze } from "../../core/immutable.js";
import { compareRowKeys, encodeRowKey } from "../../core/itemIdentity.js";
import { validateWorkLimit } from "../../core/validation.js";
import { GRAPH_LAYOUT_METHODS } from "../../core/vocabulary.js";
import { graphSourceKey } from "../../grammar/graph/fields.js";
import { normalizeRouteIntent } from "../../grammar/graph/routes/options.js";
import { resolveInputReference } from "../../selectors/resources.js";

function ranks(keys) {
  validateWorkLimit(keys.length * Math.ceil(Math.log2(Math.max(2, keys.length))) * 4, "Route key ordering");
  const order = keys.map((_, index) => index).sort((a, b) => compareRowKeys(keys[a], keys[b]));
  const result = new Array(keys.length);
  order.forEach((index, rank) => { result[index] = rank; });
  return result;
}
const reference = resource => ({ kind: resource.kind, id: resource.id, revision: resource.revision });
const matches = (ref, resource) => ref?.kind === resource.kind && ref.id === resource.id && ref.revision === resource.revision;

// Typed source order is lowered to numeric ranks without decoding opaque graph
// keys. The worker receives only the model and these equivalent sort ranks.
export function resolveRouteInput(program, graph, layout, intent, hierarchy, hierarchyLayout) {
  const normalized = normalizeRouteIntent(intent.method, intent.options, intent.coordinateSpace);
  if (graph.kind !== "graph" || layout.kind !== "layout" || layout.inputs.length !== 1 ||
      !matches(layout.inputs[0], graph) || !GRAPH_LAYOUT_METHODS.includes(layout.options.method)) throw new TypeError("Routes require an exact graph and its fixed, circular or force layout.");
  const model = graph.result.model, definition = graph.options.definition;
  const nodes = resolveInputReference(program, graph.inputs[graph.options.roles.nodes]);
  const nodeKeys = model.nodes.map(node => graphSourceKey(nodes.values[node.sourceRows[0]], definition.nodeKey));
  const nodeRanks = ranks(nodeKeys), byKey = new Map(model.nodes.map((node, index) => [node.key, nodeRanks[index]]));
  let edgeKeys;
  if (graph.provenance.origin === "observed") {
    const edges = resolveInputReference(program, graph.inputs[graph.options.roles.edges]);
    edgeKeys = model.edges.map(edge => Object.hasOwn(definition, "edgeKey")
      ? graphSourceKey(edges.values[edge.sourceRows[0]], definition.edgeKey)
      : [edges.logicalId, edges.rowKeys[edge.sourceRows[0]]]);
  } else {
    edgeKeys = model.edges.map(edge => [edge.ruleId, edge.directed, byKey.get(edge.sourceKey), byKey.get(edge.targetKey)]);
  }
  const input = { model, positions: layout.result.nodes, order: { nodes: nodeRanks, edges: ranks(edgeKeys) }, limits: normalized.options.limits };
  const inputs = [reference(graph), reference(layout)];
  let hierarchyInput;
  if (normalized.method === "hierarchical") {
    if (hierarchy?.kind !== "hierarchy" || hierarchyLayout?.kind !== "layout" || hierarchyLayout.inputs.length !== 1 ||
        !matches(hierarchyLayout.inputs[0], hierarchy) || !["tree", "treemap"].includes(hierarchyLayout.options.method)) throw new TypeError("Hierarchical routes require an exact hierarchy and tree or treemap anchors.");
    inputs.push(reference(hierarchy), reference(hierarchyLayout));
    hierarchyInput = { model: hierarchy.result,
      mapping: normalized.options.mapping.map(({ nodeKey, hierarchyKey }) => ({ nodeKey: encodeRowKey(nodeKey), hierarchyKey: encodeRowKey(hierarchyKey) })),
      positions: hierarchyLayout.result.nodes.map(node => hierarchyLayout.options.method === "tree"
        ? { key: node.key, x: node.x, y: node.y }
        : { key: node.key, x: node.rect.x0 / 2 + node.rect.x1 / 2, y: node.rect.y0 / 2 + node.rect.y1 / 2 }) };
  } else if (hierarchy !== undefined || hierarchyLayout !== undefined) throw new TypeError("Only hierarchical routes use hierarchy inputs.");
  return cloneAndFreeze({ inputs, intent: normalized, input, ...(hierarchyInput === undefined ? {} : { hierarchy: hierarchyInput }) });
}
