import { filterGraphPlotView, restoreGraphPlotView } from "../data/graphFilter.js";
import { closedAction } from "../../core/action.js";
import { normalizeGraphPlot, validateGraphPlotDefinition } from "../../grammar/graph/plot.js";
import { resolveGraphPlotLayout } from "../../selectors/graphs.js";
import { requireLayer, resolveEligibleLayer } from "../../selectors/layers.js";
import { resolveInputReference } from "../../selectors/resources.js";
import { assertMarkAvailable, resolveMarkId } from "../marks/shared.js";
import { resolveGraphPlot } from "../../materialization/graph/plot.js";
import { resolveMarkGraphicPlacement } from "../../materialization/graphicHierarchy.js";
import { rematerializeHighlightBaseline } from "../marks/lifecycle.js";

export const materializeGraphPlot = /* @__PURE__ */ closedAction(
  { op: "materializeGraphPlot", description: "Materialize stored graph nodes and edge routes." }, ["id"], function ({ id } = {}) {
    const layer = requireLayer(this, id), config = this.markConfigs[id]?.graphPlot;
    if (layer.mark.type !== "graph" || config === undefined) throw new TypeError("Materialization requires a configured graph plot.");
    const highlighted = rematerializeHighlightBaseline(this, { target: id, operation: "materializeGraphPlot", resetProperty: "items", resetValue: [] });
    if (highlighted !== undefined) return highlighted;
    validateGraphPlotDefinition(config, layer.graphLabels);
    const resolved = resolveGraphPlot(this, layer, config);
    let next = this;
    if (!next.graphicSpec.objects[id]) next = next.createGraphics({ id, type: "collection", ...resolveMarkGraphicPlacement(next, { markType: "graph" }) });
    next = next.editGraphics({ target: id, property: "items", value: resolved.graphics });
    if (config.clip || next.graphicSpec.objects[id].clip !== undefined) next = next.editGraphics({ target: id, property: "clip", value: config.clip ? resolved.frame : false });
    return next;
  });

function facade(editing) {
  const op = editing ? "editGraphPlot" : "createGraphPlot", styleOptions = ["origin", "clip", "nodes", "edges", "labels"];
  return closedAction({ op, description: `${editing ? "Edit" : "Create"} a resource-backed graph plot.` },
    [editing ? "target" : "id", "layout", ...styleOptions], function (args = {}) {
      if (Object.values(args).some(value => value === null || value === undefined)) throw new TypeError("Graph plot arguments cannot contain null or undefined.");
      if (editing && !Object.keys(args).some(key => key !== "target")) throw new TypeError("Graph plot edits require a nonempty patch.");
      const previous = editing ? resolveEligibleLayer(this, { target: args.target, predicate: layer => layer.mark.type === "graph", label: op }) : undefined;
      const id = previous?.id ?? resolveMarkId(this, args.id, { defaultId: "graphPlot", label: "Graph plot id", markType: "graph", operation: op });
      if (!editing) assertMarkAvailable(this, id);
      const layout = resolveGraphPlotLayout(this, args.layout ?? previous?.graphBinding.layout.id), graph = resolveInputReference(this, layout.inputs[0]);
      const normalized = normalizeGraphPlot(Object.fromEntries(styleOptions.filter(key => Object.hasOwn(args, key)).map(key => [key, args[key]])), graph,
        previous === undefined ? undefined : this.markConfigs[id].graphPlot, previous?.graphLabels);
      const layer = { ...previous, id, mark: { type: "graph" }, graphBinding: { layout: { kind: "layout", id: layout.id, revision: layout.revision } }, graphLabels: normalized.labels };
      resolveGraphPlot(this, layer, normalized.config);
      return this.editSemantic({ property: `layer[${id}].mark.type`, value: "graph" })
        .editSemantic({ property: `layer[${id}].graphBinding`, value: layer.graphBinding })
        .editSemantic({ property: `layer[${id}].graphLabels`, value: layer.graphLabels })
        ._withMarkConfig(id, { graphPlot: normalized.config }).materializeGraphPlot({ id });
    });
}
export const createGraphPlot = /* @__PURE__ */ facade(false);
export const editGraphPlot = /* @__PURE__ */ facade(true);
export function registerGraphPlotActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, { createGraphPlot, editGraphPlot, materializeGraphPlot, filterGraphPlotView, restoreGraphPlotView });
}
