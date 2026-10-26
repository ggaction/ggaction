import assert from 'node:assert/strict';
import test from 'node:test';
import { chart } from '../../../../src/index.js';
import { renderToSVG } from '../../../../src/renderers/svg.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';
import { deriveAreaSeries } from '../../../../src/grammar/areaSeries.js';
const rows = [
  { g: 'A', x: 1, z: 10, m: 2 }, { g: 'A', x: 2, z: 20, m: 4 },
  { g: 'B', x: 1, z: 20, m: 3 }, { g: 'B', x: 3, z: 30, m: 5 }
];
const base = () => chart().createCanvas({ plot: { width: 400, height: 300 }, margin: 80 }).createData({ id: 'source', values: rows });
const area = mode => base().createCompleteData({ id: 'aligned', source: 'source', key: 'x', groupBy: 'g', fill: { m: 0 } })
  .createAreaPlot({ id: 'plot', data: 'aligned', x: 'x', y: 'm', groupBy: 'g', color: 'g', layout: mode, guides: false });
const layer = p => p.semanticSpec.layers.find(l => l.id === 'plot');

test('Area independent remapping discards only the old synthetic alignment in Overlay', () => {
  const p = area('overlay'), q = p.encodeX({ target: 'plot', field: 'm' });
  assert.equal(layer(q).data, 'source');
  assert.equal(q.semanticSpec.datasets.find(d => d.id === 'aligned').values.length, 6);
  assert.equal(q.graphicSpec.objects.plot.items.length, 2);
  assert.match(renderToSVG(q), /<svg/);
  assert.equal(layer(p).data, 'aligned');
});
for (const mode of ['stack', 'fill', 'center', 'diverging']) test(`Area ${mode} rebuilds unique independent-key alignment without reaggregation`, () => {
  const p = area(mode), q = p.encodeX({ target: 'plot', field: 'z' });
  const updated = layer(q), data = q.semanticSpec.datasets.find(d => d.id === updated.data);
  assert.equal(data.source, 'source'); assert.equal(data.transform[0].key, 'z');
  assert.equal(data.values.length, 6);
  assert.deepEqual(data.values.filter(r => r.x !== null).map(r => r.m).sort(), [2, 3, 4, 5]);
  const resolved = deriveAreaSeries(data.values, updated);
  assert.equal(resolved.series.length, 2); assert.ok(resolved.series.every(s => s.values.length === 3));
  const restored = deserializeProgram(serializeProgram(q));
  assert.equal(renderToSVG(restored), renderToSVG(q));
  assert.deepEqual(restored.removeMark({ target: 'plot' }).semanticSpec.datasets.map(d => d.id), ['source', 'aligned']);
  assert.equal(layer(p).data, 'aligned');
});

test('Area completed-key remapping rejects ambiguous grains without mutating its input', () => {
  const p = area('stack'), before = serializeProgram(p);
  assert.throws(() => p.encodeX({ target: 'plot', field: 'm' }), /separate key and measurement/);
  assert.throws(() => p.encodeX({ target: 'plot', field: 'g', fieldType: 'nominal' }), /grouping field/);
  assert.equal(serializeProgram(p), before);
});

test('Rose category remapping updates dependent color and guide samples while preserving styles', () => {
  const values = rows.map((r, i) => ({ ...r, h: i % 2 ? 'odd' : 'even' }));
  const p = chart().createCanvas({ plot: { width: 400, height: 400 }, margin: 100 })
    .createData({ id: 'data', values }).createRosePlot({ id: 'plot', category: 'g', value: 'm', aggregate: 'sum' })
    .editThetaAxisLabels({ values: ['A', 'B'], fontSize: 17, color: '#112233' });
  const q = p.encodeTheta({ target: 'plot', field: 'h', fieldType: 'nominal' });
  assert.equal(layer(q).encoding.color.field, 'h');
  assert.deepEqual(q.resolvedScales.theta.domain, ['even', 'odd']);
  assert.equal(q.guideConfigs.axis.theta.labels.fontSize, 17);
  assert.equal(q.guideConfigs.axis.theta.labels.color, '#112233');
  assert.equal(q.guideConfigs.axis.theta.labels.inferredValues, true);
  assert.match(renderToSVG(q), /<svg/);
  assert.equal(layer(p).encoding.color.field, 'g');
});
