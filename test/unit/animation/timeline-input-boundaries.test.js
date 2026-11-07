import test from 'node:test';
import assert from 'node:assert/strict';
import { chart } from '../../../src/index.js';
import { planTransition, sampleTransition, createAnimationPlayer } from '../../../src/animation.js';
import { transitionGeos, transitionGuides } from '../../../src/animation/planner.js';
import { prepareAnimationTimeline, sampleAnimationTimeline } from '../../../src/animation/timelineTracks.js';
import { prepareTimelineSchedule, sampleTimelineSchedule, timelineMarkerCrossings } from '../../../src/grammar/animation/timeline.js';
import { graphicAnimationOwnerKey } from '../../../src/grammar/animation/ownerKey.js';

const options = { durationMs: 100, easing: 'linear' };
const program = chart().createCanvas({ width: 240, height: 180, margin: 20 })
  .createData({ id: 'rows', keyField: 'id', values: [{ id: 'a', x: 2, y: 3 }] })
  .createPointMark({ id: 'points', fill: 'black' })
  .encodeX({ field: 'x', scale: { domain: [0, 10], nice: false } })
  .encodeY({ field: 'y', scale: { domain: [0, 10], nice: false } });
const plan = planTransition({ from: program, to: program, options });
const context = { from: plan.from, to: plan.to, tracks: plan.tracks, guides: transitionGuides(plan), geos: transitionGeos(plan) };
const itemKey = sampleTransition(plan, 50).decisions.find(decision => decision.itemKey !== undefined).itemKey;
const clock = { now: () => 0, requestFrame() { throw Error('Paused player must not schedule'); }, cancelFrame() {} };
const render = () => {};
const frames = () => [{ timeMs: 0, value: 1 }, { timeMs: 100, value: 1 }];
const nativeTrack = () => ({ target: { itemKey }, property: 'opacity', kernel: 'number', keyframes: frames() });
const numericTrack = () => ({ target: 'item', property: 'opacity', kernel: 'number', keyframes: frames() });
const without = (input, key) => { const result = { ...input }; delete result[key]; return result; };

// Restore the prototype before assertions or test reporting can inspect it.
// Null-prototype descriptors also keep a poisoned `value` out of defineProperty.
function inherited(name, value, operation) {
  const previous = Object.getOwnPropertyDescriptor(Object.prototype, name);
  let reads = 0, result, error;
  const descriptor = Object.create(null);
  descriptor.configurable = true;
  descriptor.get = () => { reads++; return value; };
  Object.defineProperty(Object.prototype, name, descriptor);
  try { result = operation(); } catch (caught) { error = caught; }
  finally {
    if (previous === undefined) delete Object.prototype[name];
    else Object.defineProperty(Object.prototype, name, previous);
  }
  return { reads, result, error };
}
function rejectsInherited(name, value, operation) {
  const observed = inherited(name, value, operation);
  assert.equal(observed.reads, 0, `Inherited ${name} getter was executed`);
  assert.ok(observed.error instanceof TypeError, `Missing own ${name} must be rejected`);
}

for (const key of ['from', 'to', 'options']) test(`transition requests reject inherited ${key} without reading it`, () => {
  const request = { from: program, to: program, options };
  rejectsInherited(key, request[key], () => planTransition(without(request, key)));
});

test('transition options require an own duration before normalization', () => {
  rejectsInherited('durationMs', 100, () => planTransition({ from: program, to: program, options: {} }));
});

for (const key of ['plan', 'clock', 'render']) test(`player creation rejects inherited ${key} without reading it`, () => {
  const input = { plan, clock, render };
  rejectsInherited(key, input[key], () => createAnimationPlayer(without(input, key)));
});

for (const key of ['to', 'options']) test(`interruption rejects inherited ${key} and preserves its current frame`, () => {
  const player = createAnimationPlayer({ plan, clock, render });
  try {
    player.seek(25);
    const frame = player.getFrame(), state = player.getState(), finished = player.finished;
    const request = { to: program, options };
    rejectsInherited(key, request[key], () => player.interrupt(without(request, key)));
    assert.equal(player.getFrame(), frame); assert.equal(player.finished, finished); assert.deepEqual(player.getState(), state);
  } finally { player.dispose(); }
});

for (const key of ['durationMs', 'tracks']) test(`numeric schedules reject inherited ${key}`, () => {
  const input = { durationMs: 100, tracks: [numericTrack()] };
  rejectsInherited(key, input[key], () => prepareTimelineSchedule(without(input, key)));
});

for (const key of ['durationMs', 'easing']) test(`native schedules reject inherited ${key}`, () => {
  rejectsInherited(key, options[key], () => prepareAnimationTimeline(without(options, key), context));
});

for (const [kind, makeTrack, prepare] of [
  ['numeric', numericTrack, track => prepareTimelineSchedule({ durationMs: 100, tracks: [track] })],
  ['native', nativeTrack, track => prepareAnimationTimeline({ ...options, tracks: [track] }, context)]
]) {
  for (const key of ['target', 'property', 'kernel', 'keyframes']) test(`${kind} tracks reject inherited ${key}`, () => {
    const track = makeTrack(), input = without(track, key);
    rejectsInherited(key, track[key], () => prepare(input));
  });
  for (const key of ['timeMs', 'value']) test(`${kind} keyframes reject inherited ${key}`, () => {
    const track = makeTrack(), original = track.keyframes[0];
    track.keyframes[0] = without(original, key);
    rejectsInherited(key, original[key], () => prepare(track));
  });
}

