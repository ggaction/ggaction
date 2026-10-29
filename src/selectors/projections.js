import { annotateError } from "../core/diagnostics.js";
import { requireStoredResource } from "./resources.js";

export function resolveProjectionResource(program, target) {
  if (target !== undefined) return requireStoredResource(program, { kind: "projection", id: target });
  const candidates = program.semanticSpec.resources.filter(resource => resource.kind === "projection");
  const current = candidates.find(resource => resource.id === program.context.currentResources?.projection);
  if (current !== undefined) return current;
  if (candidates.length !== 1) throw annotateError(new Error("An explicit projection id is required unless one projection exists."), {
    code: candidates.length ? "ambiguous-resource" : "missing-resource", candidates: candidates.map(resource => resource.id)
  });
  return candidates[0];
}
