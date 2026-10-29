import { cloneAndFreeze } from "../../../core/immutable.js";
import { resolveCalendarPlot } from "../../calendar/plot.js";
import { memberRowReferences } from "../rows.js";
import { concreteProperties } from "../items/common.js";
import { normalizeAreaHighlightStyle } from "../styles.js";

function items(program, layer, concrete) {
  const resolved = resolveCalendarPlot(program, layer, program.markConfigs[layer.id].calendarPlot);
  const graphics = program.graphicSpec.objects[layer.id]?.items;
  if (concrete && !Array.isArray(graphics)) throw new Error("Calendar selection requires materialized cells.");
  const byIdentity = new Map((graphics ?? []).map(child => [JSON.stringify([child.identity?.key, child.identity?.role]), child]));
  return resolved.items.map(item => {
    const child = concrete ? byIdentity.get(JSON.stringify([item.key, "body"])) : undefined;
    if (concrete && child === undefined) throw new Error("Calendar selection has stale cell identity.");
    return cloneAndFreeze({ key: item.key, topology: item.topology, role: item.role, layer: layer.id, markType: "calendar", fields: item.fields,
      channels: { color: item.fields.value }, properties: concrete ? concreteProperties(child.properties) : item.properties,
      members: item.members, rows: memberRowReferences(program, item.members, resolved.dataset.id, item.memberKeys), rowKeys: item.memberKeys,
      graphicRoles: item.graphicRoles, ...(concrete ? { graphicIds: [child.id] } : {}), lineage: { kind: "resource", resource: layer.calendarBinding.layout } });
  });
}
export const calendarSelectionPolicy = Object.freeze({ resourceBacked: true, supportedGrains: Object.freeze(["item"]),
  resolveItems: (program, layer) => items(program, layer, true), resolveSourceItems: (program, layer) => items(program, layer, false),
  normalizeHighlightStyle: normalizeAreaHighlightStyle, applyHighlightOp: "applyPathHighlight", rematerializeOp: "materializeCalendarPlot" });
