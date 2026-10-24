import test from 'node:test';
import assert from 'node:assert/strict';
import { chart, hconcat, vconcat } from '../../../../src/index.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';
import { compositionPlotBounds } from '../../../../src/materialization/composition.js';
import { resolveConcreteGraphicBounds } from '../../../../src/grammar/schemas/graphicBounds.js';
const bars = () => chart().createCanvas({ plot: { width: 200, height: 200 }, margin: { left: 80, right: 130, top: 50, bottom: 70 } })
  .createData({ id: 'd', values: [{ g: 'A', y: 2 }, { g: 'B', y: 4 }] })
  .createBarPlot({ id: 'p', data: 'd', x: 'g', y: 'y', color: 'g' }).createGuides();
const concat = (fn = hconcat, share = {}) => fn({ programs: [{ id: 'a', program: bars() }, { id: 'b', program: bars() }], align: 'plot', gap: 8, share });
const legendTitles = p => Object.keys(p.graphicSpec.objects).filter(id => id.endsWith('colorLegendTitle'));

test('concat title is one parent resource with four reserved edges and immutable child titles', () => {
  for (const fn of [hconcat, vconcat]) for (const position of ['top', 'bottom', 'left', 'right']) {
    const base = concat(fn);
    let p = base.createTitle({ text: 'Overview', subtitle: 'Two views', position, align: 'center' });
    assert.equal(Object.keys(p.graphicSpec.objects).filter(id => id.endsWith('chartTitle')).length, 1);
    assert.ok(Object.values(p.children).every(child => child.semanticSpec.title.text === undefined));
    assert.equal(base.semanticSpec.title.text, undefined);
    const bounds = resolveConcreteGraphicBounds(p.graphicSpec, 'chartTitle');
    const plot = compositionPlotBounds(p);
    if (position === 'top') assert.ok(bounds.bottom < plot.y);
    if (position === 'bottom') assert.ok(bounds.top > plot.y + plot.height);
    if (position === 'left') assert.ok(bounds.right < plot.x);
    if (position === 'right') assert.ok(bounds.left > plot.x + plot.width);
    p = p.editTitle({ text: 'Changed', subtitle: false }).editCompositionLayout({ gap: 20 });
    assert.equal(p.graphicSpec.objects.chartTitle.properties.text, 'Changed');
    assert.equal(p.graphicSpec.objects.chartSubtitle, undefined);
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
    p = p.createTitle({ target: { childPath: ['a'] }, text: 'Local' });
    assert.equal(p.semanticSpec.title.text, 'Changed');
    assert.equal(p.children.a.semanticSpec.title.text, 'Local');
    assert.equal(p.removeTitle().children.a.semanticSpec.title.text, 'Local');
  }
});

test('shared color emits one outer legend, restores independent legends, and survives nested edits', () => {
  const base = concat(hconcat, { color: true });
  assert.equal(legendTitles(base).length, 1);
  assert.equal(legendTitles(base.children.a).length, 1);
  const root = base.graphicSpec.objects['composition-shared-color-legend'];
  assert.ok(root.properties.x > compositionPlotBounds(base).x + compositionPlotBounds(base).width);
  assert.equal(legendTitles(base.editCompositionScales({ share: { color: false } })).length, 2);
  let nested = base.createAdjacentPlot({ target: { childPath: ['b'] }, source: 'p', id: 'c', plot: { action: 'createBarPlot', options: { x: 'g', y: 'y', color: 'g' } }, share: { color: true } });
  assert.equal(legendTitles(nested).length, 1);
  nested = nested.createTitle({ text: 'All', align: 'center' }).encodeOpacity({ target: { childPath: ['b', 'c'], id: 'c' }, value: .4 });
  assert.equal(legendTitles(nested).length, 1);
  assert.equal(nested.semanticSpec.title.text, 'All');
  assert.deepEqual(deserializeProgram(serializeProgram(nested)).graphicSpec, nested.graphicSpec);
});

test('uniform child backgrounds cover parent gaps and guide lanes through replay', () => {
  const base = concat(hconcat, { color: true });
  const p = base.editCanvas({ target: [{ childPath: ['a'] }, { childPath: ['b'] }], background: '#e5e7eb' }).createTitle({ text: 'All' });
  assert.equal(p.graphicSpec.objects.canvas.properties.background, '#e5e7eb');
  assert.equal(base.graphicSpec.objects.canvas.properties.background, 'white');
  const edited = p.editCanvas({ target: { childPath: ['a'] }, background: '#ff0000' });
  assert.equal(edited.children.b.graphicSpec.objects.canvas.properties.background, '#e5e7eb');
  assert.equal(edited.graphicSpec.objects.canvas.properties.background, '#e5e7eb');
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
});
