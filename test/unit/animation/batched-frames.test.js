import assert from 'node:assert/strict';
import test from 'node:test';
import { chart } from '../../../src/index.js';
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation, exportAnimationFrames, createAnimationPlayer } from '../../../src/animation.js';
import { animationFrameProvenance } from '../../../src/animation/frameProvenance.js';
import { projectBatchSceneRows } from '../../../src/animation/batchScene.js';
import { animationSceneLength, animationSceneRows } from '../../../src/core/sceneRows.js';
import { createPositionPreparationContext, preparePositionInterpolation, samplePositionInterpolation, preparePositionBatch, samplePositionBatch } from '../../../src/grammar/animation/positions.js';
import { projectBatchNumericColumns, restoreBatchNumericColumns, batchLogicalPlanWork, batchLogicalPlanValues } from '../../../src/animation/batchCodec.js';
import { createOfflineResourceScope } from '../../../src/animation/resources.js';

const options = { durationMs: 100, easing: 'linear' };
const points = () => chart().createCanvas({ width: 200, height: 200, margin: 10, plotBorder: false })
  .createData({ id: 'rows', keyField: 'id', values: Array.from({ length: 12 }, (_, id) => ({ id, x: (id + 1) / 13, y: (12 - id) / 13 })) })
  .createPointMark({ id: 'points' }).encodeX({ field: 'x', scale: { id: 'x', domain: [0, 1], nice: false } }).encodeY({ field: 'y', scale: { id: 'y', domain: [0, 1], nice: false } });
const plan = (from, to, extra = {}) => planTransition({ from, to, options: { ...options, formatVersion: 6, ...extra } });
const rows = frame => projectBatchSceneRows(frame.scene, animationFrameProvenance(frame).positions);

test('explicit batch frames complete every coordinate, decision and private meaning before return', () => {
  const from = points(), to = from.editScale({ id: 'x', domain: [0, 2], nice: false }), batch = plan(from, to), legacy = planTransition({ from, to, options });
  for (const time of [0, 25, 50, 100]) {
    const frame = sampleTransition(batch, time), expected = sampleTransition(legacy, time), expanded = rows(frame);
    assert.equal(frame.scene.version, 3); assert.equal(animationSceneLength(frame.scene), expected.scene.nodes.length);
    assert.deepEqual(expanded.scene, expected.scene); assert.deepEqual(expanded.decisions, expected.decisions);
    assert.deepEqual(expanded.positions.map(value => value?.reason ? null : value), animationFrameProvenance(expected).positions);
    assert.deepEqual(animationFrameProvenance(frame).native, animationFrameProvenance(expected).native);
    assert.ok(frame.scene.entries.some(entry => entry.kind === 'circle-run'));
    for (const row of animationSceneRows(frame.scene, { decisions: false })) assert.equal(row.decision, undefined);
    assert.throws(() => { frame.scene.entries[1].properties.x[0] = 100; }, TypeError);
  }
  const stored = serializeAnimation(batch), offline = deserializeAnimation(stored).plan;
  assert.equal(offline.version, 6); assert.equal(serializeAnimation(offline), stored);
  assert.deepEqual(sampleTransition(offline, 50), sampleTransition(batch, 50));
  assert.equal(animationFrameProvenance(sampleTransition(offline, 50)).native, undefined);
});

test('batch rebase preserves the exact starting frame, export time and representation boundaries', () => {
  const from = points(), to = from.editScale({ id: 'x', domain: [0, 2], nice: false }), initial = plan(from, to), start = sampleTransition(initial, 37), rebased = plan(start, to);
  assert.equal(sampleTransition(rebased, 0), start);
  const wire = serializeAnimation(rebased), restored = deserializeAnimation(wire).plan;
  assert.equal(serializeAnimation(restored), wire);
  for (const time of [0, 50, 100]) assert.deepEqual(sampleTransition(restored, time), sampleTransition(rebased, time));
  assert.deepEqual(exportAnimationFrames(rebased, { timesMs: [0, 50, 100] }).map(frame => frame.timeMs), [0, 50, 100]);
  assert.throws(() => planTransition({ from: start, to, options }), /formatVersion 6/);
  const legacy = sampleTransition(planTransition({ from, to, options }), 37), promoted = plan(legacy, to);
  assert.equal(sampleTransition(promoted, 0).scene.version, 3);
  assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(promoted)).plan, 50), sampleTransition(promoted, 50));
  const clock = { now: () => 0, requestFrame: () => 1, cancelFrame() {} }, player = createAnimationPlayer({ plan: initial, clock, render() {} });
  player.seek(37); const before = player.getState(), captured = player.getFrame();
  assert.throws(() => player.interrupt({ to, options }), /representation/);
  assert.deepEqual(player.getState(), before); assert.equal(player.getFrame(), captured);
  player.interrupt({ to, options: { ...options, formatVersion: 6 } }); assert.equal(player.getFrame(), captured); player.dispose();
});

