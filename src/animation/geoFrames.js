import { cloneAndFreeze } from "../core/immutable.js";
import { sceneItemIdentity } from "../sceneSnapshot.js";
import { validateGeneratedItemLimit } from "../core/validation.js";
import { createGeoAnimationDecision } from "../grammar/animation/geoDecision.js";
import { geoAnimationFeatureOrigin, inheritGeoAnimationOrigins } from "../materialization/animation/geoPresentation.js";

// A group keeps its explicit drawing slot even when every feature is clipped.
// Only current native stream parts become scene nodes or hit candidates.
export function geoFrameCollector(samples, target) {
  const groups = samples.map(sample => ({ presentation: sample.presentation, insertion: undefined }));
  const items = [], starts = new Map(), emissions = new Map(), counts = new Map();
  const add = (map, slot, key, value) => {
    if (!map.has(slot)) map.set(slot, new Map());
    if (!map.get(slot).has(key)) map.get(slot).set(key, []);
    map.get(slot).get(key).push(value);
  };
  for (const [group, sample] of samples.entries()) {
    const slot = target.groups[sample.targetGroup].insertion;
    const key = sample.presentation.geometry.key;
    add(starts, slot, key, group);
    for (const emission of sample.emissions) {
      add(emissions, emission.slot, key, { group, emission });
    }
  }
  function at(slot, size, ownerKey) {
    for (const group of starts.get(slot)?.get(ownerKey) ?? []) groups[group].insertion = size;
    const result = [];
    for (const { group, emission } of emissions.get(slot)?.get(ownerKey) ?? []) {
      const sample = samples[group];
      for (const graphic of emission.graphics) {
        const identity = graphic.identity, sceneIdentity = sceneItemIdentity(identity), count = counts.get(sceneIdentity.key) ?? 0;
        counts.set(sceneIdentity.key, count + 1);
        const node = { key: `${sceneIdentity.key}#${count}`, type: graphic.type, topology: sceneIdentity.topology,
          properties: graphic.properties, ...sample.presentation.frame };
        const origin = geoAnimationFeatureOrigin(target, sample.targetGroup, emission.key, false);
        result.push({ node, decision: createGeoAnimationDecision(identity), identity, origin,
          item: { group, key: emission.key, role: identity.role } });
        validateGeneratedItemLimit(size + result.length, "Animation sampled nodes");
      }
    }
    return result;
  }
  const slots = [...new Set([...starts.keys(), ...emissions.keys()])].map(slot => [slot, [...new Set([...(starts.get(slot)?.keys() ?? []), ...(emissions.get(slot)?.keys() ?? [])])]]);
  return { slots, at, append: item => items.push(item ?? null), finish() {
    if (groups.some(group => group.insertion === undefined)) throw new TypeError("Geo sampled group requires its actual drawing slot.");
    const state = cloneAndFreeze({ groups, items });
    return inheritGeoAnimationOrigins(state, target, samples.map(sample => sample.targetGroup));
  } };
}
