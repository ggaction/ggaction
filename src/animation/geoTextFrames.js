import { cloneAndFreeze } from "../core/immutable.js";
import { sceneItemIdentity } from "../sceneSnapshot.js";
import { validateGeneratedItemLimit } from "../core/validation.js";
import { createGeoAnimationDecision } from "../grammar/animation/geoDecision.js";
import { geoTextAnimationOrigin, inheritGeoTextOrigins } from "../materialization/animation/geoText.js";

export function geoTextFrameCollector(samples, target) {
  const groups = samples.map(sample => ({ presentation: sample.presentation, frame: sample.frame,
    leaderFrame: sample.leaderFrame, insertion: undefined, leaderInsertion: sample.leaderFrame === null ? null : undefined }));
  const items = [], counts = new Map(), byOwner = new Map(samples.map((sample, index) => [sample.presentation.key, index]));
  function at(slot, size, role, ownerKey) {
    const result = [];
    const group = byOwner.get(ownerKey);
    if (group === undefined) return result;
    const sample = samples[group];
    {
      const leader = role === "leaders", field = leader ? "leaderInsertion" : "insertion";
      if (target.groups[sample.targetGroup][field] !== slot) return result;
      groups[group][field] = size + result.length;
      for (const graphic of sample.graphics[role]) {
        const identity = graphic.identity, sceneIdentity = sceneItemIdentity(identity), count = counts.get(sceneIdentity.key) ?? 0;
        counts.set(sceneIdentity.key, count + 1);
        result.push({ node: { key: `${sceneIdentity.key}#${count}`, type: graphic.type, topology: sceneIdentity.topology,
          properties: graphic.properties, ...(leader ? sample.leaderFrame : sample.frame) }, identity,
          decision: createGeoAnimationDecision(identity, "native-geo-text"),
          origin: geoTextAnimationOrigin(target, sample.targetGroup, identity.key), item: { group, key: identity.key, role: identity.role } });
        validateGeneratedItemLimit(size + result.length, "Animation sampled nodes");
      }
    }
    return result;
  }
  return { at, append: item => items.push(item ?? null), finish(geos) {
    if (groups.some(group => group.insertion === undefined || group.leaderInsertion === undefined)) throw new TypeError("Geographic Text requires its actual sampled drawing slots.");
    const keys = new Set(groups.map(group => group.presentation.key)), bodyKeys = new Set(geos.groups.map(group => group.presentation.geometry.key));
    const state = cloneAndFreeze({ groups, items, order: target.order.filter(([role, key]) => role === "geo" ? bodyKeys.has(key) : keys.has(key)) });
    return inheritGeoTextOrigins(state, target, samples.map(sample => sample.targetGroup));
  } };
}
