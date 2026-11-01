import { normalizeAxisTitleAnimationState, axisTitleAnimationMatchesNode, axisTitleAnimationLabels, prepareAxisTitleInterpolation, sampleAxisTitleInterpolation } from "../materialization/animation/axisTitleState.js";
import { normalizeLegendGroupAnimationState, legendGroupAnimationKeys, legendGroupAnimationMatchesNode, prepareLegendGroupInterpolation, sampleLegendGroupInterpolation } from "../materialization/animation/legendGroupState.js";
import { normalizeCategoricalLegendAnimationState, categoricalLegendAnimationMatchesNode, prepareCategoricalLegendInterpolation, sampleCategoricalLegendInterpolation } from "../materialization/animation/categoricalLegendState.js";
import { normalizeSizeLegendAnimationState, sizeLegendAnimationMatchesNode, prepareSizeLegendInterpolation, sampleSizeLegendInterpolation } from "../materialization/animation/sizeLegendState.js";
import { normalizeAxisLabelAnimationState, axisLabelAnimationMatchesNode, prepareAxisLabelInterpolation, sampleAxisLabelInterpolation } from "../materialization/animation/axisLabelState.js";
import { normalizeLegendAnimationState, legendAnimationMatchesNode, prepareLegendInterpolation, sampleLegendInterpolation } from "../materialization/animation/legendState.js";
import { prepareAnimationAppearance } from "./appearance.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { validateWorkLimit } from "../core/validation.js";
import { guideAnimationKey, normalizeGuideAnimationState, guideAnimationMatchesNode, prepareGuideInterpolation, sampleGuideInterpolation as sampleNativeGuide } from "../grammar/animation/guideState.js";
import { sameConcreteValue, clipInterpolationCompatible } from "./concrete.js";

const normalizeState = state => state.kind === "title-layout" ? normalizeAxisTitleAnimationState(state) : state.kind === "legend-group" ? normalizeLegendGroupAnimationState(state) : state.kind === "categorical-legend" ? normalizeCategoricalLegendAnimationState(state) : state.kind === "size-legend" ? normalizeSizeLegendAnimationState(state) : state.kind === "legend" ? normalizeLegendAnimationState(state)
  : state.kind === "label-layout" ? normalizeAxisLabelAnimationState(state) : normalizeGuideAnimationState(state);
const matchesNode = (state, node) => (state.kind === "title-layout" ? axisTitleAnimationMatchesNode : state.kind === "legend-group" ? legendGroupAnimationMatchesNode : state.kind === "categorical-legend" ? categoricalLegendAnimationMatchesNode : state.kind === "size-legend" ? sizeLegendAnimationMatchesNode : state.kind === "legend" ? legendAnimationMatchesNode
  : state.kind === "label-layout" ? axisLabelAnimationMatchesNode : guideAnimationMatchesNode)(state, node);