for (const kind of ['numeric', 'native']) for (const key of ['id', 'timeMs']) test(`${kind} markers reject inherited ${key}`, () => {
  const marker = { id: 'middle', timeMs: 50 }, input = { ...options, tracks: [], markers: [without(marker, key)] };
  rejectsInherited(key, marker[key], () => kind === 'native' ? prepareAnimationTimeline(input, context)
    : prepareTimelineSchedule({ durationMs: input.durationMs, tracks: [], markers: input.markers }));
});

for (const key of ['fromTimeMs', 'toTimeMs', 'iteration']) test(`marker crossings require own ${key}`, () => {
  const schedule = prepareTimelineSchedule({ durationMs: 100, tracks: [], markers: [{ id: 'middle', timeMs: 50 }] });
  const input = { fromTimeMs: 0, toTimeMs: 100, iteration: 0, emit: true };
  rejectsInherited(key, input[key], () => timelineMarkerCrossings(schedule, without(input, key)));
});

for (const key of ['iteration', 'ids']) test(`marker receipts require own ${key}`, () => {
  const schedule = prepareTimelineSchedule({ durationMs: 100, tracks: [], markers: [{ id: 'middle', timeMs: 50 }] });
  const state = { iteration: 0, ids: [] }, input = { fromTimeMs: 0, toTimeMs: 100, iteration: 0, emit: true, state: without(state, key) };
  rejectsInherited(key, state[key], () => timelineMarkerCrossings(schedule, input));
});

for (const key of ['itemKey', 'guideKey']) test(`style targets reject an inherited ${key}`, () => {
  const track = { ...nativeTrack(), target: {} };
  rejectsInherited(key, itemKey, () => prepareAnimationTimeline({ ...options, tracks: [track] }, context));
});

test('an own item target ignores an inherited guide selector', () => {
  const input = { ...options, tracks: [nativeTrack()] };
  const observed = inherited('guideKey', 'not-a-guide', () => prepareAnimationTimeline(input, context));
  assert.equal(observed.reads, 0); assert.equal(observed.error, undefined);
  assert.equal(sampleAnimationTimeline(observed.result, 50).styles[0].binding.kind, 'item');
});

test('omitted native opacity retains one without consulting an inherited value', () => {
  const track = nativeTrack(), index = context.tracks.find(value => value.key === itemKey).targetIndex;
  assert.equal(Object.hasOwn(context.to.scene.nodes[index].properties, 'opacity'), false);
  const observed = inherited('opacity', .2, () => {
    const timeline = prepareAnimationTimeline({ ...options, tracks: [track] }, context);
    return [0, 50, 100].map(time => sampleAnimationTimeline(timeline, time).styles[0].value);
  });
  assert.equal(observed.reads, 0); assert.equal(observed.error, undefined); assert.deepEqual(observed.result, [1, 1, 1]);
});

test('omitted marker callbacks do not inherit executable behavior', () => {
  let calls = 0;
  const observed = inherited('onMarker', () => { calls++; }, () => createAnimationPlayer({ plan, clock, render }));
  try {
    assert.equal(observed.reads, 0); assert.equal(observed.error, undefined);
    observed.result.seek(50, { emit: true }); assert.equal(calls, 0);
  } finally { observed.result?.dispose(); }
});

test('optional numeric schedule fields keep their own defaults', () => {
  const results = ['markers', 'composite', 'priority', 'easingToNext'].map(key => {
    const input = { durationMs: 100, tracks: [numericTrack()] };
    return inherited(key, 'invalid-inherited-default', () => prepareTimelineSchedule(input));
  });
  for (const observed of results) {
    assert.equal(observed.reads, 0); assert.equal(observed.error, undefined);
    assert.equal(sampleTimelineSchedule(observed.result, 50)[0].value, 1);
  }
});

test('graphic owner keys reject inherited lineage before accessing its fields', () => {
  const identity = plan.from.identities.find(Boolean);
  rejectsInherited('lineage', identity.lineage, () => graphicAnimationOwnerKey(without(identity, 'lineage')));
});

test('dataset owner keys reject inherited row keys', () => {
  const identity = plan.from.identities.find(Boolean);
  const input = { ...identity, lineage: without(identity.lineage, 'rowKeys') };
  rejectsInherited('rowKeys', identity.lineage.rowKeys, () => graphicAnimationOwnerKey(input));
});

for (const [kind, identity] of [
  ['resource', {
    key: JSON.stringify([[], 'image', 'image', ['resource', 'image']]),
    topology: 'single', role: 'image',
    lineage: { kind: 'resource', resource: { kind: 'image', id: 'asset', revision: 0 } }
  }],
  ['screen', {
    key: JSON.stringify([[], 'label', 'item', ['annotation', 'screen']]),
    topology: 'single', role: 'text', lineage: { kind: 'screen' }
  }]
]) test(`${kind} owner keys ignore inherited optional row keys`, () => {
  const expected = graphicAnimationOwnerKey(identity);
  const observed = inherited('rowKeys', ['inherited-row'], () => graphicAnimationOwnerKey(identity));
  assert.equal(observed.reads, 0); assert.equal(observed.error, undefined);
  assert.equal(observed.result, expected);
});
