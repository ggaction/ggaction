import test from 'node:test';
import assert from 'node:assert/strict';
import { cloneAndFreeze } from '../../../src/core/immutable.js';
import { parsePaintColor } from '../../../src/grammar/color.js';
import { ANIMATION_APPEARANCE_VERSION, prepareAnimationAppearance, sampleAnimationAppearance } from '../../../src/animation/appearance.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`);
const plan = (from, to) => prepareAnimationAppearance(from, to);

test('solid appearance uses the versioned premultiplied linear-light color kernel', () => {
  const prepared = plan({ fill: '#000', stroke: 'transparent' }, { fill: '#fff', stroke: 'red' });
  assert.equal(ANIMATION_APPEARANCE_VERSION, 'premultiplied-linear-srgb@1');
  const middle = sampleAnimationAppearance(prepared, .5), fill = parsePaintColor(middle.fill), stroke = parsePaintColor(middle.stroke);
  close(fill.r, .7353569830524495); close(fill.g, fill.r); close(fill.b, fill.r); assert.equal(fill.a, 1);
  close(stroke.r, 1); assert.deepEqual([stroke.g, stroke.b, stroke.a], [0, 0, .5]);
  assert.deepEqual(sampleAnimationAppearance(prepared, 0), { fill: '#000', stroke: 'transparent' });
  assert.deepEqual(sampleAnimationAppearance(prepared, 1), { fill: '#fff', stroke: 'red' });
});

test('none paint gains visible chroma with alpha and opaque equal colors stay unchanged', () => {
  const prepared = plan({ fill: 'none', stroke: 'blue' }, { fill: 'red', stroke: 'blue' });
  const fill = parsePaintColor(sampleAnimationAppearance(prepared, .25).fill);
  close(fill.r, 1); assert.deepEqual([fill.g, fill.b, fill.a], [0, 0, .25]);
  assert.deepEqual(sampleAnimationAppearance(plan({ fill: 'red' }, { fill: 'red' }), .5), {});
  assert.deepEqual(parsePaintColor(sampleAnimationAppearance(plan({ fill: 'transparent' }, { fill: '#0000' }), .5).fill), { r: 0, g: 0, b: 0, a: 0 });
});

test('opacity and explicit stroke width interpolate without inventing missing stroke geometry', () => {
  const prepared = plan({ strokeWidth: 1 }, { strokeWidth: 5, opacity: .2 });
  assert.deepEqual(sampleAnimationAppearance(prepared, .5), { opacity: .6, strokeWidth: 3 });
  assert.deepEqual(sampleAnimationAppearance(plan({ opacity: .2 }, {}), .5), { opacity: .6 });
  assert.equal(plan({}, { strokeWidth: 5 }).reason, 'appearance');
  assert.equal(plan({ strokeWidth: 5 }, {}).reason, 'appearance');
});

test('structured fills, changed effects, static policy and unresolved colors remain explicit fallbacks', () => {
  const paint = cloneAndFreeze({ type: 'pattern', style: 'dots', pitch: 12 });
  for (const [from, to] of [
    [{ fill: paint }, { fill: paint }], [{ fill: null }, { fill: 'red' }], [{ fill: 'red' }, { fill: paint }],
    [{ fontFamily: 'serif' }, { fontFamily: 'sans-serif' }],
    [cloneAndFreeze({ shadow: { color: 'red' } }), cloneAndFreeze({ shadow: { color: 'blue' } })],
    [{ fill: 'var(--color)' }, { fill: 'red' }], [{ fill: 1 }, { fill: 'red' }], [{ fill: 'red' }, {}]
  ]) assert.deepEqual(plan(from, to), { kind: 'crossfade', reason: 'appearance' });
  const fixed = cloneAndFreeze({ shadow: { color: 'red' }, strokeDash: [2, 1], fill: 'red' });
  assert.deepEqual(sampleAnimationAppearance(plan(fixed, fixed), .5), {});
});

test('style admission and sampling reject malformed numbers and host access without side effects', () => {
  let reads = 0;
  assert.throws(() => plan({ get fill() { reads++; return 'red'; } }, { fill: 'blue' }), /own data/);
  const shadow = { get color() { reads++; return 'red'; } };
  assert.equal(plan({ shadow }, { shadow }).reason, 'appearance');
  assert.equal(reads, 0);
  for (const value of [null, [], new Date(), 1]) assert.throws(() => plan(value, {}), /plain object/);
  for (const value of [NaN, Infinity, -.1, 1.1, null, undefined]) {
    assert.throws(() => plan({ opacity: value }, { opacity: 1 }));
    assert.throws(() => plan({ opacity: value }, { opacity: value }));
  }
  for (const value of [NaN, Infinity, -1]) assert.throws(() => plan({ strokeWidth: value }, { strokeWidth: 1 }));
  const prepared = plan({ fill: 'red' }, { fill: 'blue' });
  for (const value of [NaN, Infinity, -.1, 1.1]) assert.throws(() => sampleAnimationAppearance(prepared, value));
  assert.throws(() => sampleAnimationAppearance(structuredClone(prepared), .5), /authentic/);
  assert.throws(() => sampleAnimationAppearance(plan({ fill: null }, {}), .5), /authentic/);
});

test('appearance plans and patches snapshot inputs and never retain mutable style objects', () => {
  const from = { fill: 'red', opacity: .2 }, to = { fill: 'blue', opacity: .8 }, prepared = plan(from, to);
  const first = sampleAnimationAppearance(prepared, .5);
  from.fill = 'white'; to.opacity = 0;
  assert.deepEqual(sampleAnimationAppearance(prepared, .5), first);
  assert.ok(Object.isFrozen(prepared.entries[0].from));
  assert.ok(Object.isFrozen(first));
});
