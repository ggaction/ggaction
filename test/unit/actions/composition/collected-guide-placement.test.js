import test from 'node:test';
import assert from 'node:assert/strict';
import { chart, hconcat, vconcat } from '../../../../src/index.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';
import { compositionPlotBounds, prepareCompositionSnapshots } from '../../../../src/materialization/composition.js';
import { resolveConcreteGraphicBounds } from '../../../../src/grammar/schemas/graphicBounds.js';
const rows = Array.from({ length: 18 }, (_, i) => ({ x: i + 1, y: i * 3 + 2, size: i % 5 + 3, group: ['A', 'B', 'C'][i % 3] }));
function unit(size = true) {
  let p = chart().createCanvas({ plot: { width: 220, height: 220 }, margin: 170 }).createData({ id: 'd', values: rows })
    .createScatterPlot({ id: 'p', x: 'x', y: 'y', color: { field: 'group' } });
  if (size) p = p.encodeShape({ target: 'p', field: 'group' }).encodeSize({ target: 'p', field: 'size' });
  return p.createGuides({ legend: { target: 'p', channels: size ? ['color', 'shape', 'size'] : ['color'] } });
}
const join = (a, b, fn = hconcat, share = { color: true }) => fn({ programs: [{ id: 'a', program: a }, { id: 'b', program: b }], align: 'plot', gap: 8, share, legends: 'collect' });
const bounds = p => prepareCompositionSnapshots(p).legends.map(l => ({ ...l,
  bounds: resolveConcreteGraphicBounds(p.graphicSpec, l.id, p.materializationConfigs.textMetrics) }));
const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
for (const fn of [hconcat, vconcat]) test(`${fn.name}: independent size and combined color/shape occupy the outer parent lane`, () => {
  const a = unit(), original = serializeProgram(a), p = join(a, unit(false), fn), plot = compositionPlotBounds(p);
  const blocks = bounds(p);
  assert.equal(blocks.length, 2);
  assert.ok(blocks.every(l => l.bounds.left >= plot.x + plot.width));
  assert.ok(!intersects(blocks[0].bounds, blocks[1].bounds));
  assert.equal(Object.keys(p.graphicSpec.objects).filter(id => id.endsWith('sizeLegendTitle')).length, 1);
  assert.equal(serializeProgram(a), original);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
});

test('independent color mappings remain separate but collect into a non-overlapping outer stack', () => {
  const p = join(unit(false), unit(false).editColorScale({ target: 'p', palette: 'set1' }), hconcat, {});
  const blocks = bounds(p), plot = compositionPlotBounds(p);
  assert.equal(blocks.length, 2);
  assert.ok(blocks.every(l => l.bounds.left > plot.x + plot.width));
  assert.ok(!intersects(blocks[0].bounds, blocks[1].bounds));
});

test('nested concat collects only visible blocks and preserves unique native owners', () => {
  const p = join(join(unit(), unit(false)), unit(false), vconcat);
  const blocks = bounds(p), plot = compositionPlotBounds(p);
  assert.equal(blocks.length, 2);
  assert.ok(blocks.every(l => l.bounds.left >= plot.x + plot.width));
  const size = blocks.find(l => l.channels.includes('size'));
  assert.deepEqual(size.targets, [{ childPath: ['a', 'a'], id: 'p' }]);
  const q = p.editLegend({ target: size.targets, channel: 'size', position: 'left', offset: 100, alongOffset: 25 });
  const frame = bounds(q).find(l => l.channels.includes('size')).bounds;
  assert.ok(frame.right < compositionPlotBounds(q).x);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
});

for (const position of ['left', 'right', 'top', 'bottom']) test(`collected size edits use parent ${position} geometry, not hidden child margins`, () => {
  const p = join(unit(), unit(false)), before = serializeProgram(p), block = bounds(p).find(l => l.channels.includes('size'));
  const q = p.editLegend({ target: block.targets, channel: 'size', position, offset: 100, alongOffset: 35, labels: { fontSize: 18 } });
  const plot = compositionPlotBounds(q), after = bounds(q).find(l => l.id === block.id).bounds;
  assert.ok(position === 'left' ? after.right < plot.x : position === 'right' ? after.left > plot.x + plot.width
    : position === 'top' ? after.bottom < plot.y : after.top > plot.y + plot.height);
  assert.equal(q.children.a.context.compositionCollectedLegends, undefined);
  assert.equal(serializeProgram(p), before);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
});

test('faceted independent legends join the outer stack and remain editable through their facet owner', () => {
  const a = unit().facet({ field: 'group', columns: 3, guides: { legend: 'shared', axes: 'outer' } });
  const p = join(a, unit(false)), plot = compositionPlotBounds(p), blocks = bounds(p);
  assert.equal(blocks.length, 2);
  assert.ok(blocks.every(l => l.bounds.left >= plot.x + plot.width));
  const size = blocks.find(l => l.channels.includes('size'));
  assert.deepEqual(size.targets, [{ childPath: ['a'] }]);
  const q = p.editLegend({ target: size.targets, channel: 'size', position: 'bottom', offset: 80 });
  assert.ok(bounds(q).find(l => l.channels.includes('size')).bounds.top > compositionPlotBounds(q).y + plot.height);
});

test('ordinary concat preserves local guides; adjacent defaults to collection and policy changes replay', () => {
  const a = unit(), b = unit(false), programs = [{ id: 'a', program: a }, { id: 'b', program: b }];
  const local = hconcat({ programs, share: { color: true } });
  assert.equal(bounds(local).length, 1);
  const collected = local.editCompositionLayout({ legends: 'collect' });
  assert.equal(bounds(collected).length, 2);
  assert.deepEqual(collected.editCompositionLayout({ legends: 'local' }).graphicSpec, local.graphicSpec);
  const adjacent = a.createAdjacentPlot({ id: 'b', source: 'p', position: 'right', share: { color: true }, plot: { action: 'createScatterPlot' } });
  assert.equal(adjacent.compositionSpec.legends, 'collect');
  assert.equal(bounds(adjacent).length, 2);
  const explicit = a.createAdjacentPlot({ id: 'b', source: 'p', position: 'right', share: { color: true }, legends: 'local', plot: { action: 'createScatterPlot' } });
  assert.equal(bounds(explicit).length, 1);
  const moved = adjacent.editLegend({ target: { childPath: ['p'], id: 'p' }, channel: 'size', position: 'left', offset: 90 });
  const restored = moved.editCompositionLayout({ legends: 'local' }).children.p;
  assert.deepEqual(resolveConcreteGraphicBounds(restored.graphicSpec, 'sizeLegendTitle'),
    resolveConcreteGraphicBounds(restored.rematerializeLegend().graphicSpec, 'sizeLegendTitle'));
  for (const legends of [null, false, 'shared', {}]) {
    assert.throws(() => hconcat({ programs, legends }), /legends/);
    assert.throws(() => local.editCompositionLayout({ legends }), /legends/);
    assert.throws(() => a.createAdjacentPlot({ id: 'b', source: 'p', legends, share: { color: true }, plot: { action: 'createScatterPlot' } }), /legends/);
  }
  const facet = a.facet({ field: 'group', columns: 3 });
  assert.throws(() => facet.editCompositionLayout({ legends: 'collect' }), /Facet/);
  assert.deepEqual(deserializeProgram(serializeProgram(collected)).graphicSpec, collected.graphicSpec);
});
