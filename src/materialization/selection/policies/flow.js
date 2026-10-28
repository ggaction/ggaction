import { cloneAndFreeze } from "../../../core/immutable.js";
import { resolveFlowPlot } from "../../flow/plot.js";
import { memberRowReferences } from "../rows.js";
import { concreteProperties } from "../items/common.js";
import { normalizeAreaHighlightStyle } from "../styles.js";

function items(program, layer, concrete) {
  const resolved = resolveFlowPlot(program, layer, program.markConfigs[layer.id]?.flowPlot);
  const graphics = program.graphicSpec.objects[layer.id]?.items;
  if (concrete && !Array.isArray(graphics)) throw new Error("Flow selection requires materialized graphics.");
  const byIdentity = new Map((graphics ?? []).map(child => [JSON.stringify([child.identity?.key, child.identity?.role]), child]));
  return resolved.items.map(item => {
    const children = concrete ? item.graphicRoles.map(role => byIdentity.get(JSON.stringify([item.key, role]))) : [];
    if (children.some(child => child === undefined)) throw new Error("Flow selection has stale concrete identity.");
    return cloneAndFreeze({ key: item.key, topology: item.topology, role: item.role, layer: layer.id, markType: layer.mark.type,
      fields: item.fields, channels: {}, properties: concrete ? concreteProperties(children[0].properties) : item.properties,
      members: item.members, rows: memberRowReferences(program, item.members, resolved.dataset.id, item.memberKeys), rowKeys: item.memberKeys,
      graphicRoles: item.graphicRoles, ...(concrete ? { graphicIds: children.map(child => child.id) } : {}),
      lineage: { kind: "resource", resource: layer.flowBinding.layout } });
  });
}
const policy = Object.freeze({ resourceBacked: true, supportedGrains: Object.freeze(["item"]),
  resolveItems: (program, layer) => items(program, layer, true), resolveSourceItems: (program, layer) => items(program, layer, false),
  normalizeHighlightStyle: normalizeAreaHighlightStyle, applyHighlightOp: "applyPathHighlight" });
export const flowNodeSelectionPolicy = Object.freeze({ ...policy, rematerializeOp: "materializeFlowNodes" });
export const flowLinkSelectionPolicy = Object.freeze({ ...policy, rematerializeOp: "materializeFlowLinks" });
