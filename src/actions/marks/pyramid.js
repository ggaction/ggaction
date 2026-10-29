import { closedAction } from "../../core/action.js";
import { findLayer, requireLayer } from "../../selectors/layers.js";
import { resolvePyramidPlot } from "../../materialization/pyramid/plot.js";
import { resolveMarkGraphicPlacement } from "../../materialization/graphicHierarchy.js";
import { rematerializeHighlightBaseline } from "./lifecycle.js";

export const applyPyramidMark = /* @__PURE__ */ closedAction(
  { op: "applyPyramidMark", description: "Apply validated Pyramid mark meaning and appearance." },
  ["id", "data", "coordinate", "binding", "config", "color"], function ({ id, data, coordinate, binding, config, color } = {}) {
    const previous = findLayer(this, id);
    let next = this.editSemantic({ property: `layer[${id}].mark.type`, value: "pyramid" })
      .editSemantic({ property: `layer[${id}].data`, value: data })
      .editSemantic({ property: `layer[${id}].coordinate`, value: coordinate })
      .editSemantic({ property: `layer[${id}].pyramid`, value: binding })
      ._withMarkConfig(id, { ...this.markConfigs[id], pyramidPlot: config });
    if (previous?.encoding?.color && color === false) next = next.editSemantic({ property: `layer[${id}].encoding.color`, remove: true });
    if (color !== undefined && color !== false) for (const [property, value] of Object.entries(color)) next = next.editSemantic({ property: `layer[${id}].encoding.color.${property}`, value });
    return next;
  });

export const materializePyramidPlot = /* @__PURE__ */ closedAction(
  { op: "materializePyramidPlot", description: "Materialize ordered Pyramid stages and their labels." }, ["id", "scales"], function ({ id, scales } = {}) {
    if (scales !== undefined && typeof scales !== "boolean") throw new TypeError("Pyramid scales must be boolean.");
    const layer = requireLayer(this, id);
    if (layer.mark.type !== "pyramid") throw new TypeError("Pyramid materialization requires a Pyramid mark.");
    const highlighted = rematerializeHighlightBaseline(this, { target: id, operation: "materializePyramidPlot", scales, resetProperty: "items", resetValue: [] });
    if (highlighted !== undefined) return highlighted;
    let next = this;
    if (scales !== false && layer.encoding?.color !== undefined) next = next.rematerializeScale({ id: layer.encoding.color.scale, marks: false, guides: false });
    const config = next.markConfigs[id].pyramidPlot, resolved = resolvePyramidPlot(next, layer, config);
    if (!next.graphicSpec.objects[id]) next = next.createGraphics({ id, type: "collection", ...resolveMarkGraphicPlacement(next, { markType: "pyramid" }) });
    next = next.editGraphics({ target: id, property: "items", value: resolved.graphics });
    if (config.clip || next.graphicSpec.objects[id].clip !== undefined) next = next.editGraphics({ target: id, property: "clip", value: config.clip ? resolved.frame : false });
    return next;
  });

