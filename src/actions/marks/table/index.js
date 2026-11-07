import { closedAction } from "../../../core/action.js";
import { findLayer, requireLayer } from "../../../selectors/layers.js";
import { validateTableBinding } from "../../../grammar/tablePlot.js";
import { resolveTablePlot } from "../../../materialization/table/plot.js";
import { resolveMarkGraphicPlacement } from "../../../materialization/graphicHierarchy.js";
import { rematerializeHighlightBaseline } from "../lifecycle.js";

export const applyTableMark = /* @__PURE__ */ closedAction({ op: "applyTableMark", description: "Store keyed Table column meanings and cell appearance." }, ["layer", "config"], function ({ layer, config }) {
  validateTableBinding(layer, config);
  let next = this.editSemantic({ property: `layer[${layer.id}].mark.type`, value: "table" });
  const previous = findLayer(this, layer.id);
  for (const property of ["data", "coordinate", "table"]) next = next.editSemantic({ property: `layer[${layer.id}].${property}`, value: layer[property] });
  for (const channel of Object.keys(previous?.encoding ?? {})) next = next.editSemantic({ property: `layer[${layer.id}].encoding.${channel}`, remove: true });
  for (const [channel, binding] of Object.entries(layer.encoding)) for (const [property, value] of Object.entries(binding)) next = next.editSemantic({ property: `layer[${layer.id}].encoding.${channel}.${property}`, value });
  return next._withMarkConfig(layer.id, { ...this.markConfigs[layer.id], tablePlot: config });
});
export const materializeTablePlot = /* @__PURE__ */ closedAction({ op: "materializeTablePlot", description: "Materialize keyed Table cells, footers and inline charts." }, ["id", "scales"], function ({ id, scales } = {}) {
  if (scales !== undefined && typeof scales !== "boolean") throw new TypeError("Table scales must be boolean.");
  const layer = requireLayer(this, id);
  if (layer.mark.type !== "table") throw new TypeError("Table materialization requires a Table mark.");
  const highlighted = rematerializeHighlightBaseline(this, { target: id, operation: "materializeTablePlot", scales, resetProperty: "items", resetValue: [] });
  if (highlighted !== undefined) return highlighted;
  let next = this;
  if (scales !== false && layer.encoding?.color) next = next.rematerializeScale({ id: layer.encoding.color.scale, marks: false, guides: false });
  const config = next.markConfigs[id].tablePlot, resolved = resolveTablePlot(next, layer, config);
  if (!next.graphicSpec.objects[id]) next = next.createGraphics({ id, type: "collection", ...resolveMarkGraphicPlacement(next, { markType: "table" }) });
  const retained = new Set(resolved.groups.map(group => group.id));
  for (const child of next.graphicSpec.objects[id].children ?? []) if (!retained.has(child)) next = next.editGraphics({ target: child, remove: true });
  next = next.editGraphics({ target: id, property: "items", value: resolved.note });
  for (const group of resolved.groups) {
    if (!next.graphicSpec.objects[group.id]) next = next.createGraphics({ id: group.id, type: "collection", parent: id });
    next = next.editGraphics({ target: group.id, property: "items", value: group.items })
      .editGraphics({ target: group.id, property: "clip", value: group.clip });
  }
  if (resolved.groups.length) next = next.editGraphics({ target: id, property: "children", value: resolved.groups.map(group => group.id) });
  if (config.clip || next.graphicSpec.objects[id].clip !== undefined) next = next.editGraphics({ target: id, property: "clip", value: config.clip ? resolved.frame : false });
  return next;
});
export function registerTableMarkActions(ProgramClass) { Object.assign(ProgramClass.prototype, { applyTableMark, materializeTablePlot }); }
