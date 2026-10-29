import { closedAction } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { normalizeFlowPlot, validateFlowPlotDefinition } from "../../grammar/flow/plot.js";
import { resolveFlowCoordinate, resolveFlowLayout } from "../../selectors/flow.js";
import { requireLayer, resolveEligibleLayer } from "../../selectors/layers.js";
import { resolveInputReference } from "../../selectors/resources.js";
import { findCoordinate } from "../../selectors/coordinates.js";
import { resolveFlowPlot } from "../../materialization/flow/plot.js";
import { resolveMarkGraphicPlacement } from "../../materialization/graphicHierarchy.js";
import { assertMarkAvailable, resolveMarkId } from "../marks/shared.js";
import { rematerializeHighlightBaseline } from "../marks/lifecycle.js";

function materializer(kind, op) {
  return closedAction({ op, description: "Materialize a stored flow layout consumer." }, ["id"], function ({ id } = {}) {
    const layer = requireLayer(this, id), config = this.markConfigs[id]?.flowPlot;
    if (layer.mark.type !== kind || config === undefined) throw new TypeError("Flow materialization requires its configured mark.");
    const highlighted = rematerializeHighlightBaseline(this, { target: id, operation: op, resetProperty: "items", resetValue: [] });
    if (highlighted !== undefined) return highlighted;
    validateFlowPlotDefinition(kind, config, layer.flowLabels);
    const resolved = resolveFlowPlot(this, layer, config);
    let next = this;
    if (!next.graphicSpec.objects[id]) next = next.createGraphics({ id, type: "collection", ...resolveMarkGraphicPlacement(next, { markType: kind }) });
    next = next.editGraphics({ target: id, property: "items", value: resolved.graphics });
    if (config.clip || next.graphicSpec.objects[id].clip !== undefined) next = next.editGraphics({ target: id, property: "clip", value: config.clip ? resolved.frame : false });
    return next;
  });
}
export const materializeFlowNodes = /* @__PURE__ */ materializer("flow-node", "materializeFlowNodes");
export const materializeFlowLinks = /* @__PURE__ */ materializer("flow-link", "materializeFlowLinks");

function facade(kind, editing) {
  const node = kind === "flow-node", op = `${editing ? "edit" : "create"}Flow${node ? "Nodes" : "Links"}`;
  const styleKeys = [node ? "nodes" : "links", "clip", ...(node ? ["labels"] : [])];
  return closedAction({ op, description: `${editing ? "Edit" : "Create"} flow ${node ? "nodes" : "links"} from a stored layout.` },
    [editing ? "target" : "id", "layout", "coordinate", ...styleKeys], function (args = {}) {
      if (Object.values(args).some(value => value === undefined)) throw new TypeError("Flow plot options cannot be undefined.");
      if (Object.hasOwn(args, "coordinate")) validateUserId(args.coordinate, "Flow coordinate");
      if (editing && !Object.keys(args).some(key => key !== "target")) throw new TypeError("Flow plot edit requires a nonempty patch.");
      const previous = editing ? resolveEligibleLayer(this, { target: args.target, predicate: layer => layer.mark.type === kind, label: op }) : undefined;
      const id = previous?.id ?? resolveMarkId(this, args.id, { defaultId: node ? "flowNodes" : "flowLinks", label: "Flow mark id", markType: kind, operation: op });
      if (!editing) assertMarkAvailable(this, id);
      const layout = resolveFlowLayout(this, args.layout ?? previous?.flowBinding.layout.id), graph = resolveInputReference(this, layout.inputs[0]);
      const coordinate = resolveFlowCoordinate(this, args.coordinate ?? previous?.coordinate);
      const normalized = normalizeFlowPlot(kind, Object.fromEntries(styleKeys.filter(key => Object.hasOwn(args, key)).map(key => [key, args[key]])), graph,
        previous === undefined ? undefined : this.markConfigs[id].flowPlot, previous?.flowLabels);
      const layer = { ...previous, id, mark: { type: kind }, coordinate: coordinate.id,
        flowBinding: { layout: { kind: "layout", id: layout.id, revision: layout.revision } }, flowLabels: normalized.labels };
      const coordinates = findCoordinate(this, coordinate.id) ? this.semanticSpec.coordinates : [...this.semanticSpec.coordinates, coordinate];
      resolveFlowPlot({ ...this, semanticSpec: { ...this.semanticSpec, coordinates } }, layer, normalized.config);
      let next = findCoordinate(this, coordinate.id) ? this : this.createCoordinate(coordinate);
      next = next.editSemantic({ property: `layer[${id}].mark.type`, value: kind })
        .editSemantic({ property: `layer[${id}].coordinate`, value: coordinate.id })
        .editSemantic({ property: `layer[${id}].flowBinding`, value: layer.flowBinding })
        .editSemantic({ property: `layer[${id}].flowLabels`, value: layer.flowLabels })
        ._withMarkConfig(id, { flowPlot: normalized.config });
      return next[node ? "materializeFlowNodes" : "materializeFlowLinks"]({ id });
    });
}
export const createFlowNodes = /* @__PURE__ */ facade("flow-node", false);
export const editFlowNodes = /* @__PURE__ */ facade("flow-node", true);
export const createFlowLinks = /* @__PURE__ */ facade("flow-link", false);
export const editFlowLinks = /* @__PURE__ */ facade("flow-link", true);
export function registerFlowPlotActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, { createFlowNodes, editFlowNodes, createFlowLinks, editFlowLinks, materializeFlowNodes, materializeFlowLinks });
}
