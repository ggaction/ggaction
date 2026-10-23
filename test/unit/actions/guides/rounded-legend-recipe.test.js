import assert from 'node:assert/strict';
import test from 'node:test';
import { chart } from '../../../../src/index.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';

const values = [
  { year: '2010', category: 'A', value: 1 }, { year: '2011', category: 'A', value: 2 },
  { year: '2010', category: 'B', value: 2 }, { year: '2011', category: 'B', value: 3 }
];
const swatch = { width: 10, height: 10, strokeWidth: 0 };
function bars(cornerRadius = 1) {
  return chart()
    .createCanvas({ plot: { width: 200, height: 200 }, margin: { left: 40, right: 120, top: 40, bottom: 40 } })
    .createData({ values })
    .createBarPlot({ x: { field: 'year', fieldType: 'temporal' }, y: 'value', guides: false })
    .editBarMark({ cornerRadius })
    .encodeColor({ field: 'category' });
}
function equalOutput(actual, expected) {
  assert.deepEqual(actual.graphicSpec, expected.graphicSpec);
  assert.deepEqual(actual.graphicSpec.order, expected.graphicSpec.order);
  assert.deepEqual(actual.guideConfigs, expected.guideConfigs);
  assert.deepEqual(actual.semanticSpec, expected.semanticSpec);
  assert.deepEqual(deserializeProgram(serializeProgram(actual)).graphicSpec, actual.graphicSpec);
}
for (const [name, symbol] of [
  ['plain swatch', swatch],
  ['layered swatch', { layers: [{ type: 'swatch', ...swatch }] }]
]) test(`rounded bar legends accept ${name} edits with the exact creation result`, () => {
  const base = bars(), original = base.createLegend({}), before = serializeProgram(original);
  const edited = original.editLegendSymbols({ symbol });
  equalOutput(edited, base.createLegend({ symbol }));
  assert.equal(serializeProgram(original), before);
  assert(edited.graphicSpec.objects.colorLegendSymbols.items.every(item => !item.properties.commands));
});

test('rounded bar sample edits restore the automatic rounded path collection', () => {
  const original = bars().createLegend({});
  const edited = original.editLegendSymbols({ symbol: swatch });
  const restored = edited.editLegendSymbols({ symbol: 'auto' });
  equalOutput(restored, original);
  assert.equal(restored.graphicSpec.objects.colorLegendSymbols.type, 'collection');
  assert(restored.graphicSpec.objects.colorLegendSymbols.items.every(item => item.type === 'path'));
});

test('rounded sample replacement preserves repeated size edits and data rematerialization', () => {
  const base = bars(), original = base.createLegend({}), before = serializeProgram(original);
  let edited = original;
  for (const size of [10, 6, 12, 10]) {
    const symbol = { width: size, height: size, strokeWidth: 0 };
    edited = edited.editLegendSymbols({ symbol });
    equalOutput(edited, base.createLegend({ symbol }));
  }
  const revisedValues = values.filter(row => row.category === 'A');
  const filtered = edited.reviseData({ source: 'data', id: 'revised', values: revisedValues });
  const expected = base.createLegend({ symbol: swatch })
    .reviseData({ source: 'data', id: 'revised', values: revisedValues });
  assert.equal(filtered.semanticSpec.layers[0].data, 'revised');
  equalOutput(filtered, expected);
  assert.equal(serializeProgram(original), before);
});

test('rounded fallback replacement reconciles mixed recipe owners and facet replay', () => {
  const base = bars(), symbol = { layers: [
    { type: 'line', length: 16, lineWidth: 1 },
    { type: 'point', size: 3 },
    { type: 'swatch', ...swatch }
  ] };
  const edited = base.createLegend({}).editLegendSymbols({ symbol });
  const expected = base.createLegend({ symbol });
  equalOutput(edited, expected);
  equalOutput(edited.facet({ field: 'category', scales: { color: 'independent' } }),
    expected.facet({ field: 'category', scales: { color: 'independent' } }));
});

test('unrounded swatch edits retain their existing exact output', () => {
  const base = bars(0);
  equalOutput(base.createLegend({}).editLegendSymbols({ symbol: swatch }), base.createLegend({ symbol: swatch }));
});
