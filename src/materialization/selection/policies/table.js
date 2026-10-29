import { cloneAndFreeze } from "../../../core/immutable.js";
import { resolveTablePlot } from "../../table/plot.js";
import { memberRowReferences } from "../rows.js";
import { concreteProperties } from "../items/common.js";
import { normalizeAreaHighlightStyle } from "../styles.js";
import { transformLabeledPathHighlightChild } from "../path.js";

function items(program, layer, concrete) {
  const resolved = resolveTablePlot(program, layer, program.markConfigs[layer.id].tablePlot);
  const root = program.graphicSpec.objects[layer.id];
  const graphics = root === undefined ? undefined : (root.children ?? []).flatMap(id => program.graphicSpec.objects[id].items);
  if (concrete && !Array.isArray(graphics)) throw new Error("Table selection requires materialized cells.");
  const byIdentity = new Map((graphics ?? []).map(child => [JSON.stringify([child.identity?.key, child.identity?.role]), child]));
  return resolved.items.map(item => {
    const children = concrete ? item.graphicRoles.map(role => byIdentity.get(JSON.stringify([item.key, role]))) : [];
    if (children.some(child => child === undefined)) throw new Error("Table selection has stale cell identity.");
    return cloneAndFreeze({ key: item.key, topology: item.topology, role: item.role, layer: layer.id, markType: "table",
      fields: item.fields, channels: item.channels, properties: { ...item.properties, ...(concrete ? concreteProperties(children[0].properties) : {}) },
      members: item.members, rows: memberRowReferences(program, item.members, resolved.dataset.id, item.memberKeys), rowKeys: item.memberKeys,
      graphicRoles: item.graphicRoles, ...(concrete ? { graphicIds: children.map(child => child.id) } : {}) });
  });
}
export const tableSelectionPolicy = Object.freeze({ supportedGrains: Object.freeze(["item"]),
  resolveItems: (program, layer) => items(program, layer, true), resolveSourceItems: (program, layer) => items(program, layer, false),
  normalizeHighlightStyle: normalizeAreaHighlightStyle, applyHighlightOp: "applyPathHighlight", rematerializeOp: "materializeTablePlot",
  transformHighlightChild: transformLabeledPathHighlightChild });
