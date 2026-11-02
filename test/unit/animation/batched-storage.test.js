import assert from 'node:assert/strict';
import test from 'node:test';
import { chart } from '../../../src/index.js';
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from '../../../src/animation.js';
import { animationFrameProvenance } from '../../../src/animation/frameProvenance.js';
import { projectBatchNumericColumns, restoreBatchNumericColumns } from '../../../src/animation/batchCodec.js';
import { prepareAnimationColumnsV2 } from '../../../src/animation/columnCodec.js';
import { encodeAnimationEnvelope } from '../../../src/animation/envelopeCodec.js';
import { restoreTransitionPlan } from '../../../src/animation/planner.js';
import { createOfflineResourceScope } from '../../../src/animation/resources.js';

const limits = { maxEndpointNodes: 100, maxOutputNodes: 50 };
function fixture() {
  const from = chart().createCanvas({ width: 200, height: 160, margin: 10, plotBorder: false })
    .createData({ id: 'rows', keyField: 'id', values: [{ id: 'a', x: -0, y: .5 }, { id: 'b', x: .5, y: .8 }] })
    .createPointMark({ id: 'points' }).encodeX({ field: 'x', scale: { id: 'x', domain: [0, 1], nice: false } }).encodeY({ field: 'y', scale: { id: 'y', domain: [0, 1], nice: false } });
  const frame = sampleTransition(planTransition({ from, to: from.editScale({ id: 'x', domain: [0, 2], nice: false }), options: { durationMs: 100, easing: 'linear', formatVersion: 6 } }), 37);
  const proof = animationFrameProvenance(frame), endpoint = { scene: frame.scene, identities: proof.endpoint.identities, backgrounds: proof.endpoint.backgrounds, positions: proof.positions, view: { progress: frame.progress } };
  return { kind: 'transition-plan', version: 6, kernels: { transition: 6, position: 'semantic-continuous-position@1', appearance: 'premultiplied-linear-srgb@1' }, durationMs: 100, easing: 'linear', from: endpoint, to: endpoint };
}
function wire(raw) {
  const compact = prepareAnimationColumnsV2(raw, createOfflineResourceScope(limits)).compact, root = new Map(compact.root.object);
  return { kind: raw.kind, version: 6, limits, kernels: { ...raw.kernels, columns: 'animation-columns@2', batchFrame: 1 }, durationMs: raw.durationMs, easing: raw.easing, from: root.get('from'), to: root.get('to'), vectors: compact.vectors };
}

test('format6 restores a closed complete endpoint and preserves its whole canonical payload', () => {
  const raw = fixture(), packed = projectBatchNumericColumns(raw), plan = restoreTransitionPlan(wire(packed)), saved = serializeAnimation(plan);
  assert.equal(serializeAnimation(deserializeAnimation(saved).plan), saved);
  assert.equal(animationFrameProvenance(sampleTransition(plan, 50)).native, undefined);
  const corrupt = JSON.parse(saved); corrupt.digest = corrupt.digest.replace(/^./, c => c === 'a' ? 'b' : 'a'); assert.throws(() => deserializeAnimation(JSON.stringify(corrupt)));
  const header = wire(packed);
  for (const mutate of [value => delete value.kernels.batchFrame, value => value.kernels.batchFrame = 2, value => value.version = 5, value => value.kernels.columns = 'animation-columns@1', value => value.limits = { maxEndpointNodes: 1, maxOutputNodes: 50 }]) {
    const copy = structuredClone(header); mutate(copy); assert.throws(() => restoreTransitionPlan(copy));
  }
});

test('malformed batch scene, decision and retained meaning cannot acquire an offline plan', () => {
  const raw = fixture();
  const mutations = [
    e => e.scene.version = 2, e => e.scene.extra = true, e => delete e.scene.width, e => e.scene.width = -1,
    e => e.scene.entries[0].kind = 'unknown', e => delete e.scene.entries[0].decision,
    e => e.scene.entries[1].extra = true, e => e.scene.entries[1].keys = [], e => e.scene.entries[1].keys[1] = e.scene.entries[1].keys[0],
    e => e.scene.entries[1].keys[0] = 3, e => e.scene.entries[1].topology = null,
    e => e.scene.entries[1].properties.radius[0] = -1, e => e.scene.entries[1].properties.appearance.unknown = true,
    e => e.scene.entries[1].decisions.kind = 'exact', e => e.scene.entries[1].decisions.kernel = 'partition', e => e.scene.entries[1].decisions.ownerKey = 'forged',
    e => e.scene.entries[1].decisions.role = 'label', e => e.scene.entries[1].decisions.itemKeys[0] = 'wrong', e => e.scene.entries[1].decisions.sourceIndices[0] = -1,
    e => e.scene.entries[1].decisions.targetIndices[0] = .5, e => e.scene.entries[1].decisions.targetIndices[0] = 50,
    e => e.scene.entries[1].decisions.itemKeys.pop(), e => e.scene.entries[1].decisions = null,
    e => e.positions.pop(), e => e.positions[0].kind = 'point-run', e => e.positions[0].extra = 1,
    e => e.positions[1].kind = 'single', e => e.positions[1].x.values.pop(), e => e.positions[1].x.scale.range[1] += 10,
    e => e.positions[1].x.values[1] += 10, e => e.identities.pop(), e => e.backgrounds[0].index = 200,
    e => e.view.extra = 1, e => e.view.progress = 0, e => e.view.timeMs = Infinity
  ];
  for (const [index, mutate] of mutations.entries()) {
    const copy = structuredClone(raw); mutate(copy.from);
    assert.throws(() => restoreTransitionPlan(wire(projectBatchNumericColumns(copy))), undefined, `mutation ${index}`);
  }
});

