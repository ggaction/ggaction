import assert from 'node:assert/strict';
import test from 'node:test';
import { chart } from '../../../../src/index.js';

function program() {
  return chart().createCanvas({ width: 900, height: 700,
    margin: { top: 100, right: 250, bottom: 200, left: 150 } })
    .createData({ values: [{x: 1, y: 2, category: 'A', value: 1},
      {x: 2, y: 3, category: 'B', value: 3}] })
    .createPointMark({id: 'points'}).encodeX({field: 'x'}).encodeY({field: 'y'})
    .encodeColor({field: 'category', fieldType: 'nominal'})
    .encodeSize({field: 'value'}).encodeOpacity({field: 'value'})
    .createLegend({target: 'points', channels: ['color', 'size'], title: false})
    .createLegend({target: 'points', channels: ['opacity'], title: false});
}

test('selected focused typography changes only the requested block', () => {
  const before = program();
  const snapshot = structuredClone(before.graphicSpec);
  const after = before.editLegendLabels({channel: 'opacity', fontSize: 10});
  assert.equal(after.guideConfigs.legend.opacity.labels.fontSize, 10);
  assert.deepEqual(after.guideConfigs.legend.color, before.guideConfigs.legend.color);
  assert.deepEqual(after.guideConfigs.legend.size, before.guideConfigs.legend.size);
  assert.deepEqual(after.graphicSpec.objects.colorLegendLabels,
    before.graphicSpec.objects.colorLegendLabels);
  assert.deepEqual(after.graphicSpec.objects.sizeLegendLabels,
    before.graphicSpec.objects.sizeLegendLabels);
  assert.deepEqual(before.graphicSpec, snapshot);
  assert.deepEqual(after.graphicSpec,
    before.editLegend({channel: 'opacity', labels: {fontSize: 10}}).graphicSpec);
});

test('selected categorical edits do not share typography with size', () => {
  const before = program();
  const after = before.editLegendTitle({channel: 'color', title: 'Categories', fontSize: 11});
  assert.equal(after.graphicSpec.objects.colorLegendTitle.properties.text, 'Categories');
  assert.equal(after.graphicSpec.objects.sizeLegendTitle.properties.fontSize,
    before.graphicSpec.objects.sizeLegendTitle.properties.fontSize);
  assert.equal(after.graphicSpec.objects.sizeLegendTitle.properties.text,
    before.graphicSpec.objects.sizeLegendTitle.properties.text);
  assert.equal(after.guideConfigs.legend.size.inheritAppearance, false);
});

test('every focused editor forwards its selector and uses family validation', () => {
  const before = program();
  for (const [method, patch, whole] of [
    ['editLegendLayout', {itemGap: 22}, {itemGap: 22}],
    ['editLegendTitle', {title: 'Transparency'}, {title: 'Transparency'}],
    ['editLegendSymbols', {count: 3}, {count: 3}],
    ['editLegendBorder', {border: {color: '#111'}}, {border: {color: '#111'}}]
  ]) {
    assert.deepEqual(before[method]({channel: 'opacity', ...patch}).graphicSpec,
      before.editLegend({channel: 'opacity', ...whole}).graphicSpec);
  }
  assert.throws(() => before.editLegend({channel: 'shape', labels: {fontSize: 10}}), /no legend block/);
  assert.throws(() => before.editLegend({channel: 'opacity', channels: ['opacity']}), /channel and channels/);
  assert.throws(() => before.editLegend({channel: 'opacity'}), /at least one change/);
  assert.throws(() => before.editLegendLabels({channel: 'opacity'}), /at least one component/);
  assert.throws(() => before.editLegendSymbols({channel: 'opacity', gradient: {length: 30}}), /does not accept gradient/);
});

test('selected typography persists and replays through canvas and scale changes', async () => {
  const {serializeProgram, deserializeProgram} = await import('../../../../src/persistence.js');
  const selected = program().editLegendLabels({channel: 'size', fontSize: 9})
    .editLegendTitle({channel: 'opacity', title: false});
  const restored = deserializeProgram(serializeProgram(selected));
  assert.deepEqual(restored.graphicSpec, selected.graphicSpec);
  assert.deepEqual(restored.guideConfigs, selected.guideConfigs);
  assert.deepEqual(restored.editCanvas({width: 940}).graphicSpec,
    selected.editCanvas({width: 940}).graphicSpec);
  assert.equal(restored.editLegendLabels({channel: 'color', fontSize: 14})
    .graphicSpec.objects.sizeLegendLabels.items[0].properties.fontSize, 9);
});

test('a channel does not disambiguate independent mark owners', () => {
  const before = program().removeLegend({channels: ['opacity']}).createPointMark({id: 'other'})
    .encodeX({field: 'x'}).encodeY({field: 'y'})
    .encodeOpacity({field: 'value'})
    .createLegend({target: 'other', channels: ['opacity']});
  assert.throws(() => before.editLegendLabels({channel: 'color', fontSize: 10}), /requires target/);
  assert.equal(before.editLegendLabels({target: 'points', channel: 'color', fontSize: 10})
    .guideConfigs.legend.color.labels.fontSize, 10);
});


test('selected appearance remains independent after data and scale rematerialization', () => {
  const before = program();
  const selected = before.editLegendLabels({channel: 'color', fontSize: 10});
  const sizeFont = before.graphicSpec.objects.sizeLegendLabels.items[0].properties.fontSize;
  const opacityFont = before.graphicSpec.objects.opacityLegendLabels.items[0].properties.fontSize;
  for (const replayed of [selected.editCanvas({width: 950}),
    selected.editScale({id: selected.guideConfigs.legend.size.scale, range: [20, 100]}),
    selected.createData({id: 'replacement', values: [{x: 1, y: 2, category: 'A', value: 1},
      {x: 2, y: 3, category: 'B', value: 4}]}).bindMarkData({target: 'points', data: 'replacement'})]) {
    assert.equal(replayed.graphicSpec.objects.colorLegendLabels.items[0].properties.fontSize, 10);
    assert.equal(replayed.graphicSpec.objects.sizeLegendLabels.items[0].properties.fontSize, sizeFont);
    assert.equal(replayed.graphicSpec.objects.opacityLegendLabels.items[0].properties.fontSize, opacityFont);
  }
});
