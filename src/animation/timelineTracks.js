import { cloneAndFreeze } from '../core/immutable.js';
import { ownArray, ownRecord } from '../core/ownData.js';
import { rejectUnknownProperties, validateGeneratedItemLimit, validateNonNegativeFinite, validateUnitInterval, validateWorkLimit } from '../core/validation.js';
import { parsePaintColor } from '../grammar/color.js';
import { animationOwnerKey, graphicAnimationOwnerKey, guideAnimationOwnerKey, validateAnimationOwnerKey } from '../grammar/animation/ownerKey.js';
import { prepareTimelineSchedule, sampleTimelineSchedule, ANIMATION_TIMELINE_VERSION } from '../grammar/animation/timeline.js';
import { easeProgress } from '../grammar/animation/values.js';
import { geoAnimationItemKey } from '../materialization/animation/geoPresentation.js';

const prepared = new WeakMap();
const styleProperties = new Set(['fill', 'stroke', 'opacity', 'strokeWidth']);
const styleValues = properties => Object.fromEntries(Object.entries(properties).filter(([key]) => styleProperties.has(key)));
function closed(value, keys, label, required = []) {
  ownRecord(value, label); rejectUnknownProperties(value, keys, label);
  if (required.some(key => !Object.hasOwn(value,key))) throw new TypeError(`${label} requires its own declared fields.`);
}
function styleValue(style, property) {
  const value = Object.hasOwn(style,property) ? style[property] : undefined;
  return property === 'opacity' && value === undefined ? 1 : value;
}
function color(value) {
  if (value === 'none') return [0, 0, 0, 0];
  const { r, g, b, a } = parsePaintColor(value); return [r, g, b, a];
}
function sameValue(a, b) {
  return Array.isArray(a) ? Array.isArray(b) && a.length === b.length && a.every((value, index) => Math.abs(value - b[index]) <= 1e-12) : a === b;
}
function ownerOfGeo(geometry) {
  const [namespaces, owner] = JSON.parse(geometry.key); return animationOwnerKey(namespaces, owner);
}

