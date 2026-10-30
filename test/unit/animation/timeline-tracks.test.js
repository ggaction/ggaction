import test from 'node:test';
import assert from 'node:assert/strict';
import { chart, hconcat } from '../../../src/index.js';
import { planTransition, transitionGeos, transitionGuides } from '../../../src/animation/planner.js';
import { prepareAnimationTimeline, sampleAnimationTimeline } from '../../../src/animation/timelineTracks.js';
import { graphicAnimationOwnerKey } from '../../../src/grammar/animation/ownerKey.js';
import { geoAnimationItemKey } from '../../../src/materialization/animation/geoPresentation.js';
import { parsePaintColor } from '../../../src/grammar/color.js';

const options = { durationMs: 100, easing: 'linear' };
const points = () => chart().createCanvas({ width: 300, height: 200, margin: 20 })
  .createData({ id: 'rows', keyField: 'id', values: [{ id: 'a', x: 1, y: 2 }] })
  .createPointMark({ id: 'points', fill: 'black', stroke: 'red', strokeWidth: 2, opacity: .2 })
  .encodeX({ field: 'x', scale: { domain: [0, 10], nice: false } }).encodeY({ field: 'y', scale: { domain: [0, 10], nice: false } });
function context(from, to = from) {
  const plan = planTransition({ from, to, options });
  return { from: plan.from, to: plan.to, tracks: plan.tracks, guides: transitionGuides(plan), geos: transitionGeos(plan) };
}
const track = (target, property, kernel, first, last, extra = {}) => ({ target, property, kernel,
  keyframes: [{ timeMs: 0, value: first }, { timeMs: 100, value: last }], ...extra });
