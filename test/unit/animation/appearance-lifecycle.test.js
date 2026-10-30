import test from 'node:test';
import assert from 'node:assert/strict';
import { chart, hconcat } from '../../../src/index.js';
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from '../../../src/animation.js';
import { exportTransitionPlan, restoreTransitionPlan } from '../../../src/animation/planner.js';
import { parsePaintColor } from '../../../src/grammar/color.js';
import { createInteractionSession } from '../../../src/interaction.js';
import { getMarkItems } from '../../../src/inspection.js';
import { animationFrameProvenance } from '../../../src/animation/frameProvenance.js';
import { animationAppearanceFrame } from '../../support/animation-appearance-frame.js';

const options = { durationMs: 100, easing: 'linear' };
const plan = (from, to) => planTransition({ from, to, options });
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} vs ${b}`);
const circle = frame => frame.scene.nodes.find(node => node.type === 'circle');

test('public solid style and geometry share a versioned current frame with exact native endpoints', () => {
  for (const mode of ['gamma', 'alpha', 'rebased']) {
    const { from, to, plan: prepared, frame } = animationAppearanceFrame(mode);
    assert.equal(prepared.version, 2);
    const color = parsePaintColor(circle(frame).properties.fill);
    if (mode === 'alpha') { close(color.r, 1); close(color.g, 0); close(color.a, .5); }
    else { close(color.r, mode === 'rebased' ? .8808250210902997 : .7353569830524495); close(color.a, 1); }
    assert.equal(sampleTransition(prepared, 100).graphicSpec, to.graphicSpec);
    if (mode !== 'rebased') assert.equal(sampleTransition(prepared, 0).graphicSpec, from.graphicSpec);
    const restored = deserializeAnimation(serializeAnimation(prepared)).plan;
    assert.deepEqual(sampleTransition(restored, 50), frame);
  }
});

test('opacity and explicit stroke width interpolate with fill and stroke without mutating source programs', () => {
  const { from } = animationAppearanceFrame();
  const first = from.editPointMark({ fill: 'red', stroke: 'black', strokeWidth: 2, opacity: .2 });
  const last = first.editPointMark({ fill: 'blue', stroke: 'white', strokeWidth: 6, opacity: .8 });
  const before = JSON.stringify([first, last]), prepared = plan(first, last), properties = circle(sampleTransition(prepared, 50)).properties;
  assert.equal(properties.opacity, .5); assert.equal(properties.strokeWidth, 4);
  const fill = parsePaintColor(properties.fill), stroke = parsePaintColor(properties.stroke);
  close(fill.r, .7353569830524495); close(fill.g, 0); close(fill.b, .7353569830524495);
  close(stroke.r, .7353569830524495);
  assert.equal(JSON.stringify([first, last]), before);
  assert.ok(Object.isFrozen(properties));
});

test('current appearance rebases in both directions and composition scopes without retaining an earlier plan chain', () => {
  const { from, to } = animationAppearanceFrame();
  const compose = p => hconcat({ id: 'pair', programs: [{ id: 'left', program: p }, { id: 'right', program: p }] });
  let current = sampleTransition(plan(compose(from), compose(to)), 50);
  for (let index = 0; index < 40; index++) {
    const next = index % 2 ? plan(current, compose(from)) : plan(compose(to), current);
    assert.equal(sampleTransition(next, index % 2 ? 0 : 100), current);
    current = sampleTransition(next, 40);
    assert.equal(current.scene.nodes.filter(node => node.type === 'circle').length, 2);
    assert.equal(Object.hasOwn(animationFrameProvenance(current), 'plan'), false);
  }
  assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(plan(current, compose(from)))).plan, 60), sampleTransition(plan(current, compose(from)), 60));
});

test('strict transport rejects old or missing appearance policy before creating a restored plan', () => {
  const { plan: prepared } = animationAppearanceFrame(), saved = exportTransitionPlan(prepared);
  assert.equal(saved.kernels.appearance, 'premultiplied-linear-srgb@1');
  for (const mutate of [p => p.version = 1, p => p.kernels.transition = 1, p => delete p.kernels.appearance, p => p.kernels.appearance = 'future', p => p.kernels.appearance = undefined]) {
    const payload = structuredClone(saved); mutate(payload); assert.throws(() => restoreTransitionPlan(payload));
  }
  assert.deepEqual(sampleTransition(restoreTransitionPlan(structuredClone(saved)), 50), sampleTransition(prepared, 50));
});

test('a point becoming visible uses current ink for hit and keyboard selection', () => {
  const { from: original } = animationAppearanceFrame('alpha');
  const from = original.selectMarks({id:'picked',target:'points',items:[],empty:'none'});
  const to = from.editPointMark({ fill: 'red', opacity: 1 });
  const key = getMarkItems(to, { target: 'points' })[0].key;
  const session = createInteractionSession({ program: from,
    bindings: [{ type: 'keyboard', targets: [{ target: 'points', activation: { type: 'select', selection: 'picked' } }] }] });
  try {
    const frame = sampleTransition(plan(from, to), 50), node = circle(frame);
    session.dispatch({ type: 'frame', frame, version: 1, generation: session.getState().generation });
    session.dispatch({ type: 'inspect', point: { x: node.properties.x, y: node.properties.y }, slop: 0 });
    assert.equal(session.getState().hit.target.itemKey, key);
    session.dispatch({ type: 'focus', target: 'points', itemKey: key });
    assert.equal(session.getState().focus.itemKey, key);
    session.dispatch({ type: 'activate' });
    assert.equal(session.getState().history.undoCount, 1);
    assert.equal(session.getState().animationFrame, null);
  } finally { session.destroy(); }
});

test('geographic native streaming interpolates solid appearance while preserving the exact feature origin', () => {
  const from = chart().createCanvas({ width: 200, height: 100, margin: 0 })
    .createGeometryData({ id: 'world', format: 'geojson', coordinateKind: 'geographic', featureKey: ['properties', 'id'],
      values: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { id: 'a' }, geometry: { type: 'Point', coordinates: [0, 0] } }] } })
    .createProjection({ id: 'map', type: 'equirectangular', scalePx: 30, translatePx: [100, 50] })
    .createCoordinate({ type: 'geo' }).createGeoPointMark({ id: 'places', fill: 'black', stroke: 'none', strokeWidth: 0 });
  const to = from.editProjection({ translatePx: [140, 50] }).editGeoPointMark({ target: 'places', fill: 'white', opacity: .5 });
  const prepared = plan(from, to), frame = sampleTransition(prepared, 50), node = circle(frame);
  close(parsePaintColor(node.properties.fill).r, .7353569830524495);
  close(node.properties.x, 120); close(node.properties.opacity, .75);
  assert.equal(frame.decisions.find(d => d.kind === 'geographic').kernel, 'native-geo');
  assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(prepared)).plan, 50), frame);
  const rebased = plan(frame, from);
  assert.equal(sampleTransition(rebased, 0), frame);
  close(parsePaintColor(circle(sampleTransition(rebased, 50)).properties.fill).r, .5370987304831942);
});
