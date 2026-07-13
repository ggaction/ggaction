export function findLayer(program, id) {
  return program.semanticSpec.layers.find(layer => layer.id === id);
}

export function hasLayer(program, id) {
  return findLayer(program, id) !== undefined;
}

export function requireLayer(program, id, label = `Layer "${id}"`) {
  const layer = findLayer(program, id);
  if (layer === undefined) throw new Error(`${label} does not exist.`);
  return layer;
}

export function resolveEligibleLayer(program, {
  target,
  predicate,
  label,
  current = program.context.currentMark
}) {
  const candidates = program.semanticSpec.layers.filter(predicate);
  if (target !== undefined) {
    const selected = candidates.find(layer => layer.id === target);
    if (selected === undefined) throw new Error(`Unknown ${label} target "${target}".`);
    return selected;
  }
  const selected = candidates.find(layer => layer.id === current);
  if (selected !== undefined) return selected;
  if (candidates.length === 1) return candidates[0];
  if (candidates.length === 0) throw new Error(`${label} requires an eligible layer.`);
  throw new Error(`${label} target is ambiguous; provide target.`);
}
