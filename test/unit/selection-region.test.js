import test from 'node:test';
import assert from 'node:assert/strict';
import { angularBrushIntervals, normalizeSelectionRegion, normalizeScreenPolygon, selectRegionItemKeys } from '../../src/grammar/selectionRegion.js';
import { selectScreenPolygonKeys } from '../../src/grammar/lassoSelection.js';
const point = (x, y) => ({ x, y });
const square = [point(0, 0), point(10, 0), point(10, 10), point(0, 10)];
const item = (key, channels) => ({ key, channels });
const range = (min, max, extra = {}) => ({ min, max, ...extra });

test('combines channels by intersection and disjoint ranges by union at the final grain', () => {
  const items = [item('a', { x: 1, y: true }), item('b', { x: 2, y: 'true' }), item('c', { x: 5, y: true }), item('d', { x: 8, y: true }), item('e', { y: true })];
  const region = { x: { ranges: [range(0, 2, { maxInclusive: false }), range(7, 9)] }, y: { values: [true, true] } };
  assert.deepEqual(selectRegionItemKeys(items, region), ['a', 'd']);
  assert.deepEqual(normalizeSelectionRegion(region).y.values, [true]);
  assert.deepEqual(selectRegionItemKeys(items, { x: { ranges: [] } }), []);
  assert.deepEqual(selectRegionItemKeys(items, { y: { values: [] } }), []);
  assert.deepEqual(selectRegionItemKeys([], region), []);
  for (const options of [{maxInclusive:false}, {minInclusive:false}]) {
    const a = range(0,2,Object.hasOwn(options,'maxInclusive') ? options : {});
    const b = range(2,5,Object.hasOwn(options,'minInclusive') ? options : {});
    assert.deepEqual(selectRegionItemKeys(items,{x:{ranges:[a,b]}}),['a','b','c']);
  }
  assert.throws(() => normalizeSelectionRegion({x:{ranges:[range(0,2),range(2,5)]}}), /non-overlapping/);

});

test('returns an explicit radians seam union including both sides and excluding two pi', () => {
  const a = 350 * Math.PI / 180, b = 10 * Math.PI / 180, intervals = angularBrushIntervals(a, b);
  assert.deepEqual(intervals, [range(0, b, { minInclusive: true, maxInclusive: true }), range(a, Math.PI * 2, { minInclusive: true, maxInclusive: false })]);
  const angles = [0, 5, 10, 20, 180, 340, 350, 355, 360];
  assert.deepEqual(selectRegionItemKeys(angles.map(angle => item(String(angle), { theta: angle * Math.PI / 180 })), { theta: { ranges: intervals } }), ['0', '5', '10', '350', '355']);
  assert.deepEqual(angularBrushIntervals(0.5, 1), [range(0.5, 1, { minInclusive: true, maxInclusive: true })]);
  assert.deepEqual(angularBrushIntervals(1, 1), []);
  for (const bad of [-1, Math.PI * 2, Infinity, NaN, '1']) assert.throws(() => angularBrushIntervals(bad, 1), /radians/);
});

test('selects polygon boundary points and concave or self-intersecting evenodd interiors', () => {
  const points = [point(0, 0), point(5, 5), point(10, 5), point(11, 5), point(-1, 0)];
  assert.deepEqual(selectScreenPolygonKeys(points.map((p, i) => ({ key: String(i), point: p })), square).keys, ['0', '1', '2']);
  const concave = [point(0, 0), point(10, 0), point(10, 10), point(5, 5), point(0, 10)];
  assert.deepEqual(selectScreenPolygonKeys([{ key: 'inside', point: point(5, 4) }, { key: 'notch', point: point(5, 8) }], concave).keys, ['inside']);
  const bow = [point(0, 0), point(10, 10), point(0, 10), point(10, 0)];
  assert.deepEqual(selectScreenPolygonKeys([{ key: 'top', point: point(5, 2) }, { key: 'bottom', point: point(5, 8) }, { key: 'left', point: point(1, 5) }], bow).keys, ['top', 'bottom']);
});

test('keeps screen polygons and keys distinct from domain data and preserves input', () => {
  const polygon = [square[0], square[0], ...square.slice(1), square[0]], before = structuredClone(polygon);
  const selected = selectScreenPolygonKeys([{ key: 'stable-key', point: point(3, 7) }], polygon);
  assert.deepEqual(selected, { polygon: square, keys: ['stable-key'] });
  assert.deepEqual(polygon, before);
  assert.ok(Object.isFrozen(selected) && Object.isFrozen(selected.polygon) && Object.isFrozen(selected.polygon[0]) && Object.isFrozen(selected.keys));
  polygon[0].x = 99;
  assert.equal(selected.polygon[0].x, 0);
  polygon[0].x = 0;
  assert.deepEqual(normalizeScreenPolygon([]), []);
  for (const degenerate of [[], [point(0, 0)], [point(0, 0), point(2, 2)], [point(0, 0), point(1, 1), point(2, 2)]]) {
    assert.deepEqual(selectScreenPolygonKeys([{ key: 'a', point: point(1, 1) }], degenerate).keys, []);
  }
});

