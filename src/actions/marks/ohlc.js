import { closedAction } from "../../core/action.js";
import { findLayer, requireLayer } from "../../selectors/layers.js";
import { resolveOHLCPlot } from "../../materialization/ohlc/plot.js";
import { resolveMarkGraphicPlacement } from "../../materialization/graphicHierarchy.js";
import { rematerializeHighlightBaseline } from "./lifecycle.js";

export const applyOHLCMark = /* @__PURE__ */ closedAction(
  { op: "applyOHLCMark", description: "Apply validated OHLC mark meaning and appearance." },
  ["id", "data", "coordinate", "binding", "config", "encoding"], function ({ id, data, coordinate, binding, config, encoding } = {}) {
    const previous = findLayer(this, id);
    let next = this.editSemantic({ property: `layer[${id}].mark.type`, value: "ohlc" })
      .editSemantic({ property: `layer[${id}].data`, value: data })
      .editSemantic({ property: `layer[${id}].coordinate`, value: coordinate })
      .editSemantic({ property: `layer[${id}].ohlc`, value: binding })
      ._withMarkConfig(id, { ...this.markConfigs[id], ohlcPlot: config });
    for (const channel of Object.keys(previous?.encoding ?? {})) if (!encoding[channel]) next = next.editSemantic({ property: `layer[${id}].encoding.${channel}`, remove: true });
    for (const [channel, entry] of Object.entries(encoding)) {
      if (previous?.encoding[channel]?.temporalUnit && !entry.temporalUnit) next = next.editSemantic({ property: `layer[${id}].encoding.${channel}.temporalUnit`, remove: true });
      for (const [property, value] of Object.entries(entry)) next = next.editSemantic({ property: `layer[${id}].encoding.${channel}.${property}`, value });
    }
    return next;
  });

export const materializeOHLCPlot = /* @__PURE__ */ closedAction(
  { op: "materializeOHLCPlot", description: "Materialize row-owned price stems, bodies and labels." }, ["id", "scales"], function ({ id, scales } = {}) {
    if (scales !== undefined && typeof scales !== "boolean") throw new TypeError("OHLC scales must be boolean.");
    const layer = requireLayer(this, id);
    if (layer.mark.type !== "ohlc") throw new TypeError("OHLC materialization requires an OHLC mark.");
    const highlighted = rematerializeHighlightBaseline(this, { target: id, operation: "materializeOHLCPlot", scales, resetProperty: "items", resetValue: [] });
    if (highlighted !== undefined) return highlighted;
    let next = this;
    if (scales !== false) for (const scale of new Set(Object.values(layer.encoding).map(entry => entry.scale))) next = next.rematerializeScale({ id: scale, marks: false, guides: false });
    const config = next.markConfigs[id].ohlcPlot, resolved = resolveOHLCPlot(next, layer, config);
    if (!next.graphicSpec.objects[id]) next = next.createGraphics({ id, type: "collection", ...resolveMarkGraphicPlacement(next, { markType: "ohlc" }) });
    next = next.editGraphics({ target: id, property: "items", value: resolved.graphics });
    if (config.clip || next.graphicSpec.objects[id].clip !== undefined) next = next.editGraphics({ target: id, property: "clip", value: config.clip ? resolved.frame : false });
    return next;
  });