export const emptyAnimationGuides = endpoint => Object.freeze(endpoint.scene.nodes.map(() => null));
export const hasAnimationGuides = states => states.some(state => state !== null);
export function validateAnimationGuides(states, endpoint) {
  ownArray(states, "Animation guide states");
  if (states.length !== endpoint.scene.nodes.length) throw new TypeError("Guide states must follow exact endpoint node order.");
  const groups = new Map(), labelOwners = new Map(), titleOwners = new Set();
  const normalized = states.map((input, index) => {
    if (input === null) return null;
    ownRecord(input, "Animation guide state");
    const state = normalizeState(input);
    if (endpoint.identities[index] !== undefined || endpoint.backgrounds?.some(entry => entry.index === index)) throw new TypeError("A guide cannot replace native mark identity.");
    if (state.reason === undefined && !matchesNode(state, endpoint.scene.nodes[index])) {
      throw new TypeError("Guide animation meaning differs from its concrete endpoint.");
    }
    if (state.kind === "title-layout") {
      const owner = JSON.stringify([state.identity.namespaces, state.identity.owner]);
      if (titleOwners.has(owner)) throw new TypeError("Dependent title requires one native title per axis.");
      titleOwners.add(owner);
    }
    if (state.identity.component === "labels") {
      const owner = JSON.stringify([state.identity.namespaces, state.identity.owner]);
      if (!labelOwners.has(owner)) labelOwners.set(owner, []);
      labelOwners.get(owner).push(state);
    }
    if (state.kind === "legend-group") {
      const owner = JSON.stringify([state.identity.namespaces, state.identity.owner]);
      const previous = groups.get(owner);
      if (previous === undefined) groups.set(owner, { state, keys: [guideAnimationKey(state.identity)] });
      else {
        if (previous.state.layout !== state.layout && !sameConcreteValue(previous.state.layout, state.layout)) throw new TypeError("Dependent legend components require one group meaning.");
        previous.keys.push(guideAnimationKey(state.identity));
      }
    }
    return state;
  });
  for (const { state, keys } of groups.values()) {
    if (!sameConcreteValue(keys.sort(), legendGroupAnimationKeys(state).sort())) throw new TypeError("Dependent legend components require the complete group.");
  }
  for (const state of normalized) {
    if (state?.kind !== "title-layout") continue;
    const siblings = labelOwners.get(JSON.stringify([state.identity.namespaces, state.identity.owner])) ?? [];
    const expected = axisTitleAnimationLabels(state);
    const byKey = new Map(siblings.map(item => [guideAnimationKey(item.identity), item]));
    if (siblings.length !== expected.length || byKey.size !== siblings.length || expected.some(item => !sameConcreteValue(item, byKey.get(guideAnimationKey(item.identity))))) {
      throw new TypeError("Dependent title requires its complete native label meaning.");
    }
  }
  return cloneAndFreeze(normalized);
}
function indexStates(states) {
  const index = new Map();
  let work = 0;
  states.forEach((state, position) => {
    if (state === null) return;
    const key = guideAnimationKey(state.identity);
    validateWorkLimit(work += 1 + key.length, "Animation guide correspondence work");
    const previous = index.get(key);
    // Duplicated raw values have no unique correspondence. Retain their native
    // nodes as separate enters/exits instead of silently choosing either one.
    if (previous === undefined) index.set(key, [position]);
    else previous.push(position);
  });
  return index;
}
function prepareTrack(match, from, to, a, b) {
  const source = from.scene.nodes[match.sourceIndex], target = to.scene.nodes[match.targetIndex];
  const fade = reason => ({ ...match, kind: "crossfade", reason });
  if (a.reason !== undefined || b.reason !== undefined) return fade(a.reason ?? b.reason);
  if (source.type !== target.type) return fade("primitive-kind");
  if (source.topology !== target.topology) return fade("topology");
  if (sameConcreteValue(source, target) && sameConcreteValue(a, b)) return { ...match, kind: "exact" };
  if (!clipInterpolationCompatible(source, target)) return fade("clip-topology");
  const appearance = properties => Object.fromEntries(Object.entries(properties).filter(([key]) =>
    !["x", "y", "x1", "x2", "y1", "y2", "commands", "textAlign", "textBaseline", ...(["categorical-legend", "legend-group"].includes(a.kind) ? ["width", "height", "radius"] : a.kind === "legend" ? ["width", "height"] : a.kind === "size-legend" ? ["radius"] : [])].includes(key)));
  const style = prepareAnimationAppearance(appearance(source.properties), appearance(target.properties));
  if (style.kind === "crossfade") return fade(style.reason);
  const guide = a.kind !== b.kind ? { kind: "crossfade", reason: "guide-policy" }
    : a.kind === "title-layout" ? prepareAxisTitleInterpolation(a, b)
    : a.kind === "legend-group" ? prepareLegendGroupInterpolation(a, b)
    : a.kind === "categorical-legend" ? prepareCategoricalLegendInterpolation(a, b)
    : a.kind === "size-legend" ? prepareSizeLegendInterpolation(a, b)
    : a.kind === "legend" ? prepareLegendInterpolation(a, b)
    : a.kind === "label-layout" ? prepareAxisLabelInterpolation(a, b) : prepareGuideInterpolation(a, b);
  return guide.kind === "crossfade" ? fade(guide.reason) : { ...match, kind: "semantic-guide", guide, appearance: style };
}
export function prepareGuideTracks(from, to) {
  const a = from.guides ?? emptyAnimationGuides(from), b = to.guides ?? emptyAnimationGuides(to);
  const sources = indexStates(a), targets = indexStates(b), tracks = [], ambiguous = { source: [], target: [] };
  for (const [guideKey, indices] of sources) {
    const matches = targets.get(guideKey);
    if (indices.length !== 1 || matches !== undefined && matches.length !== 1) {
      ambiguous.source.push(...indices);
      if (matches !== undefined) ambiguous.target.push(...matches);
      continue;
    }
    if (matches === undefined) continue;
    const sourceIndex = indices[0], targetIndex = matches[0];
    tracks.push(prepareTrack({ guideKey, role: `guide-${a[sourceIndex].identity.component}`, sourceIndex, targetIndex }, from, to, a[sourceIndex], b[targetIndex]));
  }
  for (const [key, indices] of targets) if (!sources.has(key) && indices.length !== 1) ambiguous.target.push(...indices);
  const trackByKey = new Map(tracks.map(track => [track.guideKey, track]));
  const dependent = tracks.map(track => {
    const state = a[track.sourceIndex];
    if (state.kind !== "title-layout" || !["exact", "semantic-guide"].includes(track.kind)) return track;
    const complete = axisTitleAnimationLabels(state).every(label => {
      const sibling = trackByKey.get(guideAnimationKey(label.identity));
      return sibling !== undefined && ["exact", "semantic-guide"].includes(sibling.kind);
    });
    return complete ? track : { sourceIndex: track.sourceIndex, targetIndex: track.targetIndex,
      guideKey: track.guideKey, role: track.role, kind: "crossfade", reason: "guide-layout" };
  });
  return cloneAndFreeze({ tracks: dependent, ambiguous });
}

// The sampler delegates native guide meaning to its owning materializer. The
// public sampler imports this wrapper, not a second layout implementation.
export function sampleGuideInterpolation(plan, progress) {
  return plan.from?.kind === "title-layout" ? sampleAxisTitleInterpolation(plan, progress) : plan.from?.kind === "legend-group" ? sampleLegendGroupInterpolation(plan, progress) : plan.from?.kind === "categorical-legend" ? sampleCategoricalLegendInterpolation(plan, progress) : plan.from?.kind === "size-legend" ? sampleSizeLegendInterpolation(plan, progress) : plan.from?.kind === "legend" ? sampleLegendInterpolation(plan, progress)
    : plan.from?.kind === "label-layout" ? sampleAxisLabelInterpolation(plan, progress) : sampleNativeGuide(plan, progress);
}
