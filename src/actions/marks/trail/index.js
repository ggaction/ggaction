import { closedAction } from "../../../core/action.js";
import { findLayer, requireLayer } from "../../../selectors/layers.js";
import { validateTrailBinding } from "../../../grammar/trailPlot.js";
import { resolveTrailPlot } from "../../../materialization/trail/plot.js";
import { resolveMarkGraphicPlacement } from "../../../materialization/graphicHierarchy.js";
import { rematerializeHighlightBaseline } from "../lifecycle.js";
import { getLayerScaleIds } from "../../../materialization/marks/index.js";

export const applyTrailMark = /* @__PURE__ */ closedAction({ op: "applyTrailMark", description: "Store validated Trail series meaning and appearance." }, ["layer", "config"], function ({ layer, config }) {
  validateTrailBinding(layer, config);
  let next = this.editSemantic({ property: `layer[${layer.id}].mark.type`, value: "trail" });
  const previous = findLayer(this, layer.id);
  if (layer.mark.blend !== undefined) next = next.editSemantic({ property: `layer[${layer.id}].mark.blend`, value: layer.mark.blend });
  else if (previous?.mark.blend !== undefined) next = next.editSemantic({ property: `layer[${layer.id}].mark.blend`, remove: true });
  for (const property of ["data", "coordinate", "trail"]) next = next.editSemantic({ property: `layer[${layer.id}].${property}`, value: layer[property] });
  for (const channel of Object.keys(previous?.encoding ?? {})) next = next.editSemantic({ property: `layer[${layer.id}].encoding.${channel}`, remove: true });
  for (const [channel, binding] of Object.entries(layer.encoding)) for (const [property, value] of Object.entries(binding)) next = next.editSemantic({ property: `layer[${layer.id}].encoding.${channel}.${property}`, value });
  return next._withMarkConfig(layer.id, { ...this.markConfigs[layer.id], trailPlot: config });
});
export const materializeTrailPlot = /* @__PURE__ */ closedAction({ op: "materializeTrailPlot", description: "Materialize variable-width ribbons from ordered Trail series." }, ["id", "scales"], function ({ id, scales } = {}) {
  if (scales !== undefined && typeof scales !== "boolean") throw new TypeError("Trail scales must be boolean.");
  const layer = requireLayer(this, id);
  if (layer.mark.type !== "trail") throw new TypeError("Trail materialization requires a Trail mark.");
  const highlighted = rematerializeHighlightBaseline(this, { target: id, operation: "materializeTrailPlot", scales, resetProperty: "items", resetValue: [] });
  if (highlighted !== undefined) return highlighted;
  let next = this;
  if (scales !== false) for (const scale of getLayerScaleIds(layer)) next = next.rematerializeScale({ id: scale, marks: false, guides: false });
  const config = next.markConfigs[id].trailPlot, resolved = resolveTrailPlot(next, layer, config);
  if (!next.graphicSpec.objects[id]) next = next.createGraphics({ id, type: "collection", ...resolveMarkGraphicPlacement(next, { markType: "trail" }) });
  next = next.editGraphics({ target: id, property: "items", value: resolved.graphics });
  if (config.clip || next.graphicSpec.objects[id].clip !== undefined) next = next.editGraphics({ target: id, property: "clip", value: config.clip ? resolved.frame : false });
  return next;
});
export function registerTrailMarkActions(ProgramClass) { Object.assign(ProgramClass.prototype, { applyTrailMark, materializeTrailPlot }); }
