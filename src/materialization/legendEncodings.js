import { canonicalJSON } from "../core/contentDigest.js";
import { findLayer } from "../selectors/layers.js";

function bindings(definition) {
  if (definition === undefined) return [];
  const values = [...definition.conditions.map(condition => condition.value), definition.otherwise].filter(value => value.scale !== undefined);
  return [...new Map(values.map(value => [canonicalJSON(value), value])).values()];
}

// Read-only guide projection. The conditional remains the sole stored owner.
export function conditionalLegendLayer(layer, channels) {
  if (layer?.conditionals === undefined) return layer;
  const encoding = { ...layer.encoding };
  for (const [channel, definition] of Object.entries(layer.conditionals)) {
    const candidates = bindings(definition);
    if (candidates.length > 1 && channels?.includes(channel)) throw new Error(`Conditional ${channel} legend binding is ambiguous on mark "${layer.id}".`);
    if (candidates.length === 1) encoding[channel] = candidates[0];
  }
  return { ...layer, encoding };
}

export function findLegendLayer(program, id) {
  return conditionalLegendLayer(findLayer(program, id));
}
