import assert from 'node:assert/strict';
import test from 'node:test';
import { chart } from '../../../../src/index.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';
import { unionConcreteGraphicBounds } from '../../../../src/grammar/schemas/graphicBounds.js';
import { resolveGuideCollisionBlocks } from '../../../../src/materialization/guides/resources.js';

const rows = [{ a: 10, b: 3, c: 100, d: 1000, e: 25, group: 'A' },
  { a: 20, b: 8, c: 200, d: 2000, e: 40, group: 'B' }];
const base = () => chart().createCanvas({ plot: { width: 524, height: 314 }, margin: 220 }).createData({ values: rows });
const plots = {
  parallel: p => p.createParallelCoordinates({ id: 'plot', dimensions: ['a', 'b', 'c', 'd', 'e'], color: 'group' }),
  polar: p => p.createPolarScatterPlot({ id: 'plot', theta: 'a', radius: 'b', color: 'group' }),
  radar: p => p.createRadarPlot({ id: 'plot', wide: { fields: ['a', 'b', 'c'] }, groupBy: 'group', color: 'group' }),
  scatter: p => p.createScatterPlot({ id: 'plot', x: 'a', y: 'b', color: 'group' }),
  bar: p => p.createBarPlot({ id: 'plot', x: 'group', y: { field: 'b', aggregate: 'sum' }, color: 'group' })
};
const bounds = (p, ids) => unionConcreteGraphicBounds(p.graphicSpec, ids.filter(id => p.graphicSpec.objects[id]), p.materializationConfigs.textMetrics);
const gap = (outside, inside, edge) => ({ top: inside.top - outside.bottom,
  bottom: outside.top - inside.bottom, left: inside.left - outside.right, right: outside.left - inside.right })[edge];
function verify(p, edge, withLegend = true) {
  const blocks = resolveGuideCollisionBlocks(p.graphicSpec, p.guideConfigs, undefined, p.materializationConfigs.textMetrics);
  const axes = blocks.filter(b => b.kind === 'axis' && b.position === edge);
  const legends = blocks.filter(b => b.kind === 'legend' && b.position === edge);
  const title = bounds(p, ['chartTitle', 'chartSubtitle']);
  const plot = p.materializationConfigs.canvas;
  const frame = { left: plot.margin.left, top: plot.margin.top,
    right: plot.margin.left + plot.plot.width, bottom: plot.margin.top + plot.plot.height };
  const distances = [frame, ...axes.map(b => b.bounds), ...legends.map(b => b.bounds)].map(b => gap(title, b, edge));
  assert.ok(Math.abs(Math.min(...distances) - 16) < 1e-7, `title must retain a 16px gap, not accumulate whitespace: ${distances}`);
  if (withLegend) {
    assert.ok(legends.length);
    for (const legend of legends) {
      const distances = [frame, ...axes.map(b => b.bounds)].map(b => gap(legend.bounds, b, edge));
      assert.ok(Math.abs(Math.min(...distances) - 8) < 1e-7, `categorical legend must retain its 8px gap: ${distances}`);
    }
  }
  assert.ok(title.top >= 0 && title.left >= 0);
}
for (const [kind, create] of Object.entries(plots)) for (const edge of ['top', 'bottom', 'left', 'right']) {
  test(`${kind} title and outside ${edge} legend share measured guide lanes`, () => {
    const source = create(base());
    const p = Object.keys(source.guideConfigs.legend ?? {}).length ? source
      : source.createLegend({ target: 'plot', channels: ['color'] });
    const title = { text: 'Main title', subtitle: 'Second line', position: edge, titleStyle: { fontSize: 23 } };
    const a = p.createTitle(title).editLegend({ target: 'plot', position: edge });
    const b = p.editLegend({ target: 'plot', position: edge }).createTitle(title);
    verify(a, edge); verify(b, edge); assert.deepEqual(a.graphicSpec, b.graphicSpec);
    const resized = a.editCanvas({ plot: { width: 560, height: 350 }, margin: { top: 240 } }); verify(resized, edge);
    const restored = deserializeProgram(serializeProgram(resized)); verify(restored, edge);
    assert.deepEqual(restored.graphicSpec, resized.graphicSpec);
    const moved = restored.editLegend({ target: 'plot', position: edge === 'top' ? 'bottom' : 'top' });
    verify(moved, edge, false);
  });
}

test('parallel axis edits, removal, recreation and dimension changes reflow title and legends without drift', () => {
  const p = plots.parallel(base()).editLegend({ target: 'plot', position: 'top' }).createTitle({ text: 'Title' });
  const old = JSON.stringify(p);
  const large = p.editParallelAxis({ field: 'c', title: { fontSize: 34, offset: 48 }, ticksAndLabels: { labels: { fontSize: 20 } } });
  verify(large, 'top');
  const small = large.editParallelAxis({ field: 'c', title: { fontSize: 13, offset: 20 }, ticksAndLabels: { labels: { fontSize: 10 } } });
  verify(small, 'top');
  const reordered = large.encodeParallelCoordinates({ target: 'plot', dimensions: ['e', 'd', 'c', 'b', 'a'] }); verify(reordered, 'top');
  const removed = large.removeParallelAxes(); verify(removed, 'top');
  verify(removed.createParallelAxes(), 'top');
  assert.equal(JSON.stringify(p), old);
});

test('explicit offsets keep their meaning and reject overlapping non-Cartesian text atomically', () => {
  const p = plots.parallel(base()); const old = JSON.stringify(p);
  assert.throws(() => p.editLegend({ target: 'plot', position: 'top', offset: 0 }), /overlap/);
  assert.equal(JSON.stringify(p), old);
  const separated = p.editLegend({ target: 'plot', position: 'top', offset: 90 });
  const legend = resolveGuideCollisionBlocks(separated.graphicSpec, separated.guideConfigs).find(b => b.kind === 'legend');
  assert.equal(separated.materializationConfigs.canvas.margin.top - legend.bounds.bottom, 90);
});
