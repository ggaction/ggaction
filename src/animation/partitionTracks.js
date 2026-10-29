import { cloneAndFreeze } from "../core/immutable.js";
import { validateWorkLimit } from "../core/validation.js";
import { preparePartitionAnimationState, samplePartitionAnimationState } from "../grammar/animation/partitionState.js";
import { interpolateNumber } from "../grammar/animation/values.js";
import { resolvePartitionAnimationGeometry, partitionAnimationItemGeometry, partitionAnimationGroupWork } from "../materialization/animation/partitionGeometry.js";
import { sameConcreteValue, clipInterpolationCompatible } from "./concrete.js";

export const emptyAnimationPartitions = length => Object.freeze({ groups: Object.freeze([]), items: Object.freeze(Array(length).fill(null)) });
const geometryKeys = new Set(["x", "y", "width", "height", "commands", "fillBounds"]);
export const partitionAnimationPaint = properties => Object.fromEntries(Object.entries(properties).filter(([key]) => !geometryKeys.has(key)));
function roles(state) {
  const values = state.groups.map(() => new Set());
  for (const item of state.items) if (item !== null) values[item.group].add(JSON.stringify([item.key, item.role]));
  return values;
}
export function partitionTrackPreparation(from, to, a, b) {
  const pairs = [], indices = new Map(), aRoles = roles(a), bRoles = roles(b); let work = 0;
  const track = match => {
    const source = a.items[match.sourceIndex], target = b.items[match.targetIndex];
    if (source === null && target === null) return undefined;
    const fade = reason => ({ ...match, kind: "crossfade", reason });
    if (source === null || target === null) return fade("unsupported-family");
    if (source.reason || target.reason) return fade(source.reason ?? target.reason);
    const first = from.scene.nodes[match.sourceIndex], last = to.scene.nodes[match.targetIndex];
    if (source.role !== target.role || (source.role === "label" ? first.type !== "text" || last.type !== "text" : ![first.type, last.type].every(type => type === "rect" || type === "path"))) return fade("primitive-kind");
    if (!clipInterpolationCompatible(first, last)) return fade("clip-topology");
    const key = JSON.stringify([source.group, target.group]); let pair = indices.get(key);
    if (pair === undefined) {
      for (const group of [a.groups[source.group], b.groups[target.group]]) validateWorkLimit(work += partitionAnimationGroupWork(group) * 4, "Partition animation track work");
      const firstRoles = aRoles[source.group], lastRoles = bRoles[target.group], visibility = firstRoles.size !== lastRoles.size || [...firstRoles].some(role => !lastRoles.has(role));
      const plan = preparePartitionAnimationState(a.groups[source.group].meaning, b.groups[target.group].meaning);
      pair = pairs.length; indices.set(key, pair); pairs.push({ sourceGroup: source.group, targetGroup: target.group, plan, ...(visibility ? { reason: "visibility" } : {}) });
    }
    const prepared = pairs[pair], reason = prepared.reason ?? prepared.plan.reason ?? (prepared.plan.track.mode === "crossfade" ? prepared.plan.track.reason : undefined);
    if (reason) return fade(reason);
    if (sameConcreteValue(a.groups[source.group], b.groups[target.group]) && sameConcreteValue(first, last)) return { ...match, kind: "exact" };
    if (typeof first.properties.fill === "object" || typeof last.properties.fill === "object" || !sameConcreteValue(partitionAnimationPaint(first.properties), partitionAnimationPaint(last.properties))) return fade("appearance");
    return { ...match, kind: "semantic-partition", pair };
  };
  return { pairs, track };
}
export function partitionTrackSamples(state, progress) {
  const sampled = new Map();
  return index => {
    if (!sampled.has(index)) {
      const pair = state.pairs[index], sample = samplePartitionAnimationState(pair.plan, progress);
      if (sample.mode !== "partition") sampled.set(index, { reason: sample.reason });
      else {
        const from = state.from.groups[pair.sourceGroup], to = state.to.groups[pair.targetGroup];
        const group = cloneAndFreeze({ ...to, meaning: sample.state, labelOffset: from.labelOffset.map((value, i) => interpolateNumber(value, to.labelOffset[i], progress)) });
        sampled.set(index, { group, geometry: resolvePartitionAnimationGeometry(group) });
      }
    }
    return sampled.get(index);
  };
}
export function samplePartitionTrack(sampled, item) {
  if (sampled.reason) return sampled;
  return partitionAnimationItemGeometry(sampled.group, item, sampled.geometry) ?? { reason: "partition-collapsed-cell" };
}
export function partitionFrameCollector() {
  const groups = [], items = [], indices = new Map(); let work = 0;
  const append = (group, item) => {
    if (item === null) { items.push(null); return; }
    let index = indices.get(group);
    if (index === undefined) {
      validateWorkLimit(work += partitionAnimationGroupWork(group), "Partition animation frame work");
      index = groups.length; indices.set(group, index); groups.push(group);
    }
    items.push({ ...item, group: index });
  };
  return { append, finish: () => cloneAndFreeze({ groups, items }) };
}
