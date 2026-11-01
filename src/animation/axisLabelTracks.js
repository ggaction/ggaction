import { cloneAndFreeze } from "../core/immutable.js";
import { validateWorkLimit } from "../core/validation.js";
import { animationOwnerKey } from "../grammar/animation/ownerKey.js";
import { prepareAxisLabelReflowPair, sampleAxisLabelReflow, resolveAxisLabelReflow } from "../materialization/animation/axisLabelReflowState.js";
import { resolveAxisLabelGroup } from "../materialization/animation/axisLabelGroups.js";
import { prepareAnimationAppearance, sampleAnimationAppearance } from "./appearance.js";
import { sameConcreteValue, clipInterpolationCompatible, interpolateNodeFrame } from "./concrete.js";

const prepared = new WeakSet();
const indices = state => {
  const groups = state.groups.map(() => []);
  state.items.forEach((item, index) => { if (item !== null) groups[item.group].push(index); });
  return groups;
};
export function prepareAxisLabelTracks(from, to) {
  const previous = new Map(from.groups.map((group, index) => [group.key, index]));
  const sourceIndices = indices(from), targetIndices = indices(to), groups = [], failures = new Map();
  for (const [targetGroup, target] of to.groups.entries()) {
    const sourceGroup = previous.get(target.key);
    if (sourceGroup === undefined) continue;
    const source = from.groups[sourceGroup];
    let reason = source.reason ?? target.reason;
    if (!sameConcreteValue(source.presentation.font, target.presentation.font)) reason ??= "guide-layout";
    if (!clipInterpolationCompatible(source.placement.frame, target.placement.frame)) reason ??= "clip-topology";
    const layout = prepareAxisLabelReflowPair(source.layout, target.layout);
    if (layout.kind === "crossfade") reason ??= layout.reason;
    const appearances = reason === undefined ? source.presentation.styles.map((style, index) => prepareAnimationAppearance(style, target.presentation.styles[index])) : [];
    reason ??= appearances.find(value => value.kind === "crossfade")?.reason;
    if (reason !== undefined) { failures.set(targetGroup, reason); continue; }
    groups.push({ sourceGroup, targetGroup, from: source, to: target, appearances,
      sourceIndices: sourceIndices[sourceGroup], targetIndices: targetIndices[targetGroup] });
  }
  const state = cloneAndFreeze({ groups }); prepared.add(state);
  const compatibleTo = new Set(groups.flatMap(group => group.targetIndices));
  return { state, compatibleTo, fallbackTrack(track) {
    const a = from.items[track.sourceIndex], b = to.items[track.targetIndex];
    if (a === null && b === null) return track;
    return { ...track, kind: "crossfade", reason: b === null ? "guide-layout" : failures.get(b.group) ?? "guide-layout" };
  } };
}

// This is the only current native layout evaluation for a prepared group. The
// same output and bounds are consumed by drawing and dependent guide owners.
export function sampleAxisLabelTracks(state, progress, accountWork, timeline) {
  if (!prepared.has(state)) throw new TypeError("Axis label sampling requires authentic prepared groups.");
  let work = 0;
  const account = amount => { validateWorkLimit(work += amount, "Axis label sample work"); accountWork?.(amount); };
  return state.groups.flatMap(pair => {
    const current = timeline?.progress(animationOwnerKey(pair.to.scope.namespaces, pair.to.scope.owner)) ?? progress;
    const sampled = sampleAxisLabelReflow(pair.from.layout, pair.to.layout, current, account);
    if (sampled.kind === "crossfade") return [];
    const group = cloneAndFreeze({ ...pair.to, layout: sampled.layout,
      presentation: { ...pair.to.presentation, styles: pair.appearances.map((style, index) => ({ ...pair.to.presentation.styles[index], ...sampleAnimationAppearance(style, current) })) },
      placement: { ...pair.to.placement, frame: interpolateNodeFrame(pair.from.placement.frame, pair.to.placement.frame, current) } });
    const { labelBounds, requiredBounds } = resolveAxisLabelReflow(group.layout);
    return [{ ...pair, group, graphics: resolveAxisLabelGroup(group), labelBounds, requiredBounds }];
  });
}
