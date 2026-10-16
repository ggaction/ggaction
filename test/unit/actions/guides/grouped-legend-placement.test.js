import assert from 'node:assert/strict';
import test from 'node:test';
import { chart } from '../../../../src/index.js';
import { chart as basicChart } from '../../../../src/basic.js';
import { legendFixtureBounds, legendFixturePrimitiveBounds, legendFixtureTextWidth } from '../../../oracles/legend-occupied.js';

const FAMILIES = ['color', 'series', 'gradient', 'interval', 'size', 'opacity', 'strokeWidth'];
const CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const ROWS = [{ x: 0, y: 0, m: 0, g: 'A' }, { x: 10, y: 10, m: 10, g: 'B' }];
const CANVAS = { width: 1200, height: 1000, margin: { left: 300, right: 300, top: 250, bottom: 250 } };
const BORDER = { color: 'black', lineWidth: 4, padding: 6, background: 'white' };
const style = { title: false, labels: { fontSize: 10 }, border: BORDER };
const close = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-7, `${message}: ${a} versus ${b}`);
function base(kind = 'color', factory = chart, canvas = CANVAS) {
  let p = factory().createCanvas(canvas).createData({ id: 'data', values: ROWS });
  p = kind === 'strokeWidth' ? p.createLineMark({ id: 'marks' }) : p.createPointMark({ id: 'marks' });
  p = p.encodeX({ field: 'x' }).encodeY({ field: 'y' });
  if (kind === 'color') return p.encodeColor({ field: 'g' });
  if (kind === 'series') return p.encodeShape({ field: 'g', scale: { domain: ['A', 'B'], range: ['circle', 'circle'] } });
  if (['gradient', 'interval'].includes(kind)) return p.encodeColor({ field: 'm', fieldType: 'quantitative',
    ...(kind === 'interval' ? { scale: { type: 'quantize', range: ['red', 'blue'] } } : {}) });
  if (kind === 'strokeWidth') return p.encodeGroup({ field: 'g' }).encodeStrokeWidth({ field: 'm' });
  return p[kind === 'size' ? 'encodeSize' : 'encodeOpacity']({ field: 'm' });
}
const options = kind => ({ ...style, ...(['gradient', 'size', 'opacity', 'strokeWidth'].includes(kind) ? { count: 2 } : {}) });
function corner(p, position, canvas = CANVAS, inset = 8) {
  const b = legendFixtureBounds(p), m = canvas.margin;
  close(position.endsWith('left') ? b.left : b.right,
    position.endsWith('left') ? m.left + inset : canvas.width - m.right - inset, position + ' horizontal occupied anchor');
  close(position.startsWith('top') ? b.top : b.bottom,
    position.startsWith('top') ? m.top + inset : canvas.height - m.bottom - inset, position + ' vertical occupied anchor');
  assert.ok(b.left >= 0 && b.top >= 0 && b.right <= canvas.width && b.bottom <= canvas.height);
  return b;
}
function multi(canvas = CANVAS, title = 'T') {
  let p = base('color', chart, canvas).encodeSize({ field: 'm', scale: { range: [4 * Math.PI, 25 * Math.PI] } }).encodeOpacity({ field: 'm' });
  if (title === 'Wide legend title') p = p.applyTextMetrics({ profile: { schemaVersion: 1, id: 'legend-fixture', measurements: [
    { text: title, fontSize: 10, fontFamily: 'sans-serif', fontWeight: 400, width: 120 }
  ] } });
  const common = { title, titleStyle: { fontSize: 10, fontWeight: 'normal' }, labels: { fontSize: 10 }, border: BORDER };
  return p.createLegend({ channels: ['color'], ...common })
    .createLegend({ channels: ['size'], count: 2, ...common })
    .createLegend({ channels: ['opacity'], values: [0, 10], ...common });
}

function externalRow(canvas, position) {
  const title = 'Wide legend title';
  const p = base('color', chart, canvas).encodeSize({ field: 'm', scale: { range: [4 * Math.PI, 25 * Math.PI] } })
    .encodeOpacity({ field: 'm' }).applyTextMetrics({ profile: { schemaVersion: 1, id: 'external-legend-fixture', measurements: [
      { text: title, fontSize: 10, fontFamily: 'sans-serif', fontWeight: 400, width: 120 }
    ] } });
  const common = { title, titleStyle: { fontSize: 10, fontWeight: 'normal' }, labels: { fontSize: 10 }, border: BORDER };
  return p.createLegend({ channels: ['color'], position, blockLayout: 'row', align: 'left', offset: 20, direction: 'horizontal', ...common })
    .createLegend({ channels: ['size'], count: 2, direction: 'horizontal', ...common })
    .createLegend({ channels: ['opacity'], values: [0, 10], ...common });
}
const blockBounds = p => ['colorLegend', 'sizeLegend', 'opacityLegend'].map(prefix => legendFixtureBounds(p, id => id.startsWith(prefix)));