const item = state => state.tracks.find(value => value.key !== undefined);
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} vs ${b}`);
const prepare = (state, tracks, extra = {}) => prepareAnimationTimeline({ ...options, tracks, ...extra }, state);

test('native owner progress and item paint schedules preserve exact endpoints and caller input', () => {
  const from = points(), state = context(from, from.editPointMark({ fill: 'white', strokeWidth: 8, opacity: .8 }));
  const target = { itemKey: item(state).key }, ownerKey = graphicAnimationOwnerKey(state.to.identities[item(state).targetIndex]);
  const tracks = [track({ ownerKey }, 'geometry', 'native-progress', 0, 1),
    track(target, 'fill', 'color', 'black', '#fff'), track(target, 'opacity', 'number', .2, .8), track(target, 'strokeWidth', 'positive-scale', 2, 8)];
  const before = JSON.stringify([from, tracks]), prepared = prepare(state, tracks), middle = sampleAnimationTimeline(prepared, 50);
  assert.deepEqual(middle.ownerProgress, [{ ownerKey, progress: .5 }]);
  assert.equal(middle.styles.find(value => value.property === 'opacity').value, .5);
  close(middle.styles.find(value => value.property === 'strokeWidth').value, 4);
  close(parsePaintColor(middle.styles.find(value => value.property === 'fill').value).r, .7353569830524495);
  assert.equal(sampleAnimationTimeline(prepared, -1).styles[0].value, 'black');
  assert.equal(sampleAnimationTimeline(prepared, 101).styles[0].value, 'white');
  assert.equal(JSON.stringify([from, tracks]), before); assert.ok(Object.isFrozen(prepared.tracks[0].keyframes));
  tracks[0].keyframes[1].value = 0;
  assert.equal(sampleAnimationTimeline(prepared, 100).ownerProgress[0].progress, 1);
  assert.throws(() => sampleAnimationTimeline(structuredClone(prepared), 50), /authentic/);
  assert.throws(() => sampleAnimationTimeline(prepared, NaN), /finite/);
});

test('target aliases share one composite slot and resolved overlays preserve native boundaries', () => {
  const from = points(), state = context(from, from.editPointMark({ opacity: .8 })), matched = item(state);
  const base = track({ itemKey: matched.key }, 'opacity', 'number', .2, .8, { priority: 0 });
  const overlay = track({ itemKey: matched.key, role: matched.role }, 'opacity', 'number', .9, .4, { priority: 1 });
  overlay.keyframes[0].timeMs = 25; overlay.keyframes[1].timeMs = 75;
  assert.throws(() => prepare(state, [base, overlay]), /Overlapping/);
  const prepared = prepare(state, [base, overlay], { composite: 'priority' });
  assert.equal(sampleAnimationTimeline(prepared, 50).styles.length, 1);
  close(sampleAnimationTimeline(prepared, 50).styles[0].value, .65);
  assert.equal(sampleAnimationTimeline(prepared, 0).styles[0].value, .2);
  assert.equal(sampleAnimationTimeline(prepared, 100).styles[0].value, .8);
  overlay.keyframes[0].timeMs = 0;
  assert.throws(() => prepare(state, [base, overlay], { composite: 'priority' }), /boundary/);
});

test('source scopes and guide raw identities select their exact native targets', () => {
  const base = points().editCanvas({ margin: 60 }).createXAxis({ title: false, ticksAndLabels: { values: [0, 1] } });
  const compose = p => hconcat({ id: 'pair', programs: [{ id: 'left', program: p }, { id: 'right', program: base }] });
  const state = context(compose(base), compose(base.editPointMark({ fill: 'white' })));
  const marks = state.tracks.filter(value => value.key !== undefined);
  const ownerKey = graphicAnimationOwnerKey(state.to.identities[marks[0].targetIndex]);
  const prepared = prepare(state, [track({ ownerKey }, 'geometry', 'native-progress', 0, 1)]);
  assert.equal(sampleAnimationTimeline(prepared, 50).ownerProgress.length, 1);
  assert.notEqual(ownerKey, graphicAnimationOwnerKey(state.to.identities[marks[1].targetIndex]));
  const guide = state.tracks.find(value => value.guideKey !== undefined && state.to.scene.nodes[value.targetIndex].properties.stroke !== undefined);
  const stroke = state.to.scene.nodes[guide.targetIndex].properties.stroke;
  const guidePlan = prepare(state, [track({ guideKey: guide.guideKey }, 'stroke', 'color', stroke, stroke)]);
  assert.equal(sampleAnimationTimeline(guidePlan, 50).styles[0].binding.kind, 'guide');
  assert.throws(() => prepare(state, [track({ guideKey: guide.guideKey, itemKey: marks[0].key }, 'stroke', 'color', stroke, stroke)]), /cannot contain/);
  assert.throws(() => prepare(state, [track({ ownerKey: '[[],"points"]' }, 'geometry', 'native-progress', 0, 1)]), /native owner/);
  assert.throws(() => prepare(state, [track({ guideKey: 'missing' }, 'stroke', 'color', 'black', 'black')]), /compatible/);
});

test('incompatible or missing native primitives cannot acquire a style track', () => {
  const from = points(), state = context(from, from.editPointMark({ shape: 'square' })), target = { itemKey: item(state).key };
  assert.throws(() => prepare(state, [track(target, 'opacity', 'number', .2, .2)]), /compatible/);
  const exact = context(from), matched = item(exact);
  const other = { ...matched, role: 'other', kind: 'crossfade', reason: 'appearance' };
  const ambiguous = { ...exact, tracks: [...exact.tracks, other] };
  assert.throws(() => prepare(ambiguous, [track(target, 'opacity', 'number', .2, .2)]), /explicit role/);
  assert.equal(sampleAnimationTimeline(prepare(ambiguous, [track({ ...target, role: matched.role }, 'opacity', 'number', .2, .2)]), 50).styles.length, 1);
  for (const selector of [{}, { itemKey: 'missing' }, { itemKey: target.itemKey, role: '' }, { itemKey: target.itemKey, role: 'missing' }, { itemKey: 0 }, { ownerKey: '[[],"missing"]' }]) {
    assert.throws(() => prepare(exact, [track(selector, selector.ownerKey ? 'geometry' : 'opacity', selector.ownerKey ? 'native-progress' : 'number', 0, 1)]));
  }
});

test('hidden geographic features bind whole-feature paint without dynamic primitive selectors', () => {
  const from = chart().createCanvas({ width: 300, height: 200, margin: 0 })
    .createGeometryData({ id: 'world', format: 'geojson', coordinateKind: 'geographic', featureKey: ['properties', 'id'],
      values: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { id: 'a' }, geometry: { type: 'Point', coordinates: [0, 0] } }] } })
    .createProjection({ id: 'map', type: 'orthographic', scalePx: 50, translatePx: [-100, 100], clipExtentPx: [[0, 0], [300, 200]] })
    .createCoordinate({ type: 'geo' }).createGeoPointMark({ id: 'places', fill: 'black' });
  const state = context(from, from.editProjection({ translatePx: [400, 100] }).editGeoPointMark({ fill: 'white' }));
  const geometry = state.geos.to.groups[0].presentation.geometry;
  const key = geoAnimationItemKey(geometry, geometry.features[0].key);
  assert.equal(state.from.scene.nodes.filter(value => value.type === 'circle').length, 0);
  assert.equal(state.to.scene.nodes.filter(value => value.type === 'circle').length, 0);
  const prepared = prepare(state, [track({ itemKey: key }, 'fill', 'color', 'black', 'white')]);
  const style = sampleAnimationTimeline(prepared, 50).styles[0];
  assert.equal(style.binding.kind, 'geo'); assert.equal(style.binding.featureKey, geometry.features[0].key);
  close(parsePaintColor(style.value).r, .7353569830524495);
  assert.throws(() => prepare(state, [track({ itemKey: key, role: 'body' }, 'fill', 'color', 'black', 'white')]), /compatible/);
  const fallback = context(from, from.editProjection({ type: 'equirectangular' }));
  assert.throws(() => prepare(fallback, [track({ itemKey: key }, 'fill', 'color', 'black', 'black')]), /compatible/);
});

test('property kernels, endpoint values, raw colors and closed authored shapes are validated atomically', () => {
  const from = points(), state = context(from), target = { itemKey: item(state).key };
  for (const [property, kernel, a, b] of [['x', 'number', 0, 1], ['fill', 'number', 0, 1], ['opacity', 'color', 'red', 'red'],
    ['geometry', 'number', 0, 1], ['opacity', 'number', -.1, .2], ['opacity', 'number', .2, 1.1], ['strokeWidth', 'number', 2, -1],
    ['strokeWidth', 'positive-scale', 0, 2], ['fill', 'color', {}, 'black'], ['fill', 'color', 'currentColor', 'black'],
    ['fill', 'color', 'red', 'black'], ['strokeWidth', 'number', 2, 4]]) {
    assert.throws(() => prepare(state, [track(target, property, kernel, a, b)]));
  }
  const valid = track(target, 'opacity', 'number', .2, .2);
  for (const mutate of [value => value.extra = 1, value => value.target.extra = 1, value => value.keyframes[0].extra = 1,
    value => value.keyframes[0].easingToNext = undefined, value => value.priority = 1.5, value => value.keyframes = []]) {
    const input = structuredClone(valid); mutate(input); assert.throws(() => prepare(state, [input]));
  }
  assert.throws(() => prepare(state, undefined), /array/);
  assert.throws(() => prepareAnimationTimeline({ ...options, extra: 1 }, state), /Unknown/);
  assert.throws(() => prepare(state, [], { easing: undefined }), /explicit/);
  assert.throws(() => prepare(state, [], { easing: 'bounce' }), /easing/);
  assert.throws(() => prepare(state, [], { durationMs: -1 }), /non-negative/);
  const missing = context(chart().createCanvas().createData({ values: [{ x: 1, y: 2 }] }).createPointMark().encodeX({ field: 'x' }).encodeY({ field: 'y' }));
  assert.throws(() => prepare(missing, [track({ itemKey: item(missing).key }, 'strokeWidth', 'number', 0, 1)]));
});

test('marker-only schedules, default easing, transparent paint and zero-duration endpoints remain explicit', () => {
  const from = points().editPointMark({ fill: 'none' }), state = context(from, from.editPointMark({ fill: 'red' })), target = { itemKey: item(state).key };
  const markerOnly = prepareAnimationTimeline({ ...options, markers: [{ id: 'middle', timeMs: 50 }] }, state);
  assert.deepEqual(markerOnly.markers, [{ id: 'middle', timeMs: 50 }]);
  assert.deepEqual(sampleAnimationTimeline(markerOnly, 50), { ownerProgress: [], styles: [] });
  const paint = prepare(state, [track(target, 'fill', 'color', 'none', 'red')]);
  close(parsePaintColor(sampleAnimationTimeline(paint, 50).styles[0].value).a, .5);
  assert.equal(sampleAnimationTimeline(paint, 0).styles[0].value, 'none');
  const ownerKey = graphicAnimationOwnerKey(state.to.identities[item(state).targetIndex]);
  const curved = prepare(state, [track({ ownerKey }, 'geometry', 'native-progress', 0, 1)], { easing: 'cubic-in-out' });
  assert.equal(sampleAnimationTimeline(curved, 25).ownerProgress[0].progress, .0625);
  const zero = prepare(state, [{ target: { ownerKey }, property: 'geometry', kernel: 'native-progress', keyframes: [{ timeMs: 0, value: 1 }] }], { durationMs: 0 });
  assert.equal(sampleAnimationTimeline(zero, 0).ownerProgress[0].progress, 1);
});

test('authored descriptors, array capacity and text work guards fail before execution or unbounded preparation', () => {
  const state = context(points()), target = { itemKey: item(state).key }, valid = track(target, 'opacity', 'number', .2, .2);
  let reads = 0;
  const accessor = {}; Object.defineProperty(accessor, 'property', { enumerable: true, get() { reads++; return 'opacity'; } });
  assert.throws(() => prepare(state, [accessor]), /accessor/);
  const targetAccessor = { get itemKey() { reads++; return target.itemKey; } };
  assert.throws(() => prepare(state, [{ ...valid, target: targetAccessor }]), /accessor/);
  const frame = { timeMs: 0, get value() { reads++; return .2; } };
  assert.throws(() => prepare(state, [{ ...valid, keyframes: [frame] }]), /accessor/);
  assert.throws(() => prepare(state, new Array(1)), /dense/);
  assert.throws(() => prepare(state, Array(10001).fill(valid)), /10000/);
  assert.throws(() => prepare(state, [{ ...valid, keyframes: Array(10001).fill({ timeMs: 0, value: .2 }) }]), /10000/);
  assert.throws(() => prepare(state, [track({ itemKey: 'a'.repeat(10000001) }, 'opacity', 'number', .2, .2)]), /work/);
  assert.throws(() => prepare(state, [track(target, 'fill', 'color', 'a'.repeat(10000001), 'black')]), /work/);
  assert.equal(reads, 0);
});
