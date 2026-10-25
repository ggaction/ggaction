import test from 'node:test';
import assert from 'node:assert/strict';
import { chart, hconcat, vconcat } from '../../../../src/index.js';
import { compositionPlotBounds, prepareCompositionSnapshots } from '../../../../src/materialization/composition.js';
import { resolveConcreteGraphicBounds } from '../../../../src/grammar/schemas/graphicBounds.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';

const rows = Array.from({ length: 18 }, (_, i) => ({ year: 2000 + i % 6, value: i + 1,
  other: i * 2 + 5, third: 20 - i, region: ['North', 'South', 'West'][i % 3] }));
const unit = (margin = 160) => chart().createCanvas({ plot: { width: 220, height: 220 }, margin })
  .createData({ id: 'd', values: rows }).createScatterPlot({ id: 'p', x: 'year', y: 'value' })
  .encodeColor({ target: 'p', field: 'region' }).createLegend({ target: 'p' });
const gap = (plot, frame, side) => side === 'right' ? frame.x - plot.x - plot.width
  : side === 'left' ? plot.x - frame.x - frame.width
  : side === 'top' ? plot.y - frame.y - frame.height : frame.y - plot.y - plot.height;
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

for (const position of ['left', 'right', 'top', 'bottom']) {
  test(`shared ${position} legend offset is plot-relative, independent of spare child margins`, () => {
    for (const margin of [160, 300]) {
      const source = unit(margin).editLegend({ position, offset: 90 });
      const before = serializeProgram(source);
      const p = source.createAdjacentPlot({ id: 'q', source: 'p', position: 'bottom', share: { color: true },
        plot: { action: 'createScatterPlot' } }).createTitle({ text: 'Shared view', position });
      const { layout, legendFrame } = prepareCompositionSnapshots(p), plot = compositionPlotBounds(p);
      close(gap(plot, legendFrame, position), 90);
      assert.ok(legendFrame.x >= 0 && legendFrame.y >= 0);
      assert.ok(legendFrame.x + legendFrame.width <= layout.width);
      assert.ok(legendFrame.y + legendFrame.height <= layout.height);
      assert.equal(serializeProgram(source), before);
      assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
    }
  });
}

test('adding Parallel Coordinates beneath a faceted area retains the nearby shared legend', () => {
  const source = chart().createCanvas({ plot: { width: 314, height: 314 },
    margin: { left: 181.92, right: 204.08, top: 56.28125, bottom: 59.71875 } })
    .createData({ id: 'd', values: rows })
    .createSummaryData({ id: 'summary', source: 'd', groupBy: ['year', 'region'],
      aggregates: [{ field: 'value', op: 'mean', as: 'value' }] })
    .createCompleteData({ id: 'aligned', source: 'summary', key: 'year', groupBy: ['region'] })
    .createAreaPlot({ id: 'p', data: 'aligned', x: 'year', y: 'value', missing: 'break',
      color: { field: 'region' }, groupBy: 'region' })
    .facet({ field: 'region', data: 'd', columns: 3, spacing: 'plot', gap: 30,
      guides: { axes: 'outer', legend: 'shared' } })
    .editFacetScales({ x: 'independent', y: 'independent', color: 'shared' })
    .createTitle({ text: 'Value by year' });
  const before = serializeProgram(source);
  const beforePlot = compositionPlotBounds(source);
  const p = source.createAdjacentPlot({ id: 'q', source: 'p', position: 'bottom', share: { color: true },
    plot: { action: 'createParallelCoordinates', options: { data: 'd', dimensions: ['value', 'other', 'third'],
      color: { field: 'region' } } } }).createGuides({ target: [{ childPath: ['p'] }, { childPath: ['q'] }] });
  for (const current of [p, p.editCompositionLayout({ gap: 30 }),
    p.editLegend({ target: { childPath: ['p'] }, channel: 'color', labels: { fontSize: 17 } })]) {
    const { layout, legendFrame, children } = prepareCompositionSnapshots(current), plot = compositionPlotBounds(current);
    close(plot.width, beforePlot.width);
    assert.ok(gap(plot, legendFrame, 'right') > 0 && gap(plot, legendFrame, 'right') < 40);
    close(layout.width, source.graphicSpec.objects.canvas.properties.width);
    close(legendFrame.y, plot.y);
    close(compositionPlotBounds(children.q).width, beforePlot.width);
    assert.equal(Object.keys(current.graphicSpec.objects).filter(id => id.endsWith('colorLegendLabels')).length, 1);
    assert.deepEqual(deserializeProgram(serializeProgram(current)).graphicSpec, current.graphicSpec);
  }
  assert.equal(serializeProgram(source), before);
});

test('inferred guide clearance measures retained right axis text instead of the Canvas edge', () => {
  const source = unit(240).editYAxis({ position: 'right' });
  const p = source.createAdjacentPlot({ id: 'q', source: 'p', position: 'bottom', share: { color: true },
    plot: { action: 'createScatterPlot' } });
  const { legendFrame } = prepareCompositionSnapshots(p);
  const obstacles = Object.entries(p.graphicSpec.objects).filter(([id]) => /yAxis(?:Labels|Title)$/.test(id))
    .map(([id]) => resolveConcreteGraphicBounds(p.graphicSpec, id, p.materializationConfigs.textMetrics))
    .filter(bounds => bounds && bounds.bottom > legendFrame.y && bounds.top < legendFrame.y + legendFrame.height);
  assert.ok(obstacles.length > 0);
  for (const bounds of obstacles) assert.ok(legendFrame.x >= bounds.right + 7.99);
  assert.ok(gap(compositionPlotBounds(p), legendFrame, 'right') < 90);
});

test('nested shared guide collection does not accumulate empty legend lanes', () => {
  let p = unit(240).editLegend({ offset: 25 });
  for (let index = 1; index <= 3; index++) {
    p = vconcat({ programs: [{ id: 'previous', program: p }, { id: 'next', program: unit(240).editLegend({ offset: 25 }) }],
      share: { color: true }, align: 'plot' });
    close(gap(compositionPlotBounds(p), prepareCompositionSnapshots(p).legendFrame, 'right'), 25);
    assert.equal(Object.keys(p.graphicSpec.objects).filter(id => id.endsWith('colorLegendLabels')).length, 1);
  }
});

test('explicit in-plot legend coordinates remain relative to the shared plot origin', () => {
  const p = unit(240).editLegend({ at: { x: 20, y: 25 } })
    .createAdjacentPlot({ id: 'q', source: 'p', position: 'bottom', share: { color: true }, plot: { action: 'createScatterPlot' } });
  const { legendFrame } = prepareCompositionSnapshots(p), plot = compositionPlotBounds(p);
  close(legendFrame.x - plot.x, 20);
  close(legendFrame.y - plot.y, 25);
});

test('explicit offsets reject an actual neighbouring axis collision without mutating the inputs', () => {
  const a = unit(240).editLegend({ offset: 1 });
  const b = unit(240).editYAxis({ position: 'right' });
  const before = [serializeProgram(a), serializeProgram(b)];
  assert.throws(() => hconcat({ programs: [{ id: 'a', program: a }, { id: 'b', program: b }],
    share: { color: true }, align: 'plot' }), /Shared composition legend overlaps retained/);
  assert.deepEqual([serializeProgram(a), serializeProgram(b)], before);
});
