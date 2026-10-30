import { cloneAndFreeze } from '../../core/immutable.js';
import { ownArray, ownRecord } from '../../core/ownData.js';
import { rejectUnknownProperties, validateNonNegativeFinite, validateGeneratedItemLimit, validateWorkLimit } from '../../core/validation.js';
import { easeProgress, interpolateNumber, interpolatePositiveScale, interpolateRotation, interpolateRGBA } from './values.js';

export const ANIMATION_TIMELINE_VERSION = 'keyframe-schedule@1';
const kernels = new Map([['number', interpolateNumber], ['positive-scale', interpolatePositiveScale], ['rotation', interpolateRotation], ['rgba', interpolateRGBA]]);
const prepared = new WeakMap();
function closed(value, keys, label) { ownRecord(value, label); rejectUnknownProperties(value, keys, label); }
function name(value, label, spend) {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${label} requires a nonempty string.`);
  spend(value.length); return value;
}
function priority(value) {
  if (!Number.isSafeInteger(value)) throw new TypeError('Timeline priority requires a safe integer.');
  return value;
}
function overlaps(a, b) {
  if (a.start === a.end) return b.start === b.end ? a.start === b.start : a.start >= b.start && a.start < b.end;
  if (b.start === b.end) return b.start >= a.start && b.start < a.end;
  return a.start < b.end && b.start < a.end;
}
function bounds(track) { return { start: track.keyframes[0].timeMs, end: track.keyframes.at(-1).timeMs }; }

// Targets are opaque exact identity slots supplied by the native adapter. This
// numeric owner neither looks up a program nor infers a semantic value from ink.
export function prepareTimelineSchedule(input) {
  closed(input, ['durationMs', 'tracks', 'markers', 'composite'], 'Timeline schedule');
  validateNonNegativeFinite(input.durationMs, 'Timeline duration');
  const composite = Object.hasOwn(input, 'composite') ? input.composite : 'reject';
  if (!['reject', 'priority'].includes(composite)) throw new TypeError('Timeline composite must be reject or priority.');
  ownArray(input.tracks, 'Timeline tracks'); validateGeneratedItemLimit(input.tracks.length, 'Timeline tracks');
  let work = 0, count = 0;
  const spend = amount => validateWorkLimit(work += amount, 'Timeline preparation work');
  const tracks = input.tracks.map(track => {
    closed(track, ['target', 'property', 'kernel', 'keyframes', 'priority'], 'Timeline track');
    const target = name(track.target, 'Timeline target', spend), property = name(track.property, 'Timeline property', spend);
    const interpolate = kernels.get(track.kernel);
    if (interpolate === undefined) throw new TypeError('Unknown timeline interpolation kernel.');
    const rank = Object.hasOwn(track, 'priority') ? { priority: priority(track.priority) } : {};
    if (composite === 'priority' && !Object.hasOwn(rank, 'priority')) throw new TypeError('Priority composition requires an explicit priority on every track.');
    ownArray(track.keyframes, 'Timeline keyframes');
    if (track.keyframes.length === 0) throw new TypeError('Timeline tracks require at least one keyframe.');
    validateGeneratedItemLimit(count += track.keyframes.length, 'Timeline keyframes');
    let previous = -1;
    const keyframes = track.keyframes.map(frame => {
      spend(1); closed(frame, ['timeMs', 'value', 'easingToNext'], 'Timeline keyframe');
      validateNonNegativeFinite(frame.timeMs, 'Keyframe time');
      if (frame.timeMs < previous || frame.timeMs > input.durationMs) throw new RangeError('Keyframe times must be nondecreasing within the timeline.');
      previous = frame.timeMs;
      // Sampling the same value validates both numeric and RGBA endpoint shapes.
      const value = interpolate(frame.value, frame.value, 0);
      const easingToNext = Object.hasOwn(frame, 'easingToNext') ? frame.easingToNext : 'cubic-in-out';
      if (easingToNext === undefined) throw new TypeError('Keyframe easing cannot be undefined.');
      easeProgress(.5, easingToNext);
      return { timeMs: frame.timeMs, value, easingToNext };
    });
    return { target, property, kernel: track.kernel, keyframes, ...rank };
  });
  const groups = new Map();
  tracks.forEach((track, index) => {
    const key = JSON.stringify([track.target, track.property]);
    if (!groups.has(key)) groups.set(key, []); groups.get(key).push(index);
  });
  for (const indices of groups.values()) {
    const ranks = new Map();
    for (const index of indices) {
      const rank = composite === 'priority' ? tracks[index].priority : 0;
      if (!ranks.has(rank)) ranks.set(rank, []); ranks.get(rank).push(bounds(tracks[index]));
    }
    for (const intervals of ranks.values()) {
      intervals.sort((a, b) => a.start - b.start || b.end - a.end);
      for (let index = 1; index < intervals.length; index++) {
        spend(1);
        if (overlaps(intervals[index - 1], intervals[index])) throw new TypeError('Overlapping timeline tracks require distinct explicit priorities.');
      }
    }
  }
  const markerInput = Object.hasOwn(input, 'markers') ? input.markers : [];
  ownArray(markerInput, 'Timeline markers'); validateGeneratedItemLimit(markerInput.length, 'Timeline markers');
  const ids = new Set(), markers = markerInput.map(marker => {
    closed(marker, ['id', 'timeMs'], 'Timeline marker');
    const id = name(marker.id, 'Timeline marker id', spend);
    if (ids.has(id)) throw new TypeError('Timeline marker ids must be unique.'); ids.add(id);
    validateNonNegativeFinite(marker.timeMs, 'Timeline marker time');
    if (marker.timeMs > input.durationMs) throw new RangeError('Timeline marker exceeds the duration.');
    return { id, timeMs: marker.timeMs };
  }).sort((a, b) => a.timeMs - b.timeMs);
  const result = cloneAndFreeze({ version: ANIMATION_TIMELINE_VERSION, durationMs: input.durationMs, composite, tracks, markers });
  prepared.set(result, { groups: [...groups.values()], markerIds: ids }); return result;
}
function requireSchedule(value) {
  const state = prepared.get(value);
  if (state === undefined) throw new TypeError('Timeline sampling requires an authentic prepared schedule.');
  return state;
}
function time(value, duration) {
  if (!Number.isFinite(value)) throw new TypeError('Timeline time must be finite.');
  return Math.min(duration, Math.max(0, value));
}
function sampleTrack(track, current) {
  const frames = track.keyframes;
  if (current < frames[0].timeMs) return frames[0].value;
  let low = 0, high = frames.length;
  while (low < high) { const middle = Math.floor((low + high) / 2); if (frames[middle].timeMs <= current) low = middle + 1; else high = middle; }
  const a = frames[low - 1], b = frames[low];
  if (b === undefined || current === a.timeMs) return a.value;
  return kernels.get(track.kernel)(a.value, b.value, easeProgress((current - a.timeMs) / (b.timeMs - a.timeMs), a.easingToNext));
}
// Active priority wins. A gap holds the latest completed value; before the first
// track the earliest starting value is held. Equal-time keyframes are right-continuous.
export function sampleTimelineSchedule(schedule, timeMs) {
  const { groups } = requireSchedule(schedule), current = time(timeMs, schedule.durationMs);
  return cloneAndFreeze(groups.map(indices => {
    let active, before, after;
    for (const index of indices) {
      const track = schedule.tracks[index], interval = bounds(track), candidate = { track, ...interval };
      if (current >= interval.start && (current < interval.end || interval.start === interval.end && current === interval.start)) {
        if (active === undefined || (track.priority ?? 0) > (active.track.priority ?? 0)) active = candidate;
      } else if (interval.end <= current) {
        if (before === undefined || interval.end > before.end || interval.end === before.end && (track.priority ?? 0) > (before.track.priority ?? 0)) before = candidate;
      } else if (after === undefined || interval.start < after.start || interval.start === after.start && (track.priority ?? 0) > (after.track.priority ?? 0)) after = candidate;
    }
    const { track } = active ?? before ?? after;
    return { target: track.target, property: track.property, kernel: track.kernel, value: sampleTrack(track, current) };
  }));
}

export function timelineMarkerCrossings(schedule, input) {
  const { markerIds } = requireSchedule(schedule);
  closed(input, ['fromTimeMs', 'toTimeMs', 'iteration', 'emit', 'state'], 'Timeline marker crossing');
  const from = input.fromTimeMs, to = input.toTimeMs;
  if (!Number.isFinite(from) || !Number.isFinite(to)) throw new TypeError('Marker crossing times must be finite.');
  if (!Number.isSafeInteger(input.iteration) || input.iteration < 0) throw new TypeError('Marker iteration requires a nonnegative safe integer.');
  const emit = Object.hasOwn(input, 'emit') ? input.emit : false;
  if (typeof emit !== 'boolean') throw new TypeError('Marker emit must be boolean.');
  let emitted = new Set();
  if (Object.hasOwn(input, 'state')) {
    closed(input.state, ['iteration', 'ids'], 'Timeline marker state');
    if (!Number.isSafeInteger(input.state.iteration) || input.state.iteration < 0) throw new TypeError('Marker state iteration requires a nonnegative safe integer.');
    ownArray(input.state.ids, 'Emitted marker ids'); validateGeneratedItemLimit(input.state.ids.length, 'Emitted marker ids');
    const ids = new Set(); let work = 0;
    for (const id of input.state.ids) { validateWorkLimit(work += typeof id === 'string' ? id.length : 1, 'Marker state work'); if (!markerIds.has(id) || ids.has(id)) throw new TypeError('Marker state requires unique owned marker ids.'); ids.add(id); }
    if (input.state.iteration === input.iteration) emitted = ids;
  }
  const markers = emit && to > from ? schedule.markers.filter(marker => marker.timeMs > from && marker.timeMs <= to && !emitted.has(marker.id)) : [];
  markers.forEach(marker => emitted.add(marker.id));
  return cloneAndFreeze({ markers, state: { iteration: input.iteration, ids: [...emitted] } });
}
