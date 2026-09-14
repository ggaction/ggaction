import { annotateError } from "../core/diagnostics.js";

export function findLayer(program, id) {
  return program.semanticSpec.layers.find(layer => layer.id === id);
}

export function findLayerMatching(program, predicate) {
  return program.semanticSpec.layers.find(predicate);
}

export function hasLayer(program, id) {
  return findLayer(program, id) !== undefined;
}

export function requireLayer(program, id, label = `Layer "${id}"`) {
  const layer = findLayer(program, id);
  if (layer === undefined) throw annotateError(new Error(`${label} does not exist.`), { code: "missing-resource", resourceId: id });
  return layer;
}

export function resolveEligibleLayer(program, {
  target,
  predicate,
  label,
  targetOption = "target",
  current = program.context.currentMark
}) {
  const candidates = program.semanticSpec.layers.filter(predicate);
  if (target !== undefined) {
    const selected = candidates.find(layer => layer.id === target);
    if (selected === undefined) throw annotateError(new Error(`Unknown ${label} ${targetOption} "${target}".`), { code: findLayer(program, target) ? "incompatible-resource" : "missing-resource", resourceId: target, optionPath: targetOption });
    return selected;
  }
  const selected = candidates.find(layer => layer.id === current);
  if (selected !== undefined) return selected;
  if (candidates.length === 1) return candidates[0];
  if (candidates.length === 0) throw annotateError(new Error(`${label} requires an eligible layer.`), { code: "missing-resource", optionPath: targetOption });
  throw annotateError(new Error(`${label} ${targetOption} is ambiguous; provide ${targetOption}.`), { code: "ambiguous-resource", optionPath: targetOption, candidates: candidates.map(layer => layer.id) });
}
