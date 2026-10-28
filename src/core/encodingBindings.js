import { canonicalJSON } from "./contentDigest.js";

export function positionBindings(layer, channel) {
  const conditional = layer.conditionals?.[channel];
  return conditional === undefined ? (layer.encoding?.[channel] === undefined ? [] : [layer.encoding[channel]])
    : [...conditional.conditions.map(condition => condition.value), conditional.otherwise];
}

export function hasPositionBinding(layer, channel) {
  const bindings = positionBindings(layer, channel);
  return bindings.length > 0 && bindings.every(binding => binding.scale !== undefined);
}

// Structural consumers may read only properties shared by every branch.
// A differing field, datum, scale or type is deliberately absent from this view.
export function commonPositionBinding(layer, channel) {
  const bindings = positionBindings(layer, channel);
  if (bindings.length === 0) return undefined;
  return Object.fromEntries(Object.entries(bindings[0]).filter(([key, value]) =>
    bindings.every(binding => Object.hasOwn(binding, key) && canonicalJSON(binding[key]) === canonicalJSON(value))));
}

// Consumers that need one semantic binding (guides and band offsets)
// must reject ambiguity instead of choosing a branch from current row values.
export function uniquePositionBinding(layer, channel) {
  const bindings = positionBindings(layer, channel);
  if (bindings.length === 0) return undefined;
  const signature = canonicalJSON(bindings[0]);
  if (bindings.some(binding => canonicalJSON(binding) !== signature)) {
    throw new Error(`Conditional ${channel} requires one unique binding for this consumer.`);
  }
  return bindings[0];
}


// A transient structural witness for existing family kernels. Callers must
// validate every branch against the same item membership before using it;
// selected values are evaluated separately and this view is never persisted.
export function conditionalPositionTemplate(layer, channels) {
  const encoding = { ...layer.encoding };
  for (const channel of channels) if (layer.conditionals?.[channel] !== undefined) encoding[channel] = layer.conditionals[channel].otherwise;
  return { ...layer, encoding };
}
