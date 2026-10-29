import { mapLayerResourceBindings } from "../../core/resourceReferences.js";
import { resolveCalendarPlot } from "../../materialization/calendar/plot.js";
import { getLayerScaleIds } from "../../materialization/marks/index.js";
import { applyMaterializationPlan, planLayersDataRematerialization } from "../../materialization/dependencies.js";
import { resolveScalePreview } from "../scales/preview.js";

export function preflightCalendarConsumers(program, resources) {
  const replacements = new Map(resources.map(resource => [resource.id, resource]));
  const layers = mapLayerResourceBindings(program.semanticSpec.layers, ref => ref.kind === "layout" && replacements.has(ref.id)
    ? { ...ref, revision: replacements.get(ref.id).revision } : ref);
  const affected = layers.filter(layer => replacements.has(layer.calendarBinding?.layout.id));
  const preview = { ...program, semanticSpec: { ...program.semanticSpec, layers,
    resources: program.semanticSpec.resources.map(value => value.kind === "layout" ? replacements.get(value.id) ?? value : value) } };
  const resolvedScales = { ...program.resolvedScales };
  for (const id of new Set(affected.flatMap(getLayerScaleIds))) resolvedScales[id] = resolveScalePreview(preview, id).resolvedScale;
  for (const layer of affected) resolveCalendarPlot(preview, layer, program.materializationConfigs.marks[layer.id].calendarPlot, resolvedScales);
  return affected.map(layer => layer.id);
}
export function materializeCalendarConsumers(program, ids) {
  return applyMaterializationPlan(program, planLayersDataRematerialization(program, ids));
}
