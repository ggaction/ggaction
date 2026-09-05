export function findSemanticScale(program, id) {
  return program.semanticSpec.scales.find(scale => scale.id === id);
}

export function requireSemanticScale(program, id) {
  const scale = findSemanticScale(program, id);
  if (scale === undefined) throw new Error(`Unknown scale "${id}".`);
  return scale;
}

export function requireResolvedScale(program, id, type) {
  const scale = program.resolvedScales[id];
  if (scale === undefined || (type !== undefined && scale.type !== type)) {
    throw new Error(
      type === undefined
        ? `Unknown resolved scale "${id}".`
        : `Expected resolved ${type} scale "${id}".`
    );
  }
  return scale;
}

export function hasSemanticScaleReferences(spec, id) {
  const referenced = value => value !== null && typeof value === "object" && Object.entries(value).some(([key, child]) =>
    (key === "scale" && child === id) || (key === "scales" && Array.isArray(child) && child.includes(id)) || referenced(child));
  return referenced(spec.layers) || referenced(spec.guides);
}