test('numeric packet lengths, cells and whole logical quotas precede expanded numeric allocation', () => {
  const packed = projectBatchNumericColumns(fixture());
  const mutations = [
    p => p.from.scene.entries[1].properties.x.length++,
    p => p.from.scene.entries[1].properties.x.base64 = '!',
    p => p.from.scene.entries[1].properties.x.kind = 'float64-be',
    p => p.from.scene.entries[1].properties.x.extra = 1,
    p => p.from.positions[1].x.values.length--,
    p => p.from.scene.entries[1].decisions.targetIndices.length--,
    p => p.from.scene.entries[1].keys = Array(10001).fill('key'),
    p => p.from.scene.entries[1].properties.appearance.fill = 'x'.repeat(36000000)
  ];
  for (const mutate of mutations) {
    const copy = structuredClone(packed); mutate(copy);
    let count = 0; const original = Array.from; Array.from = (...args) => { count++; return original(...args); };
    try { assert.throws(() => restoreBatchNumericColumns(copy, createOfflineResourceScope(limits))); assert.equal(count, 0); }
    finally { Array.from = original; }
  }
  assert.throws(() => restoreBatchNumericColumns(packed, createOfflineResourceScope(limits), 16000000), /cells/);
  let reads = 0; const value = structuredClone(packed); Object.defineProperty(value.from.scene.entries[1].properties, 'x', { enumerable: true, get() { reads++; return []; } });
  assert.throws(() => restoreBatchNumericColumns(value, createOfflineResourceScope(limits)), /accessor/); assert.equal(reads, 0);
});

test('native caller-authored batch columns use numeric transport without granting item identity', () => {
  let from = chart().createCanvas({ width: 100, height: 100, margin: 0 }).createGraphics({ id: 'dots', type: 'circle-batch', parent: 'plot-main' });
  for (const [property, value] of Object.entries({ x: [-0, 20], y: [20, 30], radius: [3, 4], appearance: { fill: 'red', opacity: .4 } })) from = from.editGraphics({ target: 'dots', property, value });
  const to = from.editGraphics({ target: 'dots', property: 'x', value: [10, 30] });
  const plan = planTransition({ from, to, options: { durationMs: 100, formatVersion: 6 } }), saved = serializeAnimation(plan), restored = deserializeAnimation(saved).plan;
  assert.equal(serializeAnimation(restored), saved);
  for (const time of [0, 50, 100]) assert.deepEqual(sampleTransition(restored, time), sampleTransition(plan, time));
  assert.ok(animationFrameProvenance(sampleTransition(plan, 50)).endpoint.identities.every(identity => identity === undefined));
  const raw = { from: { graphicSpec: from.graphicSpec }, to: { graphicSpec: to.graphicSpec } }, packed = projectBatchNumericColumns(raw);
  assert.deepEqual(restoreBatchNumericColumns(packed, createOfflineResourceScope(limits)), raw);
  assert.equal(Object.is(restoreBatchNumericColumns(packed, createOfflineResourceScope(limits)).from.graphicSpec.objects.dots.properties.x[0], -0), true);
});

