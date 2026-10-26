import test from 'node:test';
import assert from 'node:assert/strict';
import { cloneAndFreeze } from '../../src/core/immutable.js';
import { findGraphic, findGraphicParent } from '../../src/grammar/schemas/graphicTree.js';

test('graphic item lookup follows immutable collection revisions and preserves owners', () => {
  const items = cloneAndFreeze(Array.from({ length: 5000 }, (_, i) => ({ id: `points:${i}`, properties: { x: i } })));
  const first = cloneAndFreeze({ objects: { points: { type: 'circle', items } }, order: ['points'] });
  for (let i = 4999; i >= 0; i--) {
    const found = findGraphic(first, `points:${i}`);
    assert.equal(found.object, items[i]); assert.equal(found.itemIndex, i); assert.equal(found.owner, first.objects.points);
  }
  const second = cloneAndFreeze({ ...first, objects: { ...first.objects, points: { type: 'circle', items: items.slice(0, 10) } } });
  assert.equal(findGraphic(second, 'points:4999'), undefined);
  assert.equal(findGraphic(first, 'points:4999').object, items[4999]);
  assert.equal(findGraphicParent(second, 'points:3').index, 3);
  assert.equal(findGraphic(first, 'points').kind, 'object');
});

test('lookup never caches mutable item identity inside caller-owned or shallow-frozen collections', () => {
  const item = { id: 'old', properties: {} }, items = Object.freeze([item]);
  const spec = { objects: { marks: { type: 'circle', items } }, order: ['marks'] };
  assert.equal(findGraphic(spec, 'old').object, item);
  item.id = 'new';
  assert.equal(findGraphic(spec, 'old'), undefined);
  assert.equal(findGraphic(spec, 'new').object, item);
});
