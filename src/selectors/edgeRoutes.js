import { annotateError } from "../core/diagnostics.js";
import { requireStoredResource } from "./resources.js";

export function resolveEdgeRouteResource(program, target) {
  if (target !== undefined) return requireStoredResource(program, { kind: "edge-route", id: target });
  const candidates = program.semanticSpec.resources.filter(resource => resource.kind === "edge-route");
  const current = candidates.find(resource => resource.id === program.context.currentResources?.["edge-route"]);
  if (current) return current;
  if (candidates.length !== 1) throw annotateError(new Error("An explicit edge route id is required unless one eligible route exists."), {
    code: candidates.length ? "ambiguous-resource" : "missing-resource", candidates: candidates.map(resource => resource.id)
  });
  return candidates[0];
}
