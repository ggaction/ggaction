import { cloneAndFreeze } from "../../../core/immutable.js";
import { resolvePyramidPlot } from "../../pyramid/plot.js";
import { memberRowReferences } from "../rows.js";
import { concreteProperties } from "../items/common.js";
import { normalizeAreaHighlightStyle } from "../styles.js";
import { transformLabeledPathHighlightChild } from "../path.js";

function items(program, layer, concrete) {
  const resolved = resolvePyramidPlot(program, layer, program.markConfigs[layer.id].pyramidPlot);
  const graphics = program.graphicSpec.objects[layer.id]?.items;
  if (concrete && !Array.isArray(graphics)) throw new Error("Pyramid selection requires materialized stages.");
  const byIdentity = new Map((graphics ?? []).map(child => [JSON.stringify([child.identity?.key, child.identity?.role]), child]));
  return resolved.items.map(item => {
    const children = concrete ? item.graphicRoles.map(role => byIdentity.get(JSON.stringify([item.key, role]))) : [];
    if (children.some(child => child === undefined)) throw new Error("Pyramid selection has stale stage identity.");
    return cloneAndFreeze({ key: item.key, topology: item.topology, role: "stage", layer: layer.id, markType: "pyramid",
      fields: item.fields, channels: item.channels, properties: { ...item.properties, ...(concrete ? concreteProperties(children[0].properties) : {}) },
      members: item.members, rows: memberRowReferences(program, item.members, resolved.dataset.id, item.memberKeys), rowKeys: item.memberKeys,
      graphicRoles: item.graphicRoles, ...(concrete ? { graphicIds: children.map(child => child.id) } : {}) });
  });
}
export const pyramidSelectionPolicy = Object.freeze({ supportedGrains: Object.freeze(["item"]),
  resolveItems: (program, layer) => items(program, layer, true), resolveSourceItems: (program, layer) => items(program, layer, false),
  normalizeHighlightStyle: normalizeAreaHighlightStyle, applyHighlightOp: "applyPathHighlight", rematerializeOp: "materializePyramidPlot",
  transformHighlightChild: transformLabeledPathHighlightChild });
