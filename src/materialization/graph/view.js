import { resolveItemSelection } from "../selection/itemSelection.js";
import { concreteProperties } from "../selection/items/common.js";
import { memberRowReferences } from "../selection/rows.js";
import { validateWorkLimit } from "../../core/validation.js";

export function applyGraphView(program, resolved, view) {
  if (view === undefined) return resolved;
  const { items, graphics, graph } = resolved;
  validateWorkLimit(items.length * view.selectors.length, "Graph view selection work");
  const needsRows = view.selectors.some(selector => selector.rows !== undefined);
  let nodes = items.filter(item => item.role === "node").map(item => ({
    ...item, channels: {}, properties: concreteProperties(graphics[item.graphicIndices[0]].properties),
    rows: needsRows ? memberRowReferences(program, item.members, item.dataset.id, item.memberKeys) : []
  }));
  for (const selector of view.selectors) {
    const selected = new Set(resolveItemSelection(program, nodes, selector).keys);
    nodes = nodes.filter(item => selected.has(item.key));
  }
  const retainedItems = new Set(nodes.map(item => item.key));
  const nodeItems = items.filter(item => item.role === "node");
  const retainedNodes = new Set(graph.result.model.nodes.filter((_, index) => retainedItems.has(nodeItems[index].key)).map(node => node.key));
  const edges = items.filter(item => item.role === "edge");
  graph.result.model.edges.forEach((edge, index) => {
    if (retainedNodes.has(edge.sourceKey) && retainedNodes.has(edge.targetKey)) retainedItems.add(edges[index].key);
  });
  const selectedItems = items.filter(item => retainedItems.has(item.key));
  const indices = new Set(selectedItems.flatMap(item => item.graphicIndices));
  const remap = new Map();
  const selectedGraphics = graphics.filter((_, index) => {
    if (!indices.has(index)) return false;
    remap.set(index, remap.size); return true;
  });
  return { ...resolved, graphics: selectedGraphics,
    items: selectedItems.map(item => ({ ...item, graphicIndices: item.graphicIndices.map(index => remap.get(index)) })) };
}