test('literal occupied-bounds oracle includes strokes and baseline geometry', () => {
  assert.equal(legendFixtureTextWidth('10', 10), 12.2);
  assert.deepEqual(legendFixturePrimitiveBounds('rect', { x: 10, y: 20, width: 14, height: 12, stroke: 'black', strokeWidth: 4 }),
    { left: 8, right: 26, top: 18, bottom: 34 });
  assert.deepEqual(legendFixturePrimitiveBounds('text', { x: 30, y: 20, text: 'A', fontSize: 10, textAlign: 'left', textBaseline: 'top' }),
    { left: 30, right: 36.1, top: 20, bottom: 30 });
});

test('every public legend family supports all four corners with complete border-stroke anchors', () => {
  for (const factory of [chart, basicChart]) for (const kind of FAMILIES) {
    if (factory === basicChart && ['opacity', 'strokeWidth'].includes(kind)) continue;
    const p = base(kind, factory), before = JSON.stringify(p);
    for (const position of CORNERS) {
      const created = p.createLegend({ ...options(kind), position });
      corner(created, position);
      if (kind === 'gradient') {
        const strips = created.graphicSpec.objects.colorGradientStrips.items.map(item => item.properties);
        assert.equal(new Set(strips.map(item => item.x)).size, 1, 'corner gradient stays vertical');
        assert.ok(new Set(strips.map(item => item.y)).size > 1);
      }
      if (factory === chart) {
        const edited = p.createLegend(options(kind)).editLegendLayout({ position });
        corner(edited, position);
        assert.deepEqual(edited.graphicSpec, created.graphicSpec, kind + '/' + position + ' create/edit parity');
      }
    }
    assert.equal(JSON.stringify(p), before);
  }
});

test('three corner blocks form one stable row, preserving internal vertical item direction', () => {
  const p = multi(), before = JSON.stringify(p);
  for (const position of CORNERS) {
    const q = p.editLegendLayout({ position, blockLayout: 'row' });
    corner(q, position);
    const boxes = blockBounds(q);
    boxes.slice(1).forEach((b, i) => { close(b.top, boxes[0].top, 'row top'); close(b.left - boxes[i].right, 24, 'corner block gap'); });
    assert.deepEqual(Object.values(q.guideConfigs.legend).map(g => g.position), [position, position, position]);
    for (const id of ['colorLegendLabels', 'sizeLegendLabels', 'opacityLegendLabels']) {
      const [a, b] = q.graphicSpec.objects[id].items.map(x => x.properties);
      close(a.x, b.x, 'item column retained'); assert.ok(a.y < b.y);
    }
  }
  assert.equal(JSON.stringify(p), before);
});

test('top and bottom rows may exceed a300-pixel plot but must fit the full Canvas without wrapping', () => {
  const canvas = { width: 1200, height: 800, margin: { left: 100, right: 800, top: 150, bottom: 350 } };
  const p = multi(canvas, 'Wide legend title'), before = JSON.stringify(p);
  for (const position of ['top', 'bottom']) {
    const q = externalRow(canvas, position);
    const b = legendFixtureBounds(q), boxes = blockBounds(q);
    close(b.left, 100, 'row left aligned to plot');
    close(position === 'top' ? b.bottom : b.top, position === 'top' ? 130 : 470, 'external occupied edge gap');
    assert.ok(b.right - b.left > 300 && b.right <= canvas.width);
    for (const id of ['colorLegendLabels', 'sizeLegendLabels', 'opacityLegendLabels']) {
      const [first, second] = q.graphicSpec.objects[id].items.map(item => item.properties);
      close(first.y, second.y, 'horizontal items inside each external block'); assert.ok(first.x < second.x);
    }
    boxes.slice(1).forEach((box, i) => { close(box.top, boxes[0].top, 'external row top'); close(box.left - boxes[i].right, 40, 'external block gap'); });
    assert.throws(() => q.editCanvas({ width: 500, margin: { right: 100 } }), /Canvas|space|fit|width/);
    assert.equal(JSON.stringify(p), before);
  }
});

