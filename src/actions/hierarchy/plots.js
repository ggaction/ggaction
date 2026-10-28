import { createPartitionPlot, editPartitionPlot } from "./partition.js";
import { closedAction } from "../../core/action.js";
import { normalizeHierarchyPlot, validateHierarchyPlotDefinition } from "../../grammar/hierarchy/plot.js";
import { resolveHierarchyResource } from "../../selectors/hierarchy.js";
import { requireLayer, resolveEligibleLayer } from "../../selectors/layers.js";
import { resolveInputReference } from "../../selectors/resources.js";
import { assertMarkAvailable, resolveMarkId } from "../marks/shared.js";
import { resolveHierarchyPlot } from "../../materialization/hierarchy/plot.js";
import { resolveMarkGraphicPlacement } from "../../materialization/graphicHierarchy.js";
import { rematerializeHighlightBaseline } from "../marks/lifecycle.js";

function materializer(method, op) {
  return closedAction({ op, description: `Materialize stored ${method} plot geometry.` }, ["id"], function ({ id } = {}) {
    const layer = requireLayer(this, id), config = this.markConfigs[id]?.hierarchyPlot;
    if (layer.mark.type !== method || config === undefined) throw new TypeError(`Materialization requires a configured ${method} plot.`);
    const highlighted = rematerializeHighlightBaseline(this, { target: id, operation: op, resetProperty: "items", resetValue: [] });
    if (highlighted !== undefined) return highlighted;
    if (method !== "partition") validateHierarchyPlotDefinition(method, config, layer.hierarchyLabels);
    const resolved = resolveHierarchyPlot(this, layer, config);
    let next = this;
    if (!next.graphicSpec.objects[id]) next = next.createGraphics({ id, type: "collection", ...resolveMarkGraphicPlacement(next, { markType: method }) });
    next = next.editGraphics({ target: id, property: "items", value: resolved.graphics });
    if (config.clip || next.graphicSpec.objects[id].clip !== undefined) next = next.editGraphics({ target: id, property: "clip", value: config.clip ? resolved.frame : false });
    return next;
  });
}
export const materializePartitionPlot = /* @__PURE__ */ materializer("partition", "materializePartitionPlot");
export const materializeTreePlot = /* @__PURE__ */ materializer("tree", "materializeTreePlot");
export const materializeTreemapPlot = /* @__PURE__ */ materializer("treemap", "materializeTreemapPlot");

function facade(method, editing) {
  const name = method === "tree" ? "TreePlot" : "TreemapPlot", op = `${editing ? "edit" : "create"}${name}`;
  const styleOptions = ["origin", "clip", "labels", ...(method === "tree" ? ["nodes", "links"] : ["cells"])];
  return closedAction({ op, description: `${editing ? "Edit" : "Create"} a resource-backed ${method} plot.` },
    [editing ? "target" : "id", "layout", ...styleOptions], function (args = {}) {
      if (editing && !Object.keys(args).some(key => key !== "target")) throw new TypeError(`${op} requires a nonempty patch.`);
      const previous = editing ? resolveEligibleLayer(this, { target: args.target, predicate: layer => layer.mark.type === method, label: op }) : undefined;
      const id = previous?.id ?? resolveMarkId(this, args.id, { defaultId: method === "tree" ? "treePlot" : "treemapPlot", label: `${method} plot id`, markType: method, operation: op });
      if (!editing) assertMarkAvailable(this, id);
      const layout = resolveHierarchyResource(this, "layout", args.layout ?? previous?.hierarchyBinding.layout.id, method);
      const hierarchy = resolveInputReference(this, layout.inputs[0]);
      const normalized = normalizeHierarchyPlot(method, Object.fromEntries(styleOptions.filter(key => Object.hasOwn(args, key)).map(key => [key, args[key]])), hierarchy,
        previous === undefined ? undefined : this.markConfigs[id].hierarchyPlot, previous?.hierarchyLabels);
      const layer = { ...previous, id, mark: { type: method }, hierarchyBinding: { layout: { kind: "layout", id: layout.id, revision: layout.revision } }, hierarchyLabels: normalized.labels };
      resolveHierarchyPlot(this, layer, normalized.config);
      let next = this.editSemantic({ property: `layer[${id}].mark.type`, value: method })
        .editSemantic({ property: `layer[${id}].hierarchyBinding`, value: layer.hierarchyBinding })
        .editSemantic({ property: `layer[${id}].hierarchyLabels`, value: layer.hierarchyLabels })
        ._withMarkConfig(id, { hierarchyPlot: normalized.config });
      return next[method === "tree" ? "materializeTreePlot" : "materializeTreemapPlot"]({ id });
    });
}
export const createTreePlot = /* @__PURE__ */ facade("tree", false);
export const editTreePlot = /* @__PURE__ */ facade("tree", true);
export const createTreemapPlot = /* @__PURE__ */ facade("treemap", false);
export const editTreemapPlot = /* @__PURE__ */ facade("treemap", true);
export function registerHierarchyPlotActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, { createPartitionPlot, editPartitionPlot, materializePartitionPlot, createTreePlot, editTreePlot, createTreemapPlot, editTreemapPlot, materializeTreePlot, materializeTreemapPlot });
}
