import test from 'node:test';
import assert from 'node:assert/strict';
import { chart } from '../../../../src/index.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';
import { resolveFacetFamily } from '../../../../src/grammar/facets/dependencies.js';

const rows = [{ group: 'A', x: 1, y: 3 }, { group: 'B', x: 2, y: 4 }];
const base = () => chart().createCanvas({ plot: { width: 240, height: 240 }, margin: 80 }).createData({ id: 'd', values: rows });
for (const family of ['polar', 'parallel']) test(`${family} facets retain centered notes without changing primary family`, () => {
  const p = family === 'polar' ? base().createRosePlot({ id: 'plot', category: 'group', aggregate: 'count', guides: { axes: { radius: { ticksAndLabels: { count: 2 } } } } })
    : base().createParallelCoordinates({ id: 'plot', dimensions: ['x', 'y'] });
  const note = { id: 'note', anchor: 'plot-center', data: 'd', text: 'Note' };
  const decorated = p.createAnnotation(note), classification = resolveFacetFamily(decorated.semanticSpec);
  assert.equal(classification.family, family);
  assert.deepEqual(classification.primaryLayers, ['plot']);
  assert.deepEqual(classification.dependentLayers, ['note']);
  const options = { field: 'group', data: 'd', columns: 2, guides: { axes: 'each', legend: false } };
  const before = serializeProgram(p);
  for (const faceted of [decorated.facet(options), p.facet(options).editFacetSource({ action: { method: 'createAnnotation', options: note } })]) {
    assert.equal(Object.keys(faceted.children).length, 2);
    for (const child of Object.values(faceted.children)) {
      const item = child.graphicSpec.objects.note.items[0].properties;
      assert.equal(item.text, 'Note');
      assert.equal(item.x, 200); assert.equal(item.y, 200);
    }
    assert.deepEqual(deserializeProgram(serializeProgram(faceted)).graphicSpec, faceted.graphicSpec);
  }
  assert.deepEqual(serializeProgram(p), before);
  if (family === 'polar') {
    const mixed = p.createScatterPlot({ id: 'points', x: 'x', y: 'y', guides: false });
    assert.throws(() => mixed.facet(options), /one coordinate family/);
  }
});

test('a standalone literal text chart remains a primary facet layer', () => {
  const p = base().createAnnotation({ text: 'Only note', anchor: 'plot-center' });
  assert.deepEqual(resolveFacetFamily(p.semanticSpec).primaryLayers, ['annotation']);
  assert.equal(Object.keys(p.facet({ field: 'group', columns: 2 }).children).length, 2);
});