test('free occupied anchors accept negative plot-relative coordinates and replace edge anchors immutably', () => {
  const input = { at: { x: -200, y: -150 }, blockLayout: 'column' }, p = multi(), before = JSON.stringify(p), saved = structuredClone(input);
  const free = p.editLegendLayout(input), b = legendFixtureBounds(free);
  close(b.left, 100, 'negative relative x'); close(b.top, 100, 'negative relative y');
  assert.deepEqual(input, saved); assert.equal(JSON.stringify(p), before);
  const single = base().createLegend({ ...style, border: false, at: { x: 201, y: 79 } });
  const one = legendFixtureBounds(single); close(one.left, 501, 'free single x'); close(one.top, 329, 'free single y');
  const edge = free.editLegendLayout({ position: 'bottom-right' }); corner(edge, 'bottom-right');
  const returned = edge.editLegendLayout({ at: { x: -200, y: -150 } });
  assert.deepEqual(returned.graphicSpec, free.graphicSpec);
  const direct = base().createLegend({ ...style, at: { x: -200, y: -150 } });
  const edited = base().createLegend(style).editLegendLayout({ at: { x: -200, y: -150 } });
  assert.deepEqual(direct.graphicSpec, edited.graphicSpec);
});

test('invalid free placement, conflicting same-call anchors and failed layout leave old programs untouched', () => {
  const p = multi(), before = JSON.stringify(p);
  for (const patch of [ { at: {} }, { at: { x: 1 } }, { at: { y: 1 } }, { at: { x: 1, y: 1, z: 1 } },
    { at: { x: NaN, y: 1 } }, { at: { x: Infinity, y: 1 } }, { at: { x: 1, y: -Infinity } },
    { at: { x: 0, y: 0 }, position: 'right' }, { at: { x: 0, y: 0 }, align: 'left' },
    { at: { x: 0, y: 0 }, offset: 0 }, { at: { x: -301, y: 0 } },
    { blockLayout: 'diagonal' }, { target: 'missing', at: { x: 0, y: 0 } } ]) {
    assert.throws(() => p.editLegendLayout(patch), JSON.stringify(patch));
    assert.equal(JSON.stringify(p), before);
  }
  const source = base();
  assert.throws(() => source.createLegend({ ...style, at: { x: 0, y: 0 }, position: 'right' }));
  assert.equal(JSON.stringify(p), before);
});

test('group placement survives Canvas, data and scale replay, member removal and re-creation', () => {
  const p = multi().editLegendLayout({ position: 'bottom-right', blockLayout: 'row' }), original = JSON.stringify(p);
  const resizedCanvas = { ...CANVAS, width: 1300 };
  corner(p.editCanvas({ width: 1300 }), 'bottom-right', resizedCanvas);
  const withData = p.reviseData({ source: 'data', id: 'updated', values: [...ROWS, { x: 6, y: 6, m: 5, g: 'A' }] });
  corner(withData, 'bottom-right');
  const scaled = withData.editScale({ id: 'size', range: [9 * Math.PI, 36 * Math.PI] }); corner(scaled, 'bottom-right');
  const fontEdited = p.editLegendLabels({ fontSize: 14 }).editLegendTitle({ fontSize: 14 });
  corner(fontEdited, 'bottom-right');
  assert.equal(fontEdited.graphicSpec.objects.colorLegendLabels.items[0].properties.fontSize, 14);
  assert.deepEqual(Object.keys(fontEdited.graphicSpec.objects).sort(), Object.keys(p.graphicSpec.objects).sort());
  const contentEdited = p.editLegend({ channels: ['color', 'size'] });
  corner(contentEdited, 'bottom-right');
  assert.equal(contentEdited.graphicSpec.objects.opacityLegendSymbols, undefined);
  const removed = p.removeLegend({ channels: ['size'] }); corner(removed, 'bottom-right');
  assert.equal(removed.graphicSpec.objects.sizeLegendSymbols, undefined);
  const recreated = removed.createLegend({ channels: ['size'], count: 2, title: 'T', titleStyle: { fontSize: 10, fontWeight: 'normal' }, labels: { fontSize: 10 }, border: BORDER });
  corner(recreated, 'bottom-right'); assert.deepEqual(recreated.graphicSpec, p.graphicSpec);
  assert.equal(JSON.stringify(p), original);
  const noLegends = p.removeLegend(); assert.ok(!Object.keys(noLegends.graphicSpec.objects).some(id => /Legend|Gradient/.test(id)));
});

