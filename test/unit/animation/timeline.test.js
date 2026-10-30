import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareTimelineSchedule as prepare, sampleTimelineSchedule as sample, timelineMarkerCrossings as crossing } from '../../../src/grammar/animation/timeline.js';

const frame = (timeMs, value) => ({ timeMs, value, easingToNext: 'linear' });
const track = (start = 0, end = 100, extra = {}) => ({ target: 'point:a', property: 'opacity', kernel: 'number', keyframes: [frame(start, 10), frame(end, 30)], ...extra });
const schedule = (tracks = [track()], extra = {}) => prepare({ durationMs: 100, tracks, ...extra });
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} vs ${b}`);

test('a timeline samples independent literal linear anchors and clamps both sides', () => {
  const plan = schedule();
  assert.deepEqual([-10, 0, 25, 50, 75, 100, 200].map(time => sample(plan, time)[0].value), [10, 10, 15, 20, 25, 30, 30]);
  assert.equal(sample(plan, 50)[0].target, 'point:a');
  assert.ok(Object.isFrozen(plan.tracks[0].keyframes)); assert.ok(Object.isFrozen(sample(plan, 20)[0]));
  assert.deepEqual(sample(schedule([]), 50), []);
  assert.throws(() => sample(structuredClone(plan), 50), /authentic/); assert.throws(() => sample(plan, Infinity), /finite/);
});

test('numeric scale, rotation, eased values and premultiplied color use their existing kernels', () => {
  const tracks = [
    track(0, 100, { property: 'scale', kernel: 'positive-scale', keyframes: [frame(0, 1), frame(100, 100)] }),
    track(0, 100, { property: 'rotation', kernel: 'rotation', keyframes: [frame(0, 0), frame(100, -Math.PI)] }),
    track(0, 100, { property: 'fill', kernel: 'rgba', keyframes: [frame(0, [0, 0, 0, 0]), frame(100, [1, 0, 0, 1])] }),
    track(0, 100, { property: 'eased', keyframes: [{ timeMs: 0, value: 0 }, { timeMs: 100, value: 100 }] })
  ];
  const result = sample(schedule(tracks), 50); close(result[0].value, 10); close(result[1].value, Math.PI / 2);
  result[2].value.forEach((value, index) => close(value, [1, 0, 0, .5][index]));
  close(sample(schedule(tracks), 25)[3].value, 6.25);
});

test('same-time keyframes are right-continuous and zero-duration tracks retain a stable value', () => {
  const plan = schedule([track(20, 80, { keyframes: [frame(20, 1), frame(20, 2), frame(60, 4), frame(60, 5), frame(80, 9)] })]);
  assert.deepEqual([0, 20, 40, 60, 80, 100].map(time => sample(plan, time)[0].value), [1, 2, 3, 5, 9, 9]);
  const point = schedule([track(50, 50)]); assert.equal(sample(point, 50)[0].value, 30);
  assert.equal(sample(point, 0)[0].value, 10); assert.equal(sample(point, 100)[0].value, 30);
  const zero = prepare({ durationMs: 0, tracks: [track(0, 0)] }); assert.equal(sample(zero, 0)[0].value, 30);
  const one = schedule([track(0, 100, { keyframes: [frame(40, 7)] })]); assert.equal(sample(one, 50)[0].value, 7);
});

test('non-overlapping tracks share one slot while gaps hold the latest completed value', () => {
  const first = track(10, 30), second = track(60, 90, { keyframes: [frame(60, 50), frame(90, 80)] });
  const plan = schedule([second, first]);
  assert.deepEqual([0, 20, 30, 50, 60, 75, 100].map(time => sample(plan, time)[0].value), [10, 20, 30, 30, 50, 65, 80]);
  const adjacent = schedule([track(0, 50), track(50, 100, { keyframes: [frame(50, 60), frame(100, 80)] })]);
  assert.equal(sample(adjacent, 50)[0].value, 60);
  assert.equal(sample(schedule([track(), track(0, 100, { target: 'point:b' })]), 50).length, 2);
});

test('overlap requires explicit distinct priority and resumes the lower track when its overlay ends', () => {
  assert.throws(() => schedule([track(), track(20, 80)]), /Overlapping/);
  assert.throws(() => schedule([track(), track(20, 80)], { composite: 'priority' }), /explicit priority/);
  assert.throws(() => schedule([track(0, 100, { priority: 2 }), track(20, 80, { priority: 2 })], { composite: 'priority' }), /Overlapping/);
  assert.throws(() => schedule([track(30, 30), track(30, 30)]), /Overlapping/);
  assert.throws(() => schedule([track(0, 100), track(20, 20)]), /Overlapping/);
  assert.throws(() => schedule([track(20, 20), track(20, 80)]), /Overlapping/);
  const plan = schedule([track(0, 100, { priority: 1 }), track(20, 80, { priority: 3, keyframes: [frame(20, 100), frame(80, 160)] })], { composite: 'priority' });
  assert.equal(sample(plan, 50)[0].value, 130); assert.equal(sample(plan, 90)[0].value, 28);
  const tiedEnds = schedule([track(0, 100, { priority: 1 }), track(20, 100, { priority: 2, keyframes: [frame(20, 100), frame(100, 200)] })], { composite: 'priority' });
  assert.equal(sample(tiedEnds, 100)[0].value, 200);
  const tiedStarts = schedule([track(20, 80, { priority: 1 }), track(20, 60, { priority: 2, keyframes: [frame(20, 100), frame(60, 200)] })], { composite: 'priority' });
  assert.equal(sample(tiedStarts, 0)[0].value, 100);
});

test('markers cross forward once per iteration and seek is silent unless explicitly emitted', () => {
  const plan = schedule([], { markers: [{ id: 'end', timeMs: 100 }, { id: 'half', timeMs: 50 }, { id: 'start', timeMs: 0 }] });
  const start = crossing(plan, { fromTimeMs: -1, toTimeMs: 0, iteration: 0, emit: true }); assert.deepEqual(start.markers.map(m => m.id), ['start']);
  const first = crossing(plan, { fromTimeMs: 0, toTimeMs: 75, iteration: 0, emit: true, state: start.state }); assert.deepEqual(first.markers.map(m => m.id), ['half']);
  const repeat = crossing(plan, { fromTimeMs: 0, toTimeMs: 100, iteration: 0, emit: true, state: first.state }); assert.deepEqual(repeat.markers.map(m => m.id), ['end']);
  assert.deepEqual(crossing(plan, { fromTimeMs: 0, toTimeMs: 100, iteration: 0, state: repeat.state }).markers, []);
  assert.deepEqual(crossing(plan, { fromTimeMs: 100, toTimeMs: 0, iteration: 0, emit: true, state: repeat.state }).markers, []);
  assert.deepEqual(crossing(plan, { fromTimeMs: -1, toTimeMs: 100, iteration: 1, emit: true, state: repeat.state }).markers.map(m => m.id), ['start', 'half', 'end']);
  assert.deepEqual(crossing(plan, { fromTimeMs: -5, toTimeMs: -1, iteration: 1, emit: true }).markers, []);
  assert.ok(Object.isFrozen(first.state.ids));
});

test('closed timeline input and serialized values reject malformed records before invoking getters', () => {
  const original = { durationMs: 100, tracks: [track()] };
  for (const mutate of [p => p.extra = true, p => p.durationMs = -1, p => p.composite = undefined, p => p.tracks = new Array(2), p => p.tracks[0].extra = true,
    p => p.tracks[0].target = '', p => p.tracks[0].property = null, p => p.tracks[0].kernel = 'future', p => p.tracks[0].priority = .5,
    p => p.tracks[0].keyframes = [], p => p.tracks[0].keyframes[0].extra = true, p => p.tracks[0].keyframes[0].timeMs = NaN,
    p => p.tracks[0].keyframes[1].timeMs = -1, p => p.tracks[0].keyframes[1].timeMs = 101, p => p.tracks[0].keyframes = [frame(70, 1), frame(60, 2)],
    p => p.tracks[0].keyframes[0].value = () => 1, p => p.tracks[0].keyframes[0].easingToNext = undefined, p => p.tracks[0].keyframes[0].easingToNext = 'future']) {
    const input = structuredClone(original); mutate(input); assert.throws(() => prepare(input));
  }
  for (const [kernel, value] of [['rgba', [0, 0, 0]], ['rgba', [0, 0, 0, 2]], ['positive-scale', 0], ['rotation', Infinity]]) assert.throws(() => schedule([track(0, 100, { kernel, keyframes: [frame(0, value)] })]));
  let reads = 0; const bad = { ...original, get durationMs() { reads++; return 100; } }; assert.throws(() => prepare(bad), /accessor/); assert.equal(reads, 0);
  const nested = { ...track(), keyframes: [{ timeMs: 0, get value() { reads++; return 1; } }] }; assert.throws(() => schedule([nested]), /accessor/); assert.equal(reads, 0);
});

test('markers and their emitted state reject unknown identity, duplicates and malformed lifecycle counters', () => {
  for (const markers of [undefined, new Array(1), [{ id: '', timeMs: 0 }], [{ id: 'a', timeMs: -1 }], [{ id: 'a', timeMs: 101 }], [{ id: 'a', timeMs: 0, extra: true }], [{ id: 'a', timeMs: 0 }, { id: 'a', timeMs: 50 }]]) assert.throws(() => schedule([], { markers }));
  const plan = schedule([], { markers: [{ id: 'a', timeMs: 1 }] }), input = { fromTimeMs: 0, toTimeMs: 10, iteration: 0 };
  for (const extra of [{ extra: true }, { fromTimeMs: NaN }, { toTimeMs: Infinity }, { iteration: -1 }, { iteration: .5 }, { emit: undefined }, { emit: 1 }, { state: undefined }, { state: { iteration: 0, ids: ['b'] } }, { state: { iteration: 0, ids: ['a', 'a'] } }, { state: { iteration: -1, ids: [] } }, { state: { iteration: 0, ids: [], extra: true } }, { state: { iteration: 0, ids: [null] } }]) assert.throws(() => crossing(plan, { ...input, ...extra }));
  assert.throws(() => crossing({}, input), /authentic/);
});

test('bounded preparation snapshots all inputs and never retains mutable arrays or state', () => {
  const input = { durationMs: 100, tracks: [track(0, 100, { kernel: 'rgba', keyframes: [frame(0, [0, 0, 0, 1]), frame(100, [1, 1, 1, 1])] })], markers: [{ id: 'a', timeMs: 50 }] };
  const plan = prepare(input), before = sample(plan, 50); input.tracks[0].keyframes[0].value[0] = 1; input.markers[0].id = 'changed';
  assert.deepEqual(sample(plan, 50), before); close(before[0].value[0], .7353569830524495);
  const result = crossing(plan, { fromTimeMs: 0, toTimeMs: 60, iteration: 0, emit: true }); assert.deepEqual(result.state.ids, ['a']);
  assert.throws(() => schedule(Array(10001).fill(track())), /10000/);
  assert.throws(() => schedule([track(0, 100, { keyframes: Array(10001).fill(frame(0, 1)) })]), /10000/);
  assert.throws(() => schedule([], { markers: Array(10001).fill({ id: 'a', timeMs: 1 }) }), /10000/);
  assert.throws(() => schedule([track(0, 100, { target: 'x'.repeat(10000001) })]), /work/);
  assert.throws(() => crossing(plan, { fromTimeMs: 0, toTimeMs: 60, iteration: 0, state: { iteration: 0, ids: ['x'.repeat(10000001)] } }), /work/);
});
