import { cloneAndFreeze } from "../../../core/immutable.js";
import { resolveContourPlot } from "../../contour/plot.js";
import { memberRowReferences } from "../rows.js";
import { concreteProperties } from "../items/common.js";
import { normalizeAreaHighlightStyle } from "../styles.js";

function items(program, layer, concrete) {
  const resolved = resolveContourPlot(program, layer, program.markConfigs[layer.id].contour);
  const graphics = program.graphicSpec.objects[layer.id]?.items;
  if (concrete && !Array.isArray(graphics)) throw new Error("Contour selection requires materialized paths.");
  const byIdentity = new Map((graphics ?? []).map(child => [JSON.stringify([child.identity?.key, child.identity?.role]), child]));
  return resolved.items.map(item => {
    const children = concrete ? item.graphicRoles.map(role => byIdentity.get(JSON.stringify([item.key, role]))) : [];
    if (children.some(child => child === undefined)) throw new Error("Contour selection has stale path identity.");
    return cloneAndFreeze({ key: item.key, topology: item.topology, role: item.role, layer: layer.id, markType: "contour",
      fields: item.fields, channels: { color: item.fields.value }, properties: concrete ? concreteProperties(children[0].properties) : item.properties,
      members: item.members, rows: resolved.dataset === undefined ? [] : memberRowReferences(program, item.members, resolved.dataset.id, item.memberKeys), rowKeys: item.memberKeys,
      graphicRoles: item.graphicRoles, ...(concrete ? { graphicIds: children.map(child => child.id) } : {}),
      lineage: { kind: "resource", resource: layer.contourBinding.geometry } });
  });
}
export const contourSelectionPolicy = Object.freeze({ resourceBacked: true, supportedGrains: Object.freeze(["item"]),
  resolveItems: (program, layer) => items(program, layer, true), resolveSourceItems: (program, layer) => items(program, layer, false),
  normalizeHighlightStyle: normalizeAreaHighlightStyle, applyHighlightOp: "applyPathHighlight", rematerializeOp: "materializeContourMark" });
