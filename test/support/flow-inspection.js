import { chart } from "../../src/index.js";
import { getMarkItems } from "../../src/inspection.js";
import { exportAccessibleData } from "../../src/accessibility.js";

export const flowInspectionNodes = Object.freeze([
  Object.freeze({ id: 1, name: "Input" }),
  Object.freeze({ id: "1", name: "First" }),
  Object.freeze({ id: "end", name: "Second" })
]);
export const flowInspectionEdges = Object.freeze([
  Object.freeze({ id: "ab", s: 1, t: "1", amount: 3, note: "primary" }),
  Object.freeze({ id: "ac", s: 1, t: "end", amount: 1, note: "secondary" })
]);

export function createFlowInspection(method = "dag") {
  const edges = method === "cyclic" ? [...flowInspectionEdges,
    { id: "ba", s: "1", t: 1, amount: 2, note: "return" }] : flowInspectionEdges;
  return chart().createCanvas({ width: 240, height: 200, margin: 20 })
    .createData({ id: "nodes", values: flowInspectionNodes, keyField: "id" })
    .createData({ id: "edges", values: edges, keyField: "id" })
    .createFlowData({ id: "flow", nodes: "nodes", edges: "edges", nodeKey: "id", edgeKey: "id",
      source: "s", target: "t", value: "amount" })
    .layoutFlow({ id: "layout", method, options: { width: 100, height: 80, nodeWidth: 10, iterations: 0 } })
    .createFlowLinks({ links: { fill: "#2864dc" } })
    .createFlowNodes({ nodes: { fill: "#183542" }, labels: false });
}

// A host combines existing public inspection and accessibility by the actual hit key.
// Original rows and adjacency come from the immutable native state, never screen coordinates.
export function readFlowInspection(state) {
  const hit = state.hit?.target;
  if (!hit) return null;
  const program = state.program;
  const item = getMarkItems(program, { target: hit.ownerId }).find(item => item.key === hit.itemKey);
  const accessible = exportAccessibleData(program, { format: "items", target: hit.ownerId })
    .views[0].items.find(item => item.key === hit.itemKey);
  if (!item || !accessible) throw new Error("Flow hit has no matching native item.");
  const originalRows = item.rows.map(ref => {
    const data = program.semanticSpec.datasets.find(data => data.logicalId === ref.logicalDataId && data.revision === ref.revision);
    if (!data || data.rowKeys[ref.index] !== ref.rowKey) throw new Error("Flow source row is stale.");
    return data.values[ref.index];
  });
  const graph = program.semanticSpec.resources.find(resource => resource.id === "flow" && resource.kind === "graph");
  const model = graph.result.model;
  const nodeData = program.semanticSpec.datasets.find(data => data.id === graph.inputs[0].id);
  const edgeData = program.semanticSpec.datasets.find(data => data.id === graph.inputs[1].id);
  const rawNode = key => nodeData.values[model.nodes.find(node => node.key === key).sourceRows[0]].id;
  const rawEdge = key => edgeData.values[model.edges.find(edge => edge.key === key).sourceRows[0]].id;
  const record = (accessible.role === "node" ? model.nodes : model.edges)
    .find(record => record.sourceRows.includes(item.rows[0].index));
  const adjacency = accessible.role === "node" ? (() => {
    const entry = model.adjacency.find(entry => entry.key === record.key);
    return { incoming: entry.incoming.map(rawEdge), outgoing: entry.outgoing.map(rawEdge), neighbors: entry.neighbors.map(rawNode) };
  })() : { source: rawNode(record.sourceKey), target: rawNode(record.targetKey) };
  return { hit, item, accessible, originalRows, adjacency };
}

export function describeFlowInspection(value) {
  if (!value) return "";
  const { fields, role } = value.accessible;
  return role === "node"
    ? `${fields.name}: flow ${fields.value}; incoming ${fields.incoming}; outgoing ${fields.outgoing}; neighbors ${JSON.stringify(value.adjacency.neighbors)}.`
    : `${fields.id}: ${JSON.stringify(fields.source)} to ${JSON.stringify(fields.target)}; flow ${fields.value}.`;
}
