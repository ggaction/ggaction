import { closedAction } from "../../core/action.js";
import { annotateError } from "../../core/diagnostics.js";
import { normalizePartitionPlot, PARTITION_MAPPING_OPTIONS, PARTITION_VIEW_OPTIONS } from "../../grammar/hierarchy/partitionPlot.js";
import { resolveHierarchyResource } from "../../selectors/hierarchy.js";
import { resolveInputReference } from "../../selectors/resources.js";
import { requireLayer, resolveEligibleLayer } from "../../selectors/layers.js";
import { findCoordinate, hasCoordinate, requireCoordinate } from "../../selectors/coordinates.js";
import { resolveHierarchyPlot } from "../../materialization/hierarchy/plot.js";
import { resolveStoredSelection } from "../../materialization/selection/state.js";
import { assertMarkAvailable, resolveMarkId } from "../marks/shared.js";

function coordinateFor(program, requested) {
  if (requested !== undefined) return { coordinate: requireCoordinate(program, requested), create: false };
  const candidates = program.semanticSpec.coordinates.filter(coordinate => ["cartesian", "polar"].includes(coordinate.type));
  const contextual = findCoordinate(program, program.context.currentCoordinate);
  const current = candidates.includes(contextual) ? contextual : undefined;
  if (current || candidates.length === 1) return { coordinate: current ?? candidates[0], create: false };
  if (candidates.length || hasCoordinate(program, "main")) throw annotateError(new Error("Partition coordinate is ambiguous; provide coordinate."), { code: "ambiguous-resource" });
  return { coordinate: { id: "main", type: "cartesian" }, create: true };
}

// Drop is explicit membership pruning. Predicate-based hidden selections otherwise
// remain unchanged, so returning to an ancestor reveals the same logical nodes.
export function prunePartitionSelections(program, id, resolved, previousProgram = program) {
  const layer = requireLayer(program, id);
  if (layer.partitionView.prunedSelection !== "drop") return program;
  const visible = new Map(resolved.items.filter(item => item.visible).map(item => [item.key, item.node.key]));
  let next = program;
  for (const [selection, definition] of Object.entries(program.materializationConfigs.selections ?? {})) {
    if (definition.target !== id || definition.sourceSelection) continue;
    const previous = resolveStoredSelection(previousProgram, selection);
    if (previous.keys.every(key => visible.has(key))) continue;
    const values = previous.keys.filter(key => visible.has(key)).map(key => visible.get(key));
    next = next.editMarkSelection({ selection, field: "nodeKey", op: "oneOf", values });
  }
  return next;
}

function facade(editing) {
  const op = editing ? "editPartitionPlot" : "createPartitionPlot";
  return closedAction({ op, description: `${editing ? "Edit" : "Create"} a coordinate-mapped partition plot.` },
    [editing ? "target" : "id", "layout", "coordinate", ...PARTITION_VIEW_OPTIONS, ...PARTITION_MAPPING_OPTIONS, "clip", "cells", "labels"], function (args = {}) {
      if (editing && !Object.keys(args).some(key => key !== "target")) throw new TypeError("editPartitionPlot requires a nonempty patch.");
      const previous = editing ? resolveEligibleLayer(this, { target: args.target, predicate: layer => layer.mark.type === "partition", label: op }) : undefined;
      const id = previous?.id ?? resolveMarkId(this, args.id, { defaultId: "partitionPlot", label: "Partition plot id", markType: "partition", operation: op });
      if (!editing) assertMarkAvailable(this, id);
      const layout = resolveHierarchyResource(this, "layout", args.layout ?? previous?.hierarchyBinding.layout.id, "partition"), hierarchy = resolveInputReference(this, layout.inputs[0]);
      const { coordinate, create } = coordinateFor(this, args.coordinate ?? previous?.coordinate);
      const { id: _id, target: _target, layout: _layout, coordinate: _coordinate, ...patch } = args;
      const normalized = normalizePartitionPlot(patch, hierarchy, previous ? this.markConfigs[id].hierarchyPlot : undefined, previous?.hierarchyLabels, previous?.partitionView);
      const layer = { ...previous, id, mark: { type: "partition" }, coordinate: coordinate.id,
        hierarchyBinding: { layout: { kind: "layout", id: layout.id, revision: layout.revision } }, hierarchyLabels: normalized.labels, partitionView: normalized.view };
      const preview = create ? { ...this, semanticSpec: { ...this.semanticSpec, coordinates: [...this.semanticSpec.coordinates, coordinate] } } : this;
      resolveHierarchyPlot(preview, layer, normalized.config);
      let next = create ? this.createCoordinate({ id: coordinate.id, type: coordinate.type }) : this;
      next = next.editSemantic({ property: `layer[${id}].mark.type`, value: "partition" })
        .editSemantic({ property: `layer[${id}].hierarchyBinding`, value: layer.hierarchyBinding })
        .editSemantic({ property: `layer[${id}].coordinate`, value: layer.coordinate })
        .editSemantic({ property: `layer[${id}].hierarchyLabels`, value: layer.hierarchyLabels })
        .editSemantic({ property: `layer[${id}].partitionView`, value: layer.partitionView })
        ._withMarkConfig(id, { hierarchyPlot: normalized.config }).materializePartitionPlot({ id });
      return prunePartitionSelections(next, id, resolveHierarchyPlot(next, layer, normalized.config));
    });
}
export const createPartitionPlot = /* @__PURE__ */ facade(false);
export const editPartitionPlot = /* @__PURE__ */ facade(true);