test('single-entry family fallbacks and item timelines retain complete legacy samples', () => {
  const from = points(), target = from.editScale({ id: 'x', domain: [0, 2], nice: false });
  const baseline = sampleTransition(planTransition({ from, to: target, options }), 50), decision = baseline.decisions.find(value => value.kernel === 'cartesian-point');
  for (const [to, extra] of [[target.editPointMark({ shape: 'square' }), {}], [target, { tracks: [{ target: { itemKey: decision.itemKey }, property: 'fill', kernel: 'color', keyframes: [{ timeMs: 0, value: baseline.scene.nodes[decision.targetIndex].properties.fill }, { timeMs: 50, value: 'blue' }, { timeMs: 100, value: baseline.scene.nodes[decision.targetIndex].properties.fill }] }] }]]) {
    const batch = plan(from, to, extra), legacy = planTransition({ from, to, options: { ...options, ...extra } });
    assert.deepEqual(rows(sampleTransition(batch, 50)).scene, sampleTransition(legacy, 50).scene);
    assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(batch)).plan, 50), sampleTransition(batch, 50));
  }
});

test('private vector sampling preserves all six scalar mappings, signed zero and caller boundaries', () => {
  for (const type of ['linear', 'time', 'log', 'pow', 'sqrt', 'symlog']) {
    const context = createPositionPreparationContext(), parameters = type === 'log' ? { base: 10 } : type === 'pow' ? { exponent: 2 } : type === 'symlog' ? { constant: 2 } : {};
    const scale = { type, domain: [1, 10], range: [-0, 100], clamp: true, ...parameters };
    const input = [1, 2, 3, 10].map(value => preparePositionInterpolation({ value, scale }, { value: value * 2, scale: { ...scale, domain: [2, 20], range: [100, -0] } }, context));
    const token = preparePositionBatch(input); input.push(input[0]);
    for (const progress of [0, .25, .5, 1]) {
      const batch = samplePositionBatch(token, progress), expected = input.slice(0, 4).map(value => samplePositionInterpolation(value, progress));
      assert.deepEqual(batch.positions, expected.map(value => value.position)); assert.deepEqual(batch.values, expected.map(value => value.value)); assert.deepEqual(batch.scale, expected[0].scale);
    }
  }
  let reads = 0; const forged = Object.freeze({ get from() { reads++; throw Error('read'); } });
  assert.throws(() => preparePositionBatch([forged]), /exact prepared/); assert.throws(() => samplePositionBatch(forged, .5), /private prepared token/); assert.equal(reads, 0);
  assert.throws(() => preparePositionBatch([]), /1..10000/); assert.throws(() => preparePositionBatch(Array(10001).fill(forged)), /1..10000/);
});

function work(value, weighted = true) {
  let result = 1; if (typeof value === 'string') return result + (weighted ? value.length : 0);
  if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) result += (weighted ? key.length : 0) + work(child, weighted);
  return result;
}
test('batch numeric projection retains exact legacy logical work and rejects lengths before numeric allocation', () => {
  const from = points(), to = from.editScale({ id: 'x', domain: [0, 2], nice: false }), frame = sampleTransition(plan(from, to), 37), proof = animationFrameProvenance(frame);
  const endpoint = { scene: frame.scene, identities: proof.endpoint.identities, backgrounds: proof.endpoint.backgrounds, positions: proof.positions, view: { progress: frame.progress } }, raw = { from: endpoint, to: endpoint }, expanded = rows(frame);
  const expectedEndpoint = { ...endpoint, scene: expanded.scene, positions: expanded.positions, view: { progress: frame.progress, decisions: expanded.decisions } }, expected = { from: expectedEndpoint, to: expectedEndpoint };
  assert.equal(batchLogicalPlanWork(raw), work(expected)); assert.equal(batchLogicalPlanValues(raw), work(expected, false));
  const limits = { maxEndpointNodes: 100, maxOutputNodes: 50 }, packed = projectBatchNumericColumns(raw);
  assert.deepEqual(restoreBatchNumericColumns(packed, createOfflineResourceScope(limits)), raw);
  const malformed = structuredClone(packed); malformed.from.scene.entries[1].properties.x.length++;
  let allocated = 0; const original = Array.from; Array.from = (...args) => { allocated++; return original(...args); };
  try { assert.throws(() => restoreBatchNumericColumns(malformed, createOfflineResourceScope(limits))); assert.equal(allocated, 0); }
  finally { Array.from = original; }
});

