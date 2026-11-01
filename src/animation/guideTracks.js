import { axisLabelDependencyGroup, axisLabelDependencySnapshot, axisLabelDependencyKeys, axisLabelDependencyInk } from "../materialization/animation/axisLabelDependencies.js";
import { normalizeLegendAxisLaneState, legendAxisLaneKeys, legendAxisReferenceKeys, legendAxisLaneMatchesNode, prepareLegendAxisLaneInterpolation, sampleLegendAxisLaneInterpolation } from "../materialization/animation/legendAxisLaneState.js";
import { guideAnimationOwnerKey } from "../grammar/animation/ownerKey.js";
import { sampleAnimationAppearance } from "./appearance.js";
import { interpolateNodeFrame } from "./concrete.js";
import { normalizeLegendLaneAnimationState, legendLaneAnimationKeys, legendLaneAnimationMatchesNode, prepareLegendLaneInterpolation, sampleLegendLaneInterpolation } from "../materialization/animation/legendLaneState.js";
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

const normalizeState = state => state.kind === "legend-axis-lane" ? normalizeLegendAxisLaneState(state) : state.kind === "legend-lane" ? normalizeLegendLaneAnimationState(state) : state.kind === "title-layout" ? normalizeAxisTitleAnimationState(state) : state.kind === "legend-group" ? normalizeLegendGroupAnimationState(state) : state.kind === "categorical-legend" ? normalizeCategoricalLegendAnimationState(state) : state.kind === "size-legend" ? normalizeSizeLegendAnimationState(state) : state.kind === "legend" ? normalizeLegendAnimationState(state)
  : state.kind === "label-layout" ? normalizeAxisLabelAnimationState(state) : normalizeGuideAnimationState(state);
const matchesNode = (state, node, currentLabels) => (state.kind === "legend-lane" ? legendLaneAnimationMatchesNode : state.kind === "title-layout" ? axisTitleAnimationMatchesNode : state.kind === "legend-group" ? legendGroupAnimationMatchesNode : state.kind === "categorical-legend" ? categoricalLegendAnimationMatchesNode : state.kind === "size-legend" ? sizeLegendAnimationMatchesNode : state.kind === "legend" ? legendAnimationMatchesNode
  : state.kind === "label-layout" ? axisLabelAnimationMatchesNode : guideAnimationMatchesNode)(state, node, currentLabels);
export const emptyAnimationGuides = endpoint => Object.freeze(endpoint.scene.nodes.map(() => null));
export const hasAnimationGuides = states => states.some(state => state !== null);
const dependentLegend = state => ["legend-group", "legend-lane", "legend-axis-lane"].includes(state?.kind);
const dependentLegendKey = state => JSON.stringify([state.identity.namespaces, state.kind, ["legend-lane", "legend-axis-lane"].includes(state.kind) ? state.layout.edge : state.identity.owner]);
const dependentLegendKeys = state => (state.kind === "legend-axis-lane" ? legendAxisLaneKeys(state) : state.kind === "legend-lane" ? legendLaneAnimationKeys(state) : legendGroupAnimationKeys(state)).sort();
const axisOwnerKey = state => JSON.stringify([state.identity.namespaces, state.identity.owner]);

