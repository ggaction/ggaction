import { positionBindings, uniquePositionBinding } from "../core/encodingBindings.js";

// Guide inference consumes one field/type/scale meaning. This view is never
// stored and never selects a branch based on the current dataset or predicate.
export function positionGuideLayers(program, channels, { coordinate, scale } = {}) {
  return program.semanticSpec.layers.map(layer => {
    if (coordinate !== undefined && layer.coordinate !== coordinate) return layer;
    let encoding;
    for (const channel of channels) {
      if (layer.conditionals?.[channel] === undefined) continue;
      const bindings = positionBindings(layer, channel);
      if (scale !== undefined && !bindings.some(binding => binding.scale === scale)) continue;
      encoding ??= { ...layer.encoding };
      encoding[channel] = uniquePositionBinding(layer, channel);
    }
    return encoding === undefined ? layer : { ...layer, encoding };
  });
}