test('point runs split at concrete paint boundaries and obey owner-only geometry timelines', () => {
  const from = points().encodeColor({ field: 'id', fieldType: 'nominal' }), to = from.editScale({ id: 'x', domain: [0, 2], nice: false });
  const base = sampleTransition(planTransition({ from, to, options }), 50), ownerKey = base.decisions.find(decision => decision.kernel === 'cartesian-point').ownerKey;
  const extra = { tracks: [{ target: { ownerKey }, property: 'geometry', kernel: 'native-progress', keyframes: [{ timeMs: 0, value: 0 }, { timeMs: 50, value: .25 }, { timeMs: 100, value: 1 }] }] };
  const batch = plan(from, to, extra), legacy = planTransition({ from, to, options: { ...options, ...extra } }), frame = sampleTransition(batch, 50);
  assert.ok(frame.scene.entries.filter(entry => entry.kind === 'circle-run').length > 1);
  assert.deepEqual(rows(frame).scene, sampleTransition(legacy, 50).scene);
});

test('private batch mapping keeps collapsed and nonfinite fallback behavior for every row', () => {
  const context = createPositionPreparationContext(), scale = { type: 'linear', domain: [0, 1], range: [0, 1] }, target = { ...scale, range: [0, Number.MAX_VALUE] };
  const first = preparePositionInterpolation({ value: 0, scale }, { value: 0, scale: target }, context);
  const overflow = preparePositionInterpolation({ value: Number.MAX_VALUE, scale }, { value: 0, scale: target }, context);
  assert.deepEqual(samplePositionBatch(preparePositionBatch([first, overflow]), .5), { kind: 'crossfade', reason: 'nonfinite-position' });
  assert.deepEqual(samplePositionBatch(preparePositionBatch([overflow]), .5), { kind: 'crossfade', reason: 'nonfinite-position' });
  const narrowContext = createPositionPreparationContext(), narrow = preparePositionInterpolation({ value: 1, scale: { ...scale, domain: [1, 1 + Number.EPSILON] } }, { value: 1, scale: { ...scale, domain: [1 - Number.EPSILON / 2, 1] } }, narrowContext);
  assert.deepEqual(samplePositionBatch(preparePositionBatch([narrow]), .5), { kind: 'crossfade', reason: 'collapsed-domain' });
  assert.throws(() => samplePositionBatch(preparePositionBatch([first]), NaN), /progress/);
  const distinct = preparePositionInterpolation({ value: 0, scale }, { value: 0, scale: target });
  assert.throws(() => preparePositionBatch([first, distinct]), /shared scales/);
});


test('rounded interior scale collapse uses the complete concrete fallback in batch mode', () => {
  const from = chart().createCanvas({ width: 100, height: 100, margin: 0, plotBorder: false })
    .createData({ id: 'rows', keyField: 'id', values: [{ id: 'a', x: 1, y: .5 }] }).createPointMark({ id: 'points' })
    .encodeX({ field: 'x', scale: { id: 'x', domain: [1, 1 + Number.EPSILON], nice: false } })
    .encodeY({ field: 'y', scale: { id: 'y', domain: [0, 1], nice: false } });
  const to = from.editScale({ id: 'x', domain: [1 - Number.EPSILON / 2, 1], nice: false });
  const batch = plan(from, to), legacy = planTransition({ from, to, options });
  const frame = sampleTransition(batch, 50), expected = sampleTransition(legacy, 50);
  assert.deepEqual(rows(frame).scene, expected.scene);
  assert.deepEqual(rows(frame).decisions, expected.decisions);
  assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(batch)).plan, 50), frame);
});
