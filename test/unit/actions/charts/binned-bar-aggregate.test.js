import assert from 'node:assert/strict';
import test from 'node:test';
import { chart } from '../../../../src/index.js';
import { chart as basicChart } from '../../../../src/basic.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';
import { renderToSVG } from '../../../../src/renderers/svg.js';
import { resolveBarItems } from '../../../../src/materialization/selection/items/bar.js';

const values = [{ X: 1, Y: 2, C: 'A' }, { X: 2, Y: 6, C: 'A' },
  { X: 1, Y: 10, C: 'B' }, { X: 9, Y: 3, C: 'A' }, { X: 10, Y: 7, C: 'B' }];
const base = (factory = chart, rows = values) => factory().createCanvas({ width: 600, height: 500, margin: 100 })
  .createData({ id: 'data', values: rows });
const options = (aggregate = 'mean', layout = 'overlay') => ({ id: 'bars',
  x: { field: 'X', bin: { boundaries: [0, 5, 10] } },
  y: { field: 'Y', aggregate }, color: { field: 'C', layout }, guides: false });
const bars = p => p.graphicSpec.objects.bars.items.map(i => i.properties);

test('binned aggregate bars fill exact intervals and keep independent measure/color cells', () => {
  for (const factory of [chart, basicChart]) {
    const before = base(factory), snapshot = JSON.stringify(before);
    for (const [op, heights] of Object.entries({ mean: [120, 300, 90, 210], median: [120, 300, 90, 210],
      sum: [240, 300, 90, 210], min: [60, 300, 90, 210], max: [180, 300, 90, 210] })) {
      const p = before.createBarPlot(options(op));
      assert.deepEqual(bars(p).map(b => [b.x, b.width]), [[100, 200], [100, 200], [300, 200], [300, 200]]);
      assert.deepEqual(bars(p).map(b => b.height), heights);
      assert.equal(p.semanticSpec.layers[0].encoding.y.aggregate, op);
      assert.deepEqual(p.semanticSpec.layers[0].encoding.x.bin, { boundaries: [0, 5, 10] });
      assert.equal(p.semanticSpec.datasets.length, 1);
      assert.deepEqual(p.semanticSpec.datasets[0].values, values);
      assert.match(renderToSVG(p), /<rect/);
      assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
    }
    assert.equal(JSON.stringify(before), snapshot);
  }
});

test('binned bars share exact values with item labels and all four series layouts', () => {
  const p = base().createBarPlot(options());
  const layer = p.semanticSpec.layers[0];
  assert.deepEqual(resolveBarItems(p, layer, p.semanticSpec.datasets[0]).map(i => i.members.length), [2, 1, 1, 1]);
  const labeled = p.createMarkLabels({ content: 'value' });
  assert.deepEqual(labeled.graphicSpec.objects['bars-labels'].items.map(i => i.properties.text), ['4', '10', '3', '7']);
  const stacked = p.layoutSeries({ mode: 'stack' }), filled = p.layoutSeries({ mode: 'fill' });
  assert.ok(stacked.resolvedScales.y.domain[1] >= 14);
  assert.deepEqual(filled.resolvedScales.y.domain, [0, 1]);
  const rects = bars(filled);
  for (const i of [0, 2]) {
    assert.ok(Math.abs(rects[i].height + rects[i + 1].height - 300) < 1e-9);
    assert.ok(Math.abs(rects[i + 1].y + rects[i + 1].height - rects[i].y) < 1e-9);
  }
  assert.deepEqual(bars(p.layoutSeries({ mode: 'group' })).map(b => [b.x, b.width]), [[100, 100], [200, 100], [300, 100], [400, 100]]);
  assert.deepEqual(p.layoutSeries({ mode: 'group' }).layoutSeries({ mode: 'overlay' }).graphicSpec, p.graphicSpec);
});

test('bin boundaries survive resize, reversal, nonuniform intervals and empty bins', () => {
  const p = base(chart, [{ X: -10, Y: 2 }, { X: 0, Y: 4 }, { X: 10, Y: 6 }])
    .createBarPlot({ id: 'bars', x: { field: 'X', bin: { boundaries: [-10, -5, 0, 10] } },
      y: { field: 'Y', aggregate: 'mean' }, guides: false });
  assert.deepEqual(bars(p).map(b => [b.x, b.width]), [[100, 100], [300, 200]]);
  assert.deepEqual(bars(p.editCanvas({ width: 1000 })).map(b => [b.x, b.width]), [[100, 200], [500, 400]]);
  assert.deepEqual(bars(p.editXScale({ reverse: true })).map(b => [b.x, b.width]), [[400, 100], [100, 200]]);
  assert.deepEqual(bars(p).map(b => b.height), [120, 300]);
});

test('measure-first and bin-first authoring converge and invalid transitions are atomic', () => {
  const p = base().createBarMark({ id: 'bars' });
  const x = options().x, y = options().y;
  const a = p.encodeX(x).encodeY(y), b = p.encodeY(y).encodeX(x);
  assert.deepEqual(a.semanticSpec.layers, b.semanticSpec.layers);
  assert.deepEqual(a.resolvedScales, b.resolvedScales);
  assert.deepEqual(a.graphicSpec, b.graphicSpec);
  const before = JSON.stringify(a);
  assert.throws(() => a.encodeX({ ...x, weight: { field: 'Y', kind: 'frequency' } }), /weights require count/);
  assert.throws(() => a.encodeY({ field: 'Y', aggregate: 'bad' }), /Unsupported aggregate/);
  assert.equal(JSON.stringify(a), before);
});

test('binned aggregates preserve native missing, signed and parameterized statistic policies', () => {
  const extra = [...values, { X: null, Y: 900, C: 'A' }, { X: 1, Y: null, C: 'A' }, { X: 1, Y: 900, C: null }];
  const p = base(chart, extra).createBarPlot({ ...options(), missing: 'skip' });
  assert.deepEqual(bars(p), bars(base().createBarPlot(options())));
  assert.equal(p.semanticSpec.datasets[0].values.length, 8);
  const quantile = base().createBarPlot(options({ op: 'quantile', probability: 0.25 }));
  assert.deepEqual(bars(quantile).map(b => b.height), [90, 300, 90, 210]);
  const signed = base(chart, [{ X: 1, Y: -4, C: 'A' }, { X: 2, Y: -2, C: 'A' }, { X: 1, Y: 6, C: 'B' }])
    .createBarPlot(options());
  assert.ok(bars(signed).every(b => b.width === 200 && b.height > 0));
  assert.ok(signed.resolvedScales.y.domain[0] <= -3);
  assert.throws(() => signed.layoutSeries({ mode: 'fill' }), /non-negative/);
  assert.equal(signed.semanticSpec.layers[0].layout.mode, 'overlay');
});
