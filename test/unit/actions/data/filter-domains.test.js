import test from 'node:test';
import assert from 'node:assert/strict';
import { chart } from '../../../../src/index.js';
import { prepareCompositionSnapshots } from '../../../../src/materialization/composition.js';
import { resolveMarkItems } from '../../../../src/materialization/selection/policies/index.js';

const boundaries = [0, 10, 20, 30, 40, 50];
const rows = [2, 12, 22, 32, 42].flatMap((x, i) => ['A', 'B'].map(group => ({ x, y: 50 - i * 10, group })));
function bars({ explicit = false, zero = false, histogram = false } = {}) {
  const base = chart().createCanvas({ plot: { width: 300, height: 300 }, margin: 80 })
    .createData({ id: 'data', values: rows });
  const scale = { nice: false, zero, ...(explicit ? { domain: [0, 50] } : {}) };
  return histogram ? base.createHistogram({ id: 'plot', field: 'x', binBoundaries: boundaries, xScale: scale })
    : base.createBarPlot({ id: 'plot', x: { field: 'x', bin: { boundaries }, scale },
      y: { field: 'y', aggregate: 'sum', scale: { nice: false } } });
}
const filter = (p, op, value, mode = 'replace') => p.filterMarks({ target: 'plot', channel: 'x', op, value, mode });
const xDomain = p => p.resolvedScales[p.semanticSpec.layers.find(l => l.id === 'plot').encoding.x.scale].domain;
const yDomain = p => p.resolvedScales[p.semanticSpec.layers.find(l => l.id === 'plot').encoding.y.scale].domain;
const intervals = p => resolveMarkItems(p, 'plot').map(i => [i.channels.x, i.channels.x2]);

test('filtered histograms fit surviving complete bins without rebinning or stale ticks', () => {
  for (const histogram of [false, true]) {
    const base = bars({ histogram }).createVerticalGrid();
    const high = filter(base, 'gte', 30);
    assert.deepEqual(xDomain(high), [30, 50]);
    assert.deepEqual(intervals(high), [[30, 40], [40, 50]]);
    assert.deepEqual(high.guideConfigs.axis.x.ticks.values, [30, 40, 50]);
    assert.deepEqual(high.semanticSpec.layers.find(l => l.id === 'plot').encoding.x.bin.boundaries, boundaries);
    const rects = high.graphicSpec.objects.plot.items.map(i => i.properties);
    assert.equal(rects[0].x, high.resolvedScales.x.range[0]);
    assert.equal(rects.at(-1).x + rects.at(-1).width, high.resolvedScales.x.range[1]);
    assert.equal(rects[0].x + rects[0].width, rects[1].x);
    assert.deepEqual(xDomain(base), [0, 50]);
    assert.equal(base.graphicSpec.objects.plot.items.length, 5);
    if (!histogram) assert.deepEqual(yDomain(high), [0, 40]);
  }
});

test('replace, compose, resize, empty results and removal retain the correct filter domains', () => {
  const base = bars();
  const high = filter(base, 'gte', 30);
  assert.deepEqual(xDomain(high.editCanvas({ plot: { width: 450, height: 250 } }).encodeStroke({ target: 'plot', value: '#000' })), [30, 50]);
  const low = filter(high, 'lte', 10);
  assert.deepEqual(xDomain(low), [0, 20]);
  const middle = filter(filter(base, 'gte', 10), 'lte', 20, 'compose');
  assert.deepEqual(xDomain(middle), [10, 30]);
  assert.deepEqual(intervals(middle), [[10, 20], [20, 30]]);
  const empty = filter(high, 'gt', 100);
  assert.equal(empty.graphicSpec.objects.plot.items.length, 0);
  assert.deepEqual(xDomain(empty), xDomain(base));
  const emptyComposed = filter(high, 'gt', 100, 'compose');
  assert.equal(emptyComposed.graphicSpec.objects.plot.items.length, 0);
  assert.deepEqual(xDomain(emptyComposed), xDomain(high));
  const restored = high.removeMarkFilter({ target: 'plot' });
  assert.deepEqual(xDomain(restored), [0, 50]);
  assert.deepEqual(intervals(restored), intervals(base));
});

