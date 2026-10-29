import { cloneAndFreeze } from "../../../core/immutable.js";
import { resolveGraphPlot } from "../../graph/plot.js";
import { concreteProperties } from "../items/common.js";
import { memberRowReferences } from "../rows.js";
import { normalizeStrokeHighlightStyle } from "../styles.js";
import { transformPathHighlightProperties } from "../path.js";

function resolve(program, layer, sourceOnly) {
  const resolved = resolveGraphPlot(program, layer, program.markConfigs[layer.id]?.graphPlot);
  const graphic = program.graphicSpec.objects[layer.id];
  if (!sourceOnly && !Array.isArray(graphic?.items)) throw new Error("Graph selection requires materialized graphics.");
  const byIdentity = new Map((graphic?.items ?? []).map(child => [JSON.stringify([child.identity?.key, child.identity?.role]), child]));
  return resolved.items.map(item => {
    const children = sourceOnly ? undefined : item.graphicRoles.map(role => byIdentity.get(JSON.stringify([item.key, role])));
    if (children?.some(child => child === undefined)) throw new Error("Graph selection has stale concrete identity.");
    return cloneAndFreeze({ key: item.key, topology: item.topology, role: item.role, layer: layer.id, markType: "graph",
      fields: item.fields, channels: {}, properties: sourceOnly ? item.properties : concreteProperties(children[0].properties), members: item.members,
      rows: memberRowReferences(program, item.members, item.dataset.id, item.memberKeys), rowKeys: item.memberKeys,
      graphicRoles: item.graphicRoles, ...(sourceOnly ? {} : { graphicIds: children.map(child => child.id) }),
      lineage: item.lineage });
  });
}

function transformHighlightChild(child, style) {
  const { stroke, strokeWidth, ...shared } = style;
  const appearance = child.identity?.role === "label" ? shared : child.identity?.role === "arrow"
    ? { ...shared, fill: stroke } : { ...shared, stroke, ...(strokeWidth === undefined ? {} : { strokeWidth }) };
  return { ...child, properties: transformPathHighlightProperties(child.properties, appearance) };
}

export const graphSelectionPolicy = Object.freeze({
  resourceBacked: true, supportedGrains: Object.freeze(["item"]),
  resolveItems: (program, layer) => resolve(program, layer, false),
  resolveSourceItems: (program, layer) => resolve(program, layer, true),
  normalizeHighlightStyle: args => {
    for (const option of ["fontSize", "strokeDash"]) {
      if (args[option] !== undefined) throw new TypeError(`Graph highlight does not support ${option}.`);
    }
    return normalizeStrokeHighlightStyle(args, "Graph");
  }, transformHighlightChild,
  applyHighlightOp: "applyPathHighlight", rematerializeOp: "materializeGraphPlot"
});
