import { cloneAndFreeze } from '../core/immutable.js';
import { validateConcreteGraphicProperties } from '../grammar/schemas/concreteGraphic.js';
import { sampleAnimationTimeline } from './timelineTracks.js';

// Per-sample lookups contain current values only. Native family owners still
// produce geometry and retained meaning at their exact owner progress.
export function sampleTransitionTimeline(timeline, timeMs, progress) {
  const sampled = timeline === undefined ? { ownerProgress: [], styles: [] } : sampleAnimationTimeline(timeline, timeMs);
  const owners = new Map(sampled.ownerProgress.map(entry => [entry.ownerKey, entry.progress]));
  const ordinary = new Map(), geographic = new Map(), text = new Map();
  for (const entry of sampled.styles) {
    const { binding, property, value } = entry;
    const map = binding.kind === 'geo' ? geographic : binding.kind === 'geo-text' ? text : ordinary;
    const key = binding.kind === 'geo' ? JSON.stringify([binding.targetGroup, binding.featureKey])
      : binding.kind === 'geo-text' ? JSON.stringify([binding.targetGroup, binding.entryKey]) : binding.targetIndex;
    if (!map.has(key)) map.set(key, {}); map.get(key)[property] = value;
  }
  return {
    progress: ownerKey => owners.get(ownerKey) ?? progress,
    geoStyle: (group, featureKey) => geographic.get(JSON.stringify([group, featureKey])),
    textStyle: (group, entryKey) => text.get(JSON.stringify([group, entryKey])),
    node(node, targetIndex) {
      const patch = ordinary.get(targetIndex);
      if (patch === undefined) return node;
      const properties = { ...node.properties, ...patch };
      validateConcreteGraphicProperties(node.type, properties);
      return cloneAndFreeze({ ...node, properties });
    }
  };
}