test('automatically chosen bins keep their counts and widths when only one bin survives', () => {
  const base = chart().createCanvas({ width: 500, height: 400 })
    .createData({ id: 'data', values: rows })
    .createHistogram({ id: 'plot', field: 'x', maxBins: 5 });
  const items = resolveMarkItems(base, 'plot'), last = items.at(-1);
  const next = filter(base, 'gte', last.channels.x);
  const [kept] = resolveMarkItems(next, 'plot');
  assert.deepEqual(xDomain(next), [last.channels.x, last.channels.x2]);
  assert.equal(kept.channels.y2, last.channels.y2);
  assert.equal(kept.channels.x2 - kept.channels.x, last.channels.x2 - last.channels.x);
  assert.equal(next.graphicSpec.objects.plot.items.length, 1);
  assert.deepEqual(intervals(next.removeMarkFilter()), intervals(base));
});

test('auto-domain fitting preserves interior gaps, the last inclusive boundary and explicit scale intent', () => {
  const source = bars().reviseData({ source: 'data', id: 'updated', values: [{ x: 10, y: 1 }, { x: 50, y: 2 }] });
  const kept = source.filterMarks({ target: 'plot', channel: 'x', op: 'gte', value: 10 });
  assert.deepEqual(xDomain(kept), [10, 50]);
  assert.deepEqual(intervals(kept), [[10, 20], [40, 50]]);
  assert.deepEqual(xDomain(filter(bars({ explicit: true }), 'gte', 30)), [0, 50]);
  assert.deepEqual(xDomain(filter(bars({ zero: true }), 'gte', 30)), [0, 50]);
});

test('bar-endpoint filtering shrinks both domains while preserving a zero measure baseline', () => {
  const base = bars();
  const low = base.filterMarks({ target: 'plot', channel: 'y2', op: 'lte', value: 40 });
  assert.deepEqual(xDomain(low), [30, 50]);
  assert.deepEqual(yDomain(low), [0, 40]);
  assert.equal(low.graphicSpec.objects.plot.items.length, 2);
});

test('filtered histograms and their source-following overlays use the same fitted scale', () => {
  const base = bars().createOverlay({ id: 'trend', source: 'plot', type: 'line', basis: 'visibleItems' });
  const next = filter(base, 'gte', 30);
  assert.deepEqual(xDomain(next), [30, 50]);
  const path = next.graphicSpec.objects.trend.items[0].properties.commands;
  assert.equal(path.length, 2);
  assert.notDeepEqual(path, base.graphicSpec.objects.trend.items[0].properties.commands);
  assert.equal(next.semanticSpec.layers.find(l => l.id === 'trend').encoding.x.scale, 'x');
  const unfiltered = base.createScatterPlot({ id: 'raw', data: 'data', x: { field: 'x', scale: { id: 'x' } }, y: { field: 'y', scale: { id: 'y' } }, guides: false });
  assert.deepEqual(xDomain(filter(unfiltered, 'gte', 30)), [2, 50]);
});

test('facet replay derives shared domains from retained bins in every partition', () => {
  const faceted = bars().facet({ field: 'group', data: 'data', columns: 2 });
  const next = faceted.editFacetSource({ action: { method: 'filterMarks', options: { target: 'plot', channel: 'x', op: 'gte', value: 30 } } });
  for (const id of next.compositionSpec.children) {
    assert.deepEqual(xDomain(next.children[id]), [30, 50]);
    assert.equal(next.children[id].graphicSpec.objects.plot.items.length, 2);
  }
});

test('adjacent plots recompute shared ranges as each child is filtered', () => {
  const base = bars().createAdjacentPlot({ id: 'other', source: 'plot', position: 'right',
    plot: { action: 'createBarPlot', options: { data: 'data', x: { field: 'x', bin: { boundaries } }, y: { field: 'y', aggregate: 'sum' } } },
    share: { x: true, y: true } });
  const first = base.filterMarks({ target: { childPath: ['plot'], id: 'plot' }, channel: 'x', op: 'gte', value: 30 });
  assert.deepEqual(xDomain(prepareCompositionSnapshots(first).children.plot), [0, 50]);
  const next = first.filterMarks({ target: { childPath: ['other'], id: 'other' }, channel: 'x', op: 'gte', value: 30 });
  assert.deepEqual(xDomain(prepareCompositionSnapshots(next).children.plot), [30, 50]);
  assert.deepEqual(prepareCompositionSnapshots(next).children.other.resolvedScales.x.domain, [30, 50]);
});
