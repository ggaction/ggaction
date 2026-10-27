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

// Configured composite plots retain their established owner errors while sharing
// the explicit/current/unique resolution order.
export function resolveConfiguredOwner(program, requested, {
  config, operation, kind, article = "a", materialized = false, missing, ambiguous
}, validateUserId) {
  const eligible = program.semanticSpec.layers.filter(layer => {
    const value = program.markConfigs[layer.id]?.[config];
    return materialized ? value?.materialized === true : value !== undefined;
  });
  const id = requested === undefined ? program.context.currentMark
    : validateUserId(requested, `${kind[0].toUpperCase() + kind.slice(1)}-plot owner id`);
  const owner = eligible.find(layer => layer.id === id);
  if (owner !== undefined) return owner;
  if (requested !== undefined) throw new Error(`Unknown ${kind}-plot owner "${id}".`);
  if (eligible.length === 1) return eligible[0];
  if (eligible.length === 0) throw new Error(missing ?? `${operation} requires ${article} ${kind} plot.`);
  throw new Error(ambiguous ?? `${operation} target is ambiguous; provide target.`);
}
