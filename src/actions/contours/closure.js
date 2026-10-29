import { mapLayerResourceBindings } from "../../core/resourceReferences.js";
import { resolveContourPlot } from "../../materialization/contour/plot.js";
import { getLayerScaleIds } from "../../materialization/marks/index.js";
import { applyMaterializationPlan, planLayersDataRematerialization } from "../../materialization/dependencies.js";
import { resolveScalePreview } from "../scales/preview.js";

export function preflightContourConsumers(program, resources) {
  const replacements = new Map(resources.map(resource => [resource.id, resource]));
  const layers = mapLayerResourceBindings(program.semanticSpec.layers, ref => ref.kind === "geometry" && replacements.has(ref.id)
    ? { ...ref, revision: replacements.get(ref.id).revision } : ref);
  const affected = layers.filter(layer => replacements.has(layer.contourBinding?.geometry.id));
  const preview = { ...program, semanticSpec: { ...program.semanticSpec, layers,
    resources: program.semanticSpec.resources.map(value => value.kind === "geometry" ? replacements.get(value.id) ?? value : value) } };
  const resolvedScales = { ...program.resolvedScales };
  for (const id of new Set(affected.flatMap(getLayerScaleIds))) resolvedScales[id] = resolveScalePreview(preview, id).resolvedScale;
  for (const layer of affected) resolveContourPlot(preview, layer, program.markConfigs[layer.id].contour, resolvedScales);
  return affected.map(layer => layer.id);
}

export function materializeContourConsumers(program, ids) {
  return applyMaterializationPlan(program, planLayersDataRematerialization(program, ids));
}