// Native adapters supply admitted endpoint vectors and exact correspondence.
// The timeline stores only binding identities/indices and endpoint property
// values, never the programs, scenes, or a preceding plan.
function targetIndex(context, spend) {
  const owners = new Set(), items = new Map(), guides = new Map();
  const addOwner = owner => { spend(owner.length + 1); owners.add(owner); };
  const add = (map, key, value) => {
    spend(key.length + value.id.length + 1);
    if (!map.has(key)) map.set(key, []); map.get(key).push(value);
  };
  for (const side of ['from', 'to']) {
    for (const identity of context[side].identities) if (identity !== undefined) addOwner(graphicAnimationOwnerKey(identity));
    for (const state of context.guides[side]) if (state !== null) addOwner(guideAnimationOwnerKey(state.identity));
    for (const group of context.geos[side].groups) addOwner(ownerOfGeo(group.presentation.geometry));
    for (const group of context.geotexts?.[side].groups ?? []) addOwner(validateAnimationOwnerKey(group.presentation.key));
  }
  for (const track of context.tracks) {
    const from = context.from.scene.nodes[track.sourceIndex], to = context.to.scene.nodes[track.targetIndex];
    const compatible = track.kind !== 'crossfade';
    if (Object.hasOwn(track,'guideKey') && track.guideKey !== undefined) {
      add(guides, track.guideKey, { id: JSON.stringify(['guide', track.guideKey]), kind: 'guide', compatible,
        ownerKey: guideAnimationOwnerKey(context.guides.to[track.targetIndex].identity),
        sourceIndex: track.sourceIndex, targetIndex: track.targetIndex, from: styleValues(from.properties), to: styleValues(to.properties) });
    } else if (Object.hasOwn(track,'key') && track.key !== undefined && context.geos.from.items[track.sourceIndex] === null && context.geos.to.items[track.targetIndex] === null &&
        context.geotexts?.from.items[track.sourceIndex] == null && context.geotexts?.to.items[track.targetIndex] == null) {
      add(items, track.key, { id: JSON.stringify(['item', track.key, track.role]), kind: 'item', role: track.role, compatible,
        ownerKey: graphicAnimationOwnerKey(context.to.identities[track.targetIndex]),
        sourceIndex: track.sourceIndex, targetIndex: track.targetIndex, from: styleValues(from.properties), to: styleValues(to.properties) });
    }
  }
  // Geo paint follows a whole feature, including features without visible parts.
  // Use the admitted native pairs so appearance/topology fallbacks cannot be
  // bypassed by addressing one of their transient concrete parts.
  for (const pair of context.geos.state.groups) {
    const previousFeatures = new Map(pair.from.geometry.features.map((feature, index) => [feature.key, index]));
    for (const [index, feature] of pair.to.geometry.features.entries()) {
      const key = geoAnimationItemKey(pair.to.geometry, feature.key);
      const previous = previousFeatures.get(feature.key);
      add(items, key, { id: JSON.stringify(['geo', key]), kind: 'geo', compatible: true, ownerKey: ownerOfGeo(pair.to.geometry),
        sourceGroup: pair.sourceGroup, targetGroup: pair.targetGroup, featureKey: feature.key,
        from: styleValues(pair.from.styles[previous]), to: styleValues(pair.to.styles[index]) });
    }
  }
  for (const pair of context.geotexts?.state.groups ?? []) {
    const previous = new Map(pair.from.presentation.entries.map(entry => [entry.identity.key, entry]));
    for (const entry of pair.to.presentation.entries) {
      const key = entry.identity.key;
      add(items, key, { id: JSON.stringify(['geo-text', key]), kind: 'geo-text', compatible: true,
        role: entry.identity.role, ownerKey: pair.to.presentation.key, sourceGroup: pair.sourceGroup,
        targetGroup: pair.targetGroup, entryKey: key, from: styleValues(previous.get(key).properties), to: styleValues(entry.properties) });
      if (pair.to.presentation.leader !== false) add(items, key, { id: JSON.stringify(['geo-text-leader', key]), kind: 'geo-text-leader',
        role: 'leader', compatible: false });
    }
  }
  return { owners, items, guides };
}
function resolveTarget(input, geometry, index, spend) {
  closed(input, geometry ? ['ownerKey'] : ['itemKey', 'role', 'guideKey'], 'Timeline target', geometry ? ['ownerKey'] : []);
  if (geometry) {
    validateAnimationOwnerKey(input.ownerKey); spend(input.ownerKey.length);
    if (!index.owners.has(input.ownerKey)) throw new TypeError('Timeline geometry target has no exact native owner.');
    return { id: JSON.stringify(['owner', input.ownerKey]), kind: 'geometry', ownerKey: input.ownerKey, selector: { ownerKey: input.ownerKey } };
  }
  const guide = Object.hasOwn(input, 'guideKey');
  if (!guide && !Object.hasOwn(input,'itemKey')) throw new TypeError('Timeline style target requires its own exact item or guide key.');
  if (guide && (Object.hasOwn(input, 'itemKey') || Object.hasOwn(input, 'role'))) throw new TypeError('Timeline guide target cannot contain an item selector.');
  const key = guide ? input.guideKey : input.itemKey;
  if (typeof key !== 'string' || !key.length) throw new TypeError('Timeline style target requires an exact item or guide key.');
  spend(key.length);
  if (Object.hasOwn(input, 'role') && (typeof input.role !== 'string' || !input.role.length)) throw new TypeError('Timeline role must be a nonempty string.');
  if (Object.hasOwn(input, 'role')) spend(input.role.length);
  const candidates = (guide ? index.guides : index.items).get(key) ?? [];
  const matches = Object.hasOwn(input, 'role') ? candidates.filter(value => value.kind !== 'geo' && value.role === input.role) : candidates;
  if (matches.length !== 1 || !matches[0].compatible) throw new TypeError('Timeline style target requires one compatible native item and explicit role when ambiguous.');
  return { ...matches[0], selector: { ...input } };
}
function endpointValue(binding, property, kernel, side) {
  const value = property === 'geometry' ? side === 'from' ? 0 : 1 : styleValue(binding[side],property);
  if (kernel === 'rgba') {
    if (typeof value !== 'string') throw new TypeError('Timeline color requires simple paint at both native endpoints.');
    return color(value);
  }
  if (!Number.isFinite(value)) throw new TypeError('Timeline numeric property requires explicit finite native endpoint values.');
  return value;
}

