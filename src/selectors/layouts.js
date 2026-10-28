import { annotateError } from "../core/diagnostics.js";
import { requireStoredResource } from "./resources.js";

export function resolveLayoutResource(program, requested, inputKind, method) {
  const eligible = resource => resource.kind === "layout" && resource.inputs.length === 1 &&
    (inputKind === undefined || resource.inputs[0].kind === inputKind) &&
    (method === undefined || resource.options.method === method);
  if (requested !== undefined) {
    const resource = requireStoredResource(program, { kind: "layout", id: requested });
    if (!eligible(resource)) throw annotateError(new Error("Layout has an incompatible input or method."), {
      code: "incompatible-resource", resourceId: resource.id
    });
    return resource;
  }
  const candidates = program.semanticSpec.resources.filter(eligible);
  const current = candidates.find(resource => resource.id === program.context.currentResources?.layout);
  if (current) return current;
  if (candidates.length !== 1) throw annotateError(new Error("An explicit layout id is required unless one eligible resource exists."), {
    code: candidates.length ? "ambiguous-resource" : "missing-resource", candidates: candidates.map(resource => resource.id)
  });
  return candidates[0];
}
