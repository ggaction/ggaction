import { annotateError } from "../core/diagnostics.js";
import { requireMaterializedDataset } from "./datasets.js";
import { requireStoredResource, resolveInputReference } from "./resources.js";

export function resolveHierarchyResource(program, kind, requested, method) {
  const eligible = resource => resource.kind === kind &&
    (kind !== "layout" || resource.inputs.length === 1 && resource.inputs[0].kind === "hierarchy") &&
    (method === undefined || resource.options.method === method);
  if (requested !== undefined) {
    const resource = requireStoredResource(program, { kind, id: requested });
    if (!eligible(resource)) throw annotateError(new Error("Hierarchy layout has an incompatible method."), { code: "incompatible-resource", resourceId: resource.id });
    return resource;
  }
  const current = program.context.currentResources?.[kind];
  const candidates = program.semanticSpec.resources.filter(eligible);
  const active = candidates.find(resource => resource.id === current);
  if (active) return active;
  if (candidates.length !== 1) throw annotateError(new Error(`An explicit ${kind} id is required unless one eligible resource exists.`), {
    code: candidates.length ? "ambiguous-resource" : "missing-resource", candidates: candidates.map(resource => resource.id)
  });
  return candidates[0];
}

export function resolveHierarchyDataset(program, requested) {
  const id = requested ?? program.context.currentData;
  if (id !== undefined) return requireMaterializedDataset(program, id);
  const candidates = program.semanticSpec.datasets.filter(dataset => Array.isArray(dataset.values));
  if (candidates.length !== 1) throw annotateError(new Error("Hierarchy data must be explicit unless one materialized dataset exists."), {
    code: candidates.length ? "ambiguous-resource" : "missing-resource"
  });
  return candidates[0];
}

export function resolveHierarchyLayerResources(program, layer) {
  const layout = requireStoredResource(program, layer.hierarchyBinding.layout);
  if (layout.kind !== "layout" || layout.inputs.length !== 1 || layout.inputs[0].kind !== "hierarchy" || layout.options.method !== layer.mark.type) throw new TypeError("Hierarchy plot requires a layout of its own method.");
  const hierarchy = resolveInputReference(program, layout.inputs[0]);
  return { layout, hierarchy, dataset: resolveInputReference(program, hierarchy.inputs[0]) };
}

// Dependency grammar consumes an explicit data owner for every layer. This
// transient view never writes a second dataset binding to a resource-backed mark.
export function hierarchyFacetSource(program) {
  return { ...program.semanticSpec, layers: program.semanticSpec.layers.map(layer => layer.hierarchyBinding === undefined
    ? layer : { ...layer, data: resolveHierarchyLayerResources(program, layer).dataset.id }) };
}