function titleDependency(state, axislabels) {
  const key = state.layout?.labels?.group;
  if (key === undefined) return undefined;
  const group = axisLabelDependencyGroup(axislabels, key);
  if (group === undefined || group.reason !== undefined || group.scope.channel !== state.layout.anchor.channel ||
      group.layout.config.base.position !== state.layout.anchor.policy.side || !sameConcreteValue(group.layout.frame, state.layout.frame) ||
      !sameConcreteValue(group.layout.canvas, state.layout.canvas)) return undefined;
  return group;
}
const sameLabelGroupRefs = (state, axislabels) => sameConcreteValue(axisLabelDependencyKeys(axislabels, state.identity.namespaces, state.layout.edge), state.labelGroups ?? []);
// A sampled fade or unmatched exit can retain only part of a dependent native
// layout. Keep its identity, but never claim that incomplete geometry is a new
// typed endpoint. Independent components retain their original meaning.
export function retainSampledGuideMeaning(states, axislabels) {
  const groups = new Map(), labels = new Map(), unavailable = new Set();
  for (const state of states) {
    if (dependentLegend(state)) {
      const key = dependentLegendKey(state);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(state);
    }
    if (state?.identity.component === "labels") {
      const key = axisOwnerKey(state);
      if (!labels.has(key)) labels.set(key, []);
      labels.get(key).push(state);
    }
  }
  for (const siblings of groups.values()) {
    const first = siblings[0], keys = siblings.map(state => guideAnimationKey(state.identity)).sort();
    if (!sameConcreteValue(keys, dependentLegendKeys(first)) || siblings.some(state => !sameConcreteValue(state.layout, first.layout) || !sameConcreteValue(state.axes, first.axes) || !sameConcreteValue(state.offsets, first.offsets) || !sameConcreteValue(state.labelGroups, first.labelGroups))) {
      for (const state of siblings) unavailable.add(state);
    }
  }
  for (const state of states) {
    if (state?.kind !== "title-layout" || state.layout.clearance.kind === "fixed") continue;
    if (state.layout.labels?.group !== undefined) { if (titleDependency(state, axislabels) === undefined) unavailable.add(state); continue; }
    const siblings = labels.get(axisOwnerKey(state)) ?? [], expected = axisTitleAnimationLabels(state);
    const byKey = new Map(siblings.map(item => [guideAnimationKey(item.identity), item]));
    if (siblings.length !== expected.length || byKey.size !== siblings.length || expected.some(item => !sameConcreteValue(item, byKey.get(guideAnimationKey(item.identity))))) unavailable.add(state);
  }
  for (const state of states) if (state?.kind === "legend-axis-lane") {
    if (!sameConcreteValue(legendAxisReferenceKeys(states, state.identity.namespaces, state.layout.edge, axislabels), state.axes) || !sameLabelGroupRefs(state, axislabels)) unavailable.add(state);
  }
  return unavailable.size === 0 ? states : cloneAndFreeze(states.map(state => unavailable.has(state) ? { identity: state.identity, reason: "guide-unavailable" } : state));
}
export function validateAnimationGuides(states, endpoint, axislabels) {
  ownArray(states, "Animation guide states");
  if (states.length !== endpoint.scene.nodes.length) throw new TypeError("Guide states must follow exact endpoint node order.");
  const groups = new Map(), labelOwners = new Map(), titleOwners = new Set();
  const normalized = states.map((input, index) => {
    if (input === null) return null;
    ownRecord(input, "Animation guide state");
    const state = normalizeState(input);
    if (endpoint.identities[index] !== undefined || endpoint.backgrounds?.some(entry => entry.index === index)) throw new TypeError("A guide cannot replace native mark identity.");
    if (state.reason === undefined && state.kind !== "legend-axis-lane" && !matchesNode(state, endpoint.scene.nodes[index], axisLabelDependencyInk(axisLabelDependencySnapshot(titleDependency(state, axislabels)), endpoint.scene.nodes[index]))) {
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
    if (dependentLegend(state)) {
      const owner = dependentLegendKey(state);
      const previous = groups.get(owner);
      if (previous === undefined) groups.set(owner, { state, keys: [guideAnimationKey(state.identity)] });
      else {
        if (previous.state.layout !== state.layout && !sameConcreteValue(previous.state.layout, state.layout) || !sameConcreteValue(previous.state.axes, state.axes) || !sameConcreteValue(previous.state.offsets, state.offsets) || !sameConcreteValue(previous.state.labelGroups, state.labelGroups)) throw new TypeError("Dependent legend components require one group meaning.");
        previous.keys.push(guideAnimationKey(state.identity));
      }
    }
    return state;
  });
  let dependencyWork = 0;
  for (const [index, state] of normalized.entries()) {
    if (state?.kind !== "legend-axis-lane") continue;
    validateWorkLimit(dependencyWork += normalized.length * 2 + state.axes.length, "Legend axis endpoint proof work");
    if (!sameConcreteValue(legendAxisReferenceKeys(normalized, state.identity.namespaces, state.layout.edge, axislabels), state.axes) || !sameLabelGroupRefs(state, axislabels)) throw new TypeError("Legend lane axis references must match the complete endpoint.");
    const references = new Set(state.axes);
    const dependencies = normalized.flatMap((axis, position) => axis !== null && references.has(guideAnimationKey(axis.identity)) ? [{ state: axis, node: endpoint.scene.nodes[position] }] : []);
    if (!legendAxisLaneMatchesNode(state, endpoint.scene.nodes[index], dependencies, (state.labelGroups ?? []).map(key => ({ key, current: axisLabelDependencySnapshot(axisLabelDependencyGroup(axislabels, key)) })))) throw new TypeError("Legend axis meaning differs from its concrete endpoint.");
  }
  for (const { state, keys } of groups.values()) {
    if (!sameConcreteValue(keys.sort(), dependentLegendKeys(state))) throw new TypeError("Dependent legend components require the complete group.");
  }
  for (const state of normalized) {
    if (state?.kind !== "title-layout" || state.layout.clearance.kind === "fixed") continue;
    if (state.layout.labels?.group !== undefined) { if (titleDependency(state, axislabels) === undefined) throw new TypeError("Dependent title requires its current exact label group."); continue; }
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
  if (a.kind !== "legend-axis-lane" && a.layout?.labels?.group === undefined && sameConcreteValue(source, target) && sameConcreteValue(a, b)) return { ...match, kind: "exact" };
  if (!clipInterpolationCompatible(source, target)) return fade("clip-topology");
  const appearance = properties => Object.fromEntries(Object.entries(properties).filter(([key]) =>
    !["x", "y", "x1", "x2", "y1", "y2", "commands", "textAlign", "textBaseline", ...(["categorical-legend", "legend-group", "legend-lane", "legend-axis-lane"].includes(a.kind) ? ["width", "height", "radius"] : a.kind === "legend" ? ["width", "height"] : a.kind === "size-legend" ? ["radius"] : [])].includes(key)));
  const style = prepareAnimationAppearance(appearance(source.properties), appearance(target.properties));
  if (style.kind === "crossfade") return fade(style.reason);
  const guide = a.kind !== b.kind ? { kind: "crossfade", reason: "guide-policy" }
    : a.kind === "legend-axis-lane" ? prepareLegendAxisLaneInterpolation(a, b)
    : a.kind === "legend-lane" ? prepareLegendLaneInterpolation(a, b)
    : a.kind === "title-layout" ? prepareAxisTitleInterpolation(a, b)
    : a.kind === "legend-group" ? prepareLegendGroupInterpolation(a, b)
    : a.kind === "categorical-legend" ? prepareCategoricalLegendInterpolation(a, b)
    : a.kind === "size-legend" ? prepareSizeLegendInterpolation(a, b)
    : a.kind === "legend" ? prepareLegendInterpolation(a, b)
    : a.kind === "label-layout" ? prepareAxisLabelInterpolation(a, b) : prepareGuideInterpolation(a, b);
  return guide.kind === "crossfade" ? fade(guide.reason) : { ...match, kind: "semantic-guide", guide, appearance: style };
}
const axisDependencies = new WeakMap(), dependencySamples = new WeakMap(), titleFrames = new WeakMap();
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
  const preparedAxes = new Map();
  let dependencyWork = 0;
  const dependent = tracks.map(track => {
    const state = a[track.sourceIndex];
    if (state.kind === "legend-axis-lane" && track.kind === "semantic-guide") {
      const references = [...legendAxisLaneKeys(state), ...state.axes];
      validateWorkLimit(dependencyWork += references.length, "Legend axis preparation work");
      const complete = references.every(key => ["exact", "semantic-guide"].includes(trackByKey.get(key)?.kind)) &&
        sameLabelGroupRefs(state, from.axislabels) && sameLabelGroupRefs(b[track.targetIndex], to.axislabels);
      if (!complete) return { sourceIndex: track.sourceIndex, targetIndex: track.targetIndex,
        guideKey: track.guideKey, role: track.role, kind: "crossfade", reason: "guide-layout" };
      const group = JSON.stringify([state.axes, state.labelGroups]);
      if (!preparedAxes.has(group)) preparedAxes.set(group, state.axes.map(key => {
        const dependency = trackByKey.get(key);
        return { track: dependency, state: b[dependency.targetIndex], ownerKey: guideAnimationOwnerKey(b[dependency.targetIndex].identity),
          from: from.scene.nodes[dependency.sourceIndex], to: to.scene.nodes[dependency.targetIndex] };
      }));
      axisDependencies.set(track.guide, { labelGroups: state.labelGroups ?? [], axes: preparedAxes.get(group), from: from.scene.nodes[track.sourceIndex], to: to.scene.nodes[track.targetIndex] });
      return track;
    }
    if (state.kind === "legend-lane" && ["exact", "semantic-guide"].includes(track.kind)) {
      const complete = legendLaneAnimationKeys(state).every(key => ["exact", "semantic-guide"].includes(trackByKey.get(key)?.kind));
      return complete ? track : { sourceIndex: track.sourceIndex, targetIndex: track.targetIndex,
        guideKey: track.guideKey, role: track.role, kind: "crossfade", reason: "guide-layout" };
    }
    if (state.kind !== "title-layout" || state.layout.clearance.kind === "fixed" || !["exact", "semantic-guide"].includes(track.kind)) return track;
    const complete = state.layout.labels?.group !== undefined ? titleDependency(state, from.axislabels) !== undefined && titleDependency(b[track.targetIndex], to.axislabels) !== undefined : axisTitleAnimationLabels(state).every(label => {
      const sibling = trackByKey.get(guideAnimationKey(label.identity));
      return sibling !== undefined && ["exact", "semantic-guide"].includes(sibling.kind);
    });
    if (complete && state.layout.labels?.group !== undefined && track.kind === "semantic-guide") titleFrames.set(track.guide, { from: from.scene.nodes[track.sourceIndex], to: to.scene.nodes[track.targetIndex] });
    return complete ? track : { sourceIndex: track.sourceIndex, targetIndex: track.targetIndex,
      guideKey: track.guideKey, role: track.role, kind: "crossfade", reason: "guide-layout" };
  });
  return cloneAndFreeze({ tracks: dependent, ambiguous });
}

// The sampler delegates native guide meaning to its owning materializer. The
// public sampler imports this wrapper, not a second layout implementation.
export function sampleGuideInterpolation(plan, progress, context) {
  if (plan.from?.kind === "legend-axis-lane") {
    const prepared = axisDependencies.get(plan);
    if (prepared === undefined) throw new TypeError("Dependent lane requires exact prepared axis kernels.");
    const cached = context === undefined ? undefined : dependencySamples.get(context)?.get(prepared.axes);
    let samples = cached?.samples, labels = cached?.labels;
    if (samples === undefined) {
      samples = [];
      for (const dependency of prepared.axes) {
        const current = context?.progress(dependency.ownerKey) ?? progress, track = dependency.track;
        let state = dependency.state, node = dependency.to;
        if (track.kind === "semantic-guide") {
          const sampled = sampleGuideInterpolation(track.guide, current, context);
          if (sampled.kind !== "guide") return { kind: "crossfade", reason: "guide-layout" };
          state = sampled.state;
          node = cloneAndFreeze({ ...dependency.to, properties: { ...dependency.to.properties, ...sampleAnimationAppearance(track.appearance, current), ...sampled.properties },
            ...interpolateNodeFrame(dependency.from, dependency.to, current) });
        }
        samples.push({ state, node: context?.node(node, track.targetIndex) ?? node });
      }
      samples = cloneAndFreeze(samples);
      labels = cloneAndFreeze(prepared.labelGroups.map(key => ({ key, current: context?.axisLabelGroup?.(key) })));
      if (context !== undefined) {
        if (!dependencySamples.has(context)) dependencySamples.set(context, new WeakMap());
        dependencySamples.get(context).set(prepared.axes, { samples, labels });
      }
    }
    if (labels.some(item => item.current === undefined)) return { kind: "crossfade", reason: "guide-layout" };
    return sampleLegendAxisLaneInterpolation(plan, progress, samples, { ...prepared.to, ...interpolateNodeFrame(prepared.from, prepared.to, progress) }, labels, context?.accountWork);
  }
  if (plan.from?.kind === "title-layout" && plan.from.layout.labels?.group !== undefined) {
    const current = context?.axisLabelGroup?.(plan.from.layout.labels.group);
    if (current !== undefined) context?.accountWork?.(1 + current.labelBounds.length + plan.from.layout.text.length);
    const frames = titleFrames.get(plan);
    if (frames === undefined) throw new TypeError("Dependent title requires its exact prepared scene frame.");
    const node = { ...frames.to, ...interpolateNodeFrame(frames.from, frames.to, progress) };
    return sampleAxisTitleInterpolation(plan, progress, axisLabelDependencyInk(current, node, context?.accountWork));
  }
  return plan.from?.kind === "legend-lane" ? sampleLegendLaneInterpolation(plan, progress) : plan.from?.kind === "title-layout" ? sampleAxisTitleInterpolation(plan, progress, context?.axisLabelGroup?.(plan.from.layout.labels?.group)) : plan.from?.kind === "legend-group" ? sampleLegendGroupInterpolation(plan, progress) : plan.from?.kind === "categorical-legend" ? sampleCategoricalLegendInterpolation(plan, progress) : plan.from?.kind === "size-legend" ? sampleSizeLegendInterpolation(plan, progress) : plan.from?.kind === "legend" ? sampleLegendInterpolation(plan, progress)
    : plan.from?.kind === "label-layout" ? sampleAxisLabelInterpolation(plan, progress) : sampleNativeGuide(plan, progress);
}
