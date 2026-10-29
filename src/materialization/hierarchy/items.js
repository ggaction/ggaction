export function hierarchyNodeItemKey(layer, hierarchy, node) {
  return JSON.stringify([[], layer.id, "node", [hierarchy.id, node.key]]);
}
