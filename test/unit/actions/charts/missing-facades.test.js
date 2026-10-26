import assert from 'node:assert/strict';
import test from 'node:test';
import { chart } from '../../../../src/index.js';
import { getPlotComposition } from '../../../../src/inspection.js';
import { renderToSVG } from '../../../../src/renderers/svg.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';

const rows = ['A', 'B'].flatMap((group, j) => Array.from({ length: 5 }, (_, i) => ({ group,
  alternate: i === 0 ? null : group, value: i + 1 + j, end: i + 3 + j })));
const base = () => chart().createCanvas({ plot: { width: 400, height: 300 }, margin: 90 }).createData({ id: 'source', values: rows });
const endpointCases = [
  ['createDotPlot', { category: 'alternate', value: 'value', summary: 'mean' }],
  ['createLollipopPlot', { category: 'alternate', value: 'value', summary: 'mean' }],
  ['createDumbbellPlot', { category: 'alternate', start: 'value', end: 'end', summary: 'mean' }]
];
for (const [method, options] of endpointCases) test(`${method} complete cases retain original-source role editing and removal`, () => {
  const input = base();
  assert.throws(() => input[method]({ id: 'plot', ...options, guides: false }), /null|nominal|category|missing/i);
  const p = input[method]({ id: 'plot', ...options, missing: 'skip', guides: false });
  const config = p.markConfigs.plot.endpointPlot;
  assert.equal(config.source, 'source');
  assert.equal(getPlotComposition(p, { target: 'plot' }).data, 'source');
  assert.equal(p.semanticSpec.datasets.find(d => d.id === config.data).values.length, 2);
  const summary = p.semanticSpec.datasets.find(d => d.id === config.data);
  assert.deepEqual(summary.values.map(r => r.__plot_value ?? r.__plot_start), [3.5, 4.5]);
  const q = deserializeProgram(serializeProgram(p)).editEndpointPlot({ target: 'plot', category: 'group' });
  assert.match(renderToSVG(q), /<svg/);
  const edited = q.semanticSpec.datasets.find(d => d.id === q.markConfigs.plot.endpointPlot.data);
  assert.deepEqual(edited.values.map(r => r.__plot_value ?? r.__plot_start), [3, 4]);
  assert.deepEqual(q.removeMark({ target: 'plot' }).semanticSpec.datasets.map(d => d.id), ['source']);
  assert.deepEqual(input.semanticSpec.datasets[0].values, rows);
});

test('Raincloud uses one complete population for density, summary and points and revises from original rows', () => {
  const p = base().createRaincloudPlot({ id: 'rain', category: 'alternate', value: 'value', missing: 'skip', guides: false });
  const config = p.markConfigs.rainCloud.raincloudPlot;
  assert.equal(config.source, 'source');
  assert.equal(getPlotComposition(p, { target: 'rain' }).data, 'source');
  const points = p.semanticSpec.layers.find(l => l.id === config.childIds.points);
  assert.equal(p.semanticSpec.datasets.find(d => d.id === points.data).values.length, 8);
  const q = deserializeProgram(serializeProgram(p)).editRaincloudPlot({ target: 'rain', category: 'group' });
  const points2 = q.semanticSpec.layers.find(l => l.id === config.childIds.points);
  assert.equal(q.semanticSpec.datasets.find(d => d.id === points2.data).values.length, 10);
  const revised = q.reviseData({ source: 'source', id: 'revised', values: [...rows, { group: 'A', alternate: null, value: 8, end: 10 }] });
  assert.match(renderToSVG(revised), /<svg/);
  assert.deepEqual(q.removeMark({ target: 'rainCloud' }).semanticSpec.datasets.map(d => d.id), ['source']);
});

for (const method of ['createStripPlot', 'createBeeswarmPlot']) test(`${method} missing policy follows appearance edits without fabricating categories`, () => {
  const p = base()[method]({ id: 'plot', x: 'group', y: 'value', missing: 'skip', guides: false });
  for (const action of ['encodeColor', 'encodeStroke', 'encodeShape']) {
    const q = p[action]({ target: 'plot', field: 'alternate', fieldType: 'nominal' });
    assert.equal(q.graphicSpec.objects.plot.items.length, 8);
    assert.equal(q.semanticSpec.datasets[0].values.length, 10);
    assert.match(renderToSVG(q), /<svg/);
  }
});
