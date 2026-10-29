import { cloneAndFreeze } from "../../../core/immutable.js";
import { resolveOHLCPlot } from "../../ohlc/plot.js";
import { memberRowReferences } from "../rows.js";
import { normalizeAreaHighlightStyle } from "../styles.js";
import { transformLabeledPathHighlightChild, transformRuleHighlightProperties } from "../path.js";
function items(program, layer, concrete) {
  const resolved = resolveOHLCPlot(program, layer, program.markConfigs[layer.id].ohlcPlot);
  const graphics = program.graphicSpec.objects[layer.id]?.items;
  if (concrete && !Array.isArray(graphics)) throw new Error("OHLC selection requires materialized prices.");
  const byIdentity = new Map((graphics ?? []).map(child => [JSON.stringify([child.identity?.key, child.identity?.role]), child]));
  return resolved.items.map(item => {
    const children = concrete ? item.graphicRoles.map(role => byIdentity.get(JSON.stringify([item.key, role]))) : [];
    if (children.some(child => child === undefined)) throw new Error("OHLC selection has stale price identity.");
    return cloneAndFreeze({ key: item.key, topology: item.topology, role: "price", layer: layer.id, markType: "ohlc",
      fields: item.fields, channels: item.channels, properties: item.properties,
      members: item.members, rows: memberRowReferences(program, item.members, resolved.dataset.id, item.memberKeys), rowKeys: item.memberKeys,
      graphicRoles: item.graphicRoles, ...(concrete ? { graphicIds: children.map(child => child.id) } : {}) });
  });
}
export const ohlcSelectionPolicy = Object.freeze({ supportedGrains: Object.freeze(["item"]),
  resolveItems: (program, layer) => items(program, layer, true), resolveSourceItems: (program, layer) => items(program, layer, false),
  normalizeHighlightStyle: normalizeAreaHighlightStyle, applyHighlightOp: "applyPathHighlight", rematerializeOp: "materializeOHLCPlot",
  transformHighlightChild(child, style) {
    if (child.type !== "line") {
      const { fill, ...strokeStyle } = style;
      return transformLabeledPathHighlightChild(child, child.type === "path" && child.properties.fill === undefined ? strokeStyle : style);
    }
    const { fill, ...lineStyle } = style;
    return { ...child, properties: transformRuleHighlightProperties(child.properties, lineStyle) };
  } });
