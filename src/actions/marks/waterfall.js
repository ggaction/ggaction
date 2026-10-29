import { closedAction } from "../../core/action.js";
import { findLayer, requireLayer } from "../../selectors/layers.js";
import { resolveWaterfallPlot } from "../../materialization/waterfall/plot.js";
import { resolveMarkGraphicPlacement } from "../../materialization/graphicHierarchy.js";
import { rematerializeHighlightBaseline } from "./lifecycle.js";

export const applyWaterfallMark = /* @__PURE__ */ closedAction(
  { op: "applyWaterfallMark", description: "Apply validated Waterfall mark meaning and appearance." },
  ["id", "data", "coordinate", "binding", "config", "encoding"], function ({ id, data, coordinate, binding, config, encoding } = {}) {
    const previous = findLayer(this, id);
    let next = this.editSemantic({ property: `layer[${id}].mark.type`, value: "waterfall" })
      .editSemantic({ property: `layer[${id}].data`, value: data })
      .editSemantic({ property: `layer[${id}].coordinate`, value: coordinate })
      .editSemantic({ property: `layer[${id}].waterfall`, value: binding })
      ._withMarkConfig(id, { ...this.markConfigs[id], waterfallPlot: config });
    for (const channel of Object.keys(previous?.encoding ?? {})) if (!encoding[channel]) next = next.editSemantic({ property: `layer[${id}].encoding.${channel}`, remove: true });
    for (const [channel, entry] of Object.entries(encoding)) {
      for (const [property, value] of Object.entries(entry)) next = next.editSemantic({ property: `layer[${id}].encoding.${channel}.${property}`, value });
    }
    return next;
  });

export const materializeWaterfallPlot = /* @__PURE__ */ closedAction(
  { op: "materializeWaterfallPlot", description: "Materialize ordered contribution bars, connectors and labels." }, ["id", "scales"], function ({ id, scales } = {}) {
    if (scales !== undefined && typeof scales !== "boolean") throw new TypeError("Waterfall scales must be boolean.");
    const layer = requireLayer(this, id);
    if (layer.mark.type !== "waterfall") throw new TypeError("Waterfall materialization requires an Waterfall mark.");
    const highlighted = rematerializeHighlightBaseline(this, { target: id, operation: "materializeWaterfallPlot", scales, resetProperty: "items", resetValue: [] });
    if (highlighted !== undefined) return highlighted;
    let next = this;
    if (scales !== false) for (const scale of new Set(Object.values(layer.encoding).map(entry => entry.scale))) next = next.rematerializeScale({ id: scale, marks: false, guides: false });
    const config = next.markConfigs[id].waterfallPlot, resolved = resolveWaterfallPlot(next, layer, config);
    if (!next.graphicSpec.objects[id]) next = next.createGraphics({ id, type: "collection", ...resolveMarkGraphicPlacement(next, { markType: "waterfall" }) });
    next = next.editGraphics({ target: id, property: "items", value: resolved.graphics });
    if (config.clip || next.graphicSpec.objects[id].clip !== undefined) next = next.editGraphics({ target: id, property: "clip", value: config.clip ? resolved.frame : false });
    return next;
  });