test('format6 compound constants retain exact owned values while legacy encoders and expansion quotas stay fixed', async () => {
  const { cloneAndFreeze, freezeOwned } = await import('../../../src/core/immutable.js');
  const { prepareAnimationColumnsV2WithConstants, restoreAnimationColumnsV2, validateAnimationColumnsV2 } = await import('../../../src/animation/columnCodec.js');
  const shared = { signed: -0, missing: undefined, sparse: [, 1], ordered: { z: 1, a: 2 } };
  const input = Array.from({ length: 20 }, (_, id) => ({ id, shared })), owned = cloneAndFreeze(input), scoped = () => createOfflineResourceScope(limits);
  // cloneAndFreeze copies unowned repeated references; explicitly use one exact
  // owned compound in every row, as native endpoint scale preparation does.
  const same = owned.map(row => ({ ...row, shared: owned[0].shared }));
  const legacy = prepareAnimationColumnsV2(same, scoped()), compact = prepareAnimationColumnsV2WithConstants(same, scoped());
  assert.equal(compact.metrics.logicalValues, legacy.metrics.logicalValues);
  assert.equal(compact.metrics.cellVisits, legacy.metrics.cellVisits);
  assert.ok(compact.metrics.physicalValues < legacy.metrics.physicalValues);
  assert.deepEqual(restoreAnimationColumnsV2(compact.compact, scoped()), same);
  assert.deepEqual(prepareAnimationColumnsV2(same, scoped()).compact, legacy.compact);
  assert.deepEqual(prepareAnimationColumnsV2WithConstants(input, scoped()).compact, prepareAnimationColumnsV2(input, scoped()).compact);
  const nested = freezeOwned({ records: [{ value: 1 }, { value: 2 }] });
  const nestedRows = Array.from({ length: 20 }, () => ({ nested }));
  assert.deepEqual(prepareAnimationColumnsV2WithConstants(nestedRows, scoped()), prepareAnimationColumnsV2(nestedRows, scoped()));
  const singletonNested = freezeOwned({ singleton: [nested] });
  assert.deepEqual(prepareAnimationColumnsV2WithConstants([{ singletonNested }, { singletonNested }], scoped()), prepareAnimationColumnsV2([{ singletonNested }, { singletonNested }], scoped()));
  const hostile = structuredClone(prepareAnimationColumnsV2WithConstants(same.map(row => ({ shared: row.shared })), scoped()).compact);
  hostile.root.records.length = 1000000;
  const column = hostile.root.records.columns[0][1][0][1];
  column.constant.extra = Array(20).fill(0);
  // The physically tiny constant would expand past 12M logical values. Both
  // validation and restoration reject before constructing a single row.
  assert.throws(() => validateAnimationColumnsV2(hostile, scoped()), /expandedValues/);
  let allocations = 0; const original = Array.from;
  Array.from = (...args) => { allocations++; return original(...args); };
  try { assert.throws(() => restoreAnimationColumnsV2(hostile, scoped()), /expandedValues/); assert.equal(allocations, 0); }
  finally { Array.from = original; }
});

test('format6 restores compound constants once only after full validation and never trusts shallow ownership', async () => {
  const { cloneAndFreeze, freezeOwned, isOwned } = await import('../../../src/core/immutable.js');
  const { prepareAnimationColumnsV2WithConstants, validateAnimationColumnsV2, validateAnimationColumnsV2WithOwnedConstants } = await import('../../../src/animation/columnCodec.js');
  const shared = cloneAndFreeze({ signed: -0, missing: undefined, sparse: [, 1], ordered: { z: 1, a: 2 }, big: 1n }), scoped = () => createOfflineResourceScope(limits);
  const compact = structuredClone(prepareAnimationColumnsV2WithConstants(Array.from({ length: 1000 }, (_, id) => ({ id, shared })), scoped()).compact);
  const legacy = validateAnimationColumnsV2(compact, scoped()), prepared = validateAnimationColumnsV2WithOwnedConstants(compact, scoped());
  const metrics = proof => Object.fromEntries(Object.entries(proof).filter(([key]) => key !== 'restore'));
  assert.deepEqual(metrics(prepared), metrics(legacy));
  const expected = legacy.restore(), actual = prepared.restore(); assert.deepEqual(actual, expected);
  assert.equal(actual[0].shared, actual[999].shared); assert.notEqual(actual[0].shared, expected[0].shared);
  function owned(value) { if (value && typeof value === 'object') { assert.ok(isOwned(value) && Object.isFrozen(value)); for (const child of Object.values(value)) owned(child); } }
  owned(actual[0].shared);
  const column = value => value.root.records.columns[0][1].find(([key]) => key === 'shared')[1];
  column(compact).constant.ordered.z = 5; assert.equal(prepared.restore()[0].shared.ordered.z, 1);
  const shallow = structuredClone(compact); column(shallow).constant = freezeOwned({ child: { value: 3 } });
  const snapshot = validateAnimationColumnsV2WithOwnedConstants(shallow, scoped()).restore();
  column(shallow).constant.child.value = 9; assert.equal(snapshot[0].shared.child.value, 3); owned(snapshot[0].shared);
  const failure = (validate, input) => {
    const scope = scoped(), original = Object.freeze; let count = 0, error;
    Object.freeze = value => { count++; return original(value); };
    try { validate(input, scope); assert.fail('accepted malformed constant'); } catch (value) { error = [value.name, value.message]; } finally { Object.freeze = original; }
    assert.notEqual(error[0], 'AssertionError'); return { count, error };
  };
  const malformed = structuredClone(compact); malformed.root.records.columns[0][1].shift();
  assert.deepEqual(failure(validateAnimationColumnsV2WithOwnedConstants, malformed), failure(validateAnimationColumnsV2, malformed));
  const oversized = structuredClone(prepareAnimationColumnsV2WithConstants([{ shared }, { shared }], scoped()).compact);
  oversized.root.records.length = 1000000; oversized.root.records.columns[0][1][0][1].constant.extra = Array(20).fill(0);
  assert.deepEqual(failure(validateAnimationColumnsV2WithOwnedConstants, oversized), failure(validateAnimationColumnsV2, oversized));
  assert.match(failure(validateAnimationColumnsV2WithOwnedConstants, oversized).error[1], /expandedValues/);
  let reads = 0; const getter = structuredClone(compact); Object.defineProperty(column(getter).constant, 'getter', { enumerable: true, get() { reads++; return 1; } });
  assert.throws(() => validateAnimationColumnsV2WithOwnedConstants(getter, scoped()), /accessor/); assert.equal(reads, 0);
});