test('non-opted programs retain legacy side defaults and explicit wrap retains multiple rows', () => {
  const p = multi(), canvas = p.graphicSpec.objects.canvas.properties;
  assert.ok(!Object.keys(p.guideConfigs.legendGroups ?? {}).length);
  const boxes = blockBounds(p); assert.ok(boxes[0].top < boxes[1].top && boxes[1].top < boxes[2].top);
  close(legendFixtureBounds(p).top, CANVAS.margin.top, 'legacy side top anchor');
  assert.deepEqual(p.editCanvas({ width: canvas.width + 50 }).graphicSpec,
    multi({ ...CANVAS, width: canvas.width + 50 }).graphicSpec);
  const narrow = { width: 1200, height: 800, margin: { left: 100, right: 800, top: 150, bottom: 350 } };
  const wrapped = multi(narrow, 'Wide legend title').editLegendLayout({ position: 'bottom', blockLayout: 'wrap', align: 'left', offset: 20 });
  const rows = blockBounds(wrapped).map(b => b.top); assert.ok(new Set(rows).size > 1, JSON.stringify(rows));
});


test('new members inherit a corner or free group while conflicting explicit creation is atomic', () => {
  const p = base().encodeSize({ field: 'm', scale: { range: [4 * Math.PI, 25 * Math.PI] } }).encodeOpacity({ field: 'm' });
  const common = { title: 'T', titleStyle: { fontSize: 10, fontWeight: 'normal' }, labels: { fontSize: 10 }, border: BORDER };
  const one = p.createLegend({ channels: ['color'], position: 'bottom-left', blockLayout: 'row', ...common });
  const two = one.createLegend({ channels: ['size'], count: 2, ...common });
  const three = two.createLegend({ channels: ['opacity'], values: [0, 10], ...common });
  corner(three, 'bottom-left');
  blockBounds(three).forEach(b => close(b.top, blockBounds(three)[0].top, 'inherited row anchor'));
  const before = JSON.stringify(two);
  assert.throws(() => two.createLegend({ channels: ['opacity'], position: 'top-right' }), /anchor|placement|conflict/);
  assert.equal(JSON.stringify(two), before);
  const freeOne = p.createLegend({ channels: ['color'], at: { x: 20, y: 20 }, ...common });
  const freeTwo = freeOne.createLegend({ channels: ['size'], at: { x: 20, y: 20 }, count: 2, ...common });
  const b = legendFixtureBounds(freeTwo); close(b.left, 320, 'inherited free x'); close(b.top, 270, 'inherited free y');
  const saved = JSON.stringify(freeOne);
  assert.throws(() => freeOne.createLegend({ channels: ['size'], at: { x: 21, y: 20 }, count: 2, ...common }), /anchor|placement|conflict/);
  assert.equal(JSON.stringify(freeOne), saved);
});

test('block layout alone does not silently choose between distinct existing anchors', () => {
  const p = base().encodeSize({ field: 'm' })
    .createLegend({ channels: ['color'], position: 'right', ...style })
    .createLegend({ channels: ['size'], position: 'bottom', count: 2, ...style });
  const before = JSON.stringify(p);
  assert.throws(() => p.editLegendLayout({ blockLayout: 'row' }), /anchor|placement|position/);
  assert.equal(JSON.stringify(p), before);
});


test('free coordinates use one occupied anchor for every legend family in Full and Basic', () => {
  for (const factory of [chart, basicChart]) for (const kind of FAMILIES) {
    if (factory === basicChart && ['opacity', 'strokeWidth'].includes(kind)) continue;
    const p = base(kind, factory), input = { ...options(kind), at: { x: 20, y: 20 } }, before = JSON.stringify(p);
    const q = p.createLegend(input), b = legendFixtureBounds(q);
    close(b.left, 320, kind + ' free occupied x'); close(b.top, 270, kind + ' free occupied y');
    if (factory === chart) assert.deepEqual(p.createLegend(options(kind)).editLegendLayout({ at: { x: 20, y: 20 } }).graphicSpec, q.graphicSpec);
    assert.equal(JSON.stringify(p), before);
  }
});

test('corner rows never fall back outside the plot, while explicit wrap and offsets remain deliberate', () => {
  const narrow = { ...CANVAS, width: 900 };
  const p = multi(narrow, 'Wide legend title'), before = JSON.stringify(p);
  assert.throws(() => p.editLegendLayout({ position: 'top-left', blockLayout: 'row' }), /plot|fit|space|width/);
  assert.equal(JSON.stringify(p), before);
  const wrapped = p.editLegendLayout({ position: 'top-left', blockLayout: 'wrap' });
  corner(wrapped, 'top-left', narrow);
  assert.ok(new Set(blockBounds(wrapped).map(b => b.top)).size > 1);
  const offset = multi().editLegendLayout({ position: 'top-right', blockLayout: 'row', offset: 12 });
  corner(offset, 'top-right', CANVAS, 12);
  const saved = JSON.stringify(offset);
  assert.throws(() => offset.editLegendLayout({ offset: -1 }));
  assert.equal(JSON.stringify(offset), saved);
});
