import { cloneAndFreeze } from "../../../core/immutable.js";
import { resolveWaterfallPlot } from "../../waterfall/plot.js";
import { memberRowReferences } from "../rows.js";
import { normalizeAreaHighlightStyle } from "../styles.js";
import { transformLabeledPathHighlightChild } from "../path.js";
function items(program, layer, concrete) {
  const resolved = resolveWaterfallPlot(program, layer, program.markConfigs[layer.id].waterfallPlot);
  const graphics = program.graphicSpec.objects[layer.id]?.items;
  if (concrete && !Array.isArray(graphics)) throw new Error("Waterfall selection requires materialized stages.");
  const byIdentity = new Map((graphics ?? []).map(child => [JSON.stringify([child.identity?.key, child.identity?.role]), child]));
  return resolved.items.map(item => {
    const children = concrete ? item.graphicRoles.map(role => byIdentity.get(JSON.stringify([item.key, role]))) : [];
    if (children.some(child => child === undefined)) throw new Error("Waterfall selection has stale stage identity.");
    return cloneAndFreeze({ key: item.key, topology: item.topology, role: item.role, layer: layer.id, markType: "waterfall",
      fields: item.fields, channels: item.channels, properties: item.properties,
      members: item.members, rows: memberRowReferences(program, item.members, resolved.dataset.id, item.memberKeys), rowKeys: item.memberKeys,
      graphicRoles: item.graphicRoles, ...(concrete ? { graphicIds: children.map(child => child.id) } : {}) });
  });
}
export const waterfallSelectionPolicy = Object.freeze({ supportedGrains: Object.freeze(["item"]),
  resolveItems: (program, layer) => items(program, layer, true), resolveSourceItems: (program, layer) => items(program, layer, false),
  normalizeHighlightStyle: normalizeAreaHighlightStyle, applyHighlightOp: "applyPathHighlight", rematerializeOp: "materializeWaterfallPlot",
  transformHighlightChild(child, style) {
    const { fill, ...strokeStyle } = style;
    return transformLabeledPathHighlightChild(child, child.identity?.role === "connector" ? strokeStyle : style);
  } });
