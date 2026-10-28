import { cloneAndFreeze } from "../../../core/immutable.js";
import { resolveHierarchyPlot } from "../../hierarchy/plot.js";
import { concreteProperties } from "../items/common.js";
import { memberRowReferences } from "../rows.js";
import { normalizeAreaHighlightStyle } from "../styles.js";
import { transformLabeledPathHighlightChild } from "../path.js";

function sourceItems(program, layer) {
  const resolved = resolveHierarchyPlot(program, layer, program.markConfigs[layer.id]?.hierarchyPlot);
  return resolved.items.map(item => ({ ...item, topology: "", role: "node", layer: layer.id, markType: layer.mark.type, channels: {},
    rows: memberRowReferences(program, item.members, resolved.dataset.id, item.memberKeys), rowKeys: item.memberKeys,
    lineage: { kind: "resource", resource: layer.hierarchyBinding.layout } }));
}

function resolveItems(program, layer) {
  const config = program.markConfigs[layer.id]?.hierarchyPlot;
  const resolved = resolveHierarchyPlot(program, layer, config);
  const graphic = program.graphicSpec.objects[layer.id];
  if (!Array.isArray(graphic?.items)) throw new Error("Hierarchy selection requires materialized graphics.");
  const byIdentity = new Map(graphic.items.map(child => [JSON.stringify([child.identity?.key, child.identity?.role]), child]));
  return resolved.items.map(item => {
    const children = item.graphicRoles.map(role => byIdentity.get(JSON.stringify([item.key, role])));
    if (children.some(child => child === undefined)) throw new Error("Hierarchy selection has stale concrete identity.");
    return cloneAndFreeze({ key: item.key, topology: "", role: "node", layer: layer.id, markType: layer.mark.type,
      fields: item.fields, channels: {}, properties: concreteProperties(children[0].properties), members: item.members,
      rows: memberRowReferences(program, item.members, resolved.dataset.id, item.memberKeys), rowKeys: item.memberKeys,
      graphicRoles: item.graphicRoles, graphicIds: children.map(child => child.id),
      lineage: { kind: "resource", resource: layer.hierarchyBinding.layout } });
  });
}
export const hierarchySelectionPolicy = Object.freeze({
  resourceBacked: true, supportedGrains: Object.freeze(["item"]), resolveItems, resolveSourceItems: sourceItems,
  normalizeHighlightStyle: normalizeAreaHighlightStyle,
  transformHighlightChild: transformLabeledPathHighlightChild,
  applyHighlightOp: "applyPathHighlight"
});
export const treeSelectionPolicy = Object.freeze({ ...hierarchySelectionPolicy, rematerializeOp: "materializeTreePlot" });
export const treemapSelectionPolicy = Object.freeze({ ...hierarchySelectionPolicy, rematerializeOp: "materializeTreemapPlot" });