test('retains polygon membership under explicit translation and uniform scaling', () => {
  const samples = [point(2, 2), point(11, 11), point(0, 5)];
  for (const [factor, dx, dy] of [[1, 0, 0], [2, -50, 120], [0.25, 50, -20]]) {
    const map = p => point(p.x * factor + dx, p.y * factor + dy);
    assert.deepEqual(selectScreenPolygonKeys(samples.map((p, i) => ({ key: String(i), point: map(p) })), square.map(map)).keys, ['0', '2']);
  }
});

test('rejects invalid region shapes and missing final channels without inactive-branch shortcuts', () => {
  for (const region of [null, {}, { z: { values: [] } }, { theta: { ranges: [] }, x: { ranges: [] } }, { x: {} },
    { x: { values: [], ranges: [] } }, { x: { ranges: [range(0, 1), range(2, 3), range(4, 5)] } },
    { x: { ranges: [range(2, 4), range(0, 3)] } }, { x: { ranges: [{ min: 1 }] } }, { x: { ranges: [range('a', 'b')] } },
    { x: { values: [null] } }, { x: { values: [NaN] } }, { x: { values: 'a' } }]) assert.throws(() => normalizeSelectionRegion(region));
  assert.throws(() => selectRegionItemKeys([item('a', {})], { y: { values: [] } }), /final item grain/);
  for (const items of [[item('a', { x: 1 }), item('a', { x: 2 })], [{ channels: {} }], [{ key: 'a' }], [{ key: 'a', channels: null }], [item('', {})]]) {
    assert.throws(() => selectRegionItemKeys(items, { x: { ranges: [] } }));
  }
});

test('preflights polygon size, finite edges, cumulative work and all empty-branch input', () => {
  assert.throws(() => normalizeScreenPolygon(Array.from({ length: 10_001 }, () => point(0, 0))), /10000/);
  assert.throws(() => selectScreenPolygonKeys(new Array(50_001), []), /50000/);
  assert.throws(() => selectScreenPolygonKeys(null, []), /array/);
  for (const items of [[{ key: 'a' }], [{ key: '', point: point(0, 0) }], [{ key: 'a', point: point(0, 0) }, { key: 'a', point: point(1, 1) }], [{ key: 'a', point: point(NaN, 0) }]]) {
    assert.throws(() => selectScreenPolygonKeys(items, []));
  }
  assert.throws(() => selectScreenPolygonKeys([], [point(-Number.MAX_VALUE, 0), point(Number.MAX_VALUE, 0), point(0, 1)]), /finite/);
  const polygon = Array.from({ length: 1000 }, (_, i) => point(i, i % 2));
  assert.throws(() => selectScreenPolygonKeys(new Array(10_000).fill({ key: 'a', point: point(0, 0) }), polygon), /10000000/);
  assert.throws(() => selectRegionItemKeys(new Array(50_001), { x: { ranges: [] } }), /50000/);
  assert.throws(() => normalizeSelectionRegion({ x: { values: ['x'.repeat(5_000_000), 'y'.repeat(5_000_000)] } }), /10000000/);
  assert.throws(() => selectRegionItemKeys(new Array(5000).fill(item('a', { x: 1 })), { x: { values: Array.from({ length: 2000 }, (_, i) => i) } }), /10000000/);
});

test('does not execute accessors or inherit optional predicates', () => {
  let calls = 0;
  assert.throws(() => normalizeSelectionRegion({ get x() { calls++; return { ranges: [] }; } }), /own data/);
  assert.throws(() => normalizeScreenPolygon([{ get x() { calls++; return 1; }, y: 2 }]), /own data/);
  const values = []; Object.defineProperty(values, 0, { get() { calls++; return 1; }, enumerable: true });
  assert.throws(() => normalizeSelectionRegion({ x: { values } }), /own data/);
  Object.defineProperty(Object.prototype, 'ranges', { configurable: true, get() { calls++; return []; } });
  try { assert.deepEqual(selectRegionItemKeys([item('a', { x: 1 })], { x: { values: [1] } }), ['a']); }
  finally { delete Object.prototype.ranges; }
  assert.equal(calls, 0);
});