export function prepareAnimationTimeline(input, context) {
  closed(input, ['durationMs', 'easing', 'tracks', 'markers', 'composite'], 'Animation timeline options', ['durationMs','easing']);
  validateNonNegativeFinite(input.durationMs, 'Timeline duration');
  easeProgress(.5, input.easing);
  if (input.easing === undefined) throw new TypeError('Timeline easing must be explicit.');
  let work = 0, count = 0;
  const spend = amount => validateWorkLimit(work += amount, 'Timeline target preparation work');
  const index = targetIndex(context, spend), bindings = new Map(), specs = [];
  const source = Object.hasOwn(input, 'tracks') ? input.tracks : [];
  ownArray(source, 'Animation timeline tracks'); validateGeneratedItemLimit(source.length, 'Animation timeline tracks');
  const tracks = source.map(track => {
    closed(track, ['target', 'property', 'kernel', 'keyframes', 'priority'], 'Animation timeline track', ['target','property','kernel','keyframes']);
    const geometry = track.property === 'geometry', colorTrack = track.property === 'fill' || track.property === 'stroke';
    if (!geometry && !styleProperties.has(track.property)) throw new TypeError('Unsupported animation timeline property.');
    if (geometry ? track.kernel !== 'native-progress' : colorTrack ? track.kernel !== 'color' : !['number', 'positive-scale'].includes(track.kernel)) throw new TypeError('Timeline kernel must match its native property.');
    const binding = resolveTarget(track.target, geometry, index, spend), kernel = geometry ? 'number' : colorTrack ? 'rgba' : track.kernel;
    bindings.set(binding.id, binding);
    ownArray(track.keyframes, 'Animation timeline keyframes');
    validateGeneratedItemLimit(count += track.keyframes.length, 'Animation timeline keyframes');
    const keyframes = track.keyframes.map(frame => {
      closed(frame, ['timeMs', 'value', 'easingToNext'], 'Animation timeline keyframe', ['timeMs','value']); spend(1);
      if (colorTrack) { if (typeof frame.value !== 'string') throw new TypeError('Timeline paint keyframes require CSS color strings.'); spend(frame.value.length); }
      else if (geometry || track.property === 'opacity') validateUnitInterval(frame.value, 'Timeline unit property');
      else validateNonNegativeFinite(frame.value, 'Timeline stroke width');
      const value = colorTrack ? color(frame.value) : frame.value;
      const easingToNext = Object.hasOwn(frame, 'easingToNext') ? frame.easingToNext : input.easing;
      return { timeMs: frame.timeMs, value, easingToNext };
    });
    const rank = Object.hasOwn(track, 'priority') ? { priority: track.priority } : {};
    specs.push({ target: binding.selector, property: track.property, kernel: track.kernel,
      keyframes: track.keyframes.map((frame, position) => ({ timeMs: frame.timeMs, value: frame.value, easingToNext: keyframes[position].easingToNext })), ...rank });
    return { target: binding.id, property: track.property, kernel, keyframes, ...rank };
  });
  const schedule = prepareTimelineSchedule({ durationMs: input.durationMs, tracks,
    ...(Object.hasOwn(input, 'markers') ? { markers: input.markers } : {}), ...(Object.hasOwn(input, 'composite') ? { composite: input.composite } : {}) });
  for (const [timeMs, side] of [[0, input.durationMs === 0 ? 'to' : 'from'], [input.durationMs, 'to']]) {
    for (const entry of sampleTimelineSchedule(schedule, timeMs)) {
      if (!sameValue(entry.value, endpointValue(bindings.get(entry.target), entry.property, entry.kernel, side))) throw new TypeError('Resolved timeline boundary must equal its exact native endpoint property.');
    }
  }
  const result = cloneAndFreeze({ version: ANIMATION_TIMELINE_VERSION, tracks: specs, markers: schedule.markers, composite: schedule.composite });
  prepared.set(result, { schedule, bindings }); return result;
}

export function sampleAnimationTimeline(timeline, timeMs) {
  const state = prepared.get(timeline);
  if (state === undefined) throw new TypeError('Animation timeline sampling requires authentic native preparation.');
  const entries = sampleTimelineSchedule(state.schedule, timeMs), ownerProgress = [], styles = [];
  for (const entry of entries) {
    const binding = state.bindings.get(entry.target);
    if (binding.kind === 'geometry') ownerProgress.push({ ownerKey: binding.ownerKey, progress: entry.value });
    else {
      const side = timeMs <= 0 && state.schedule.durationMs > 0 ? 'from' : timeMs >= state.schedule.durationMs ? 'to' : undefined;
      const value = side === undefined ? entry.kernel === 'rgba' ? `rgba(${entry.value[0] * 255},${entry.value[1] * 255},${entry.value[2] * 255},${entry.value[3]})` : entry.value
        : styleValue(binding[side],entry.property);
      const { from: _from, to: _to, ...identity } = binding;
      styles.push({ binding: identity, property: entry.property, value });
    }
  }
  return cloneAndFreeze({ ownerProgress, styles });
}

export function animationTimelineSchedule(timeline) {
  const state = prepared.get(timeline);
  if (state === undefined) throw new TypeError('Timeline markers require authentic native preparation.');
  return state.schedule;
}
