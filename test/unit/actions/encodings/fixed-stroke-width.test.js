import assert from 'node:assert/strict';
import test from 'node:test';
import { chart } from '../../../../src/ChartProgram.js';
import { describeAction } from '../../../../src/inspection.js';

const base = () => chart().createCanvas({ width: 480, height: 320, margin: { left: 50, right: 160, top: 30, bottom: 50 } })
  .createData({ values: [{ x: 1, y: 2, g: 'A' }, { x: 2, y: 3, g: 'B' }, { x: 3, y: 4, g: 'A' }, { x: 4, y: 2, g: 'B' }] });
const cases = [
  ['createScatterPlot', { x: 'x', y: 'y' }],
  ['createBarPlot', { x: 'g', y: { field: 'y', aggregate: 'sum' } }],
  ['createAreaPlot', { x: 'x', y: 'y' }],
  ['createPiePlot', { category: 'g', value: 'y' }],
  ['createRugPlot', { x: 'x', edge: 'bottom' }],
];
for (const [method, options] of cases) test(`${method} supports fixed width without advertising field mapping`, () => {
  const bare = base()[method]({ id: 'p', ...options });
  assert.doesNotThrow(() => bare.encodeStrokeWidth({ target: 'p', value: 2 }));
  const before = base()[method]({ id: 'p', ...options }).encodeStroke({ target: 'p', value: '#123456' });
  const snapshot = JSON.stringify(before);
  const descriptor = describeAction(before, { action: 'encodeStrokeWidth', target: { kind: 'mark', id: 'p' } });
  assert.ok(['supported', 'needs-input'].includes(descriptor.applicability));
  assert.ok(descriptor.parameterDefinitions.some(p => p.path === 'value'));
  assert.ok(!descriptor.parameterDefinitions.some(p => p.path === 'field'));
  assert.equal(describeAction(before, { action: 'encodeStrokeWidth', target: { kind: 'mark', id: 'p' }, options: { field: 'y' } }).applicability, 'unsupported');
  for (const value of [0, 1, 3.5]) {
    const after = before.encodeStrokeWidth({ target: 'p', value }).editCanvas({ plot: { width: 250, height: 180 } });
    const config = after.markConfigs.p.barAppearance ?? after.markConfigs.p;
    assert.equal(config.strokeWidth, value);
    assert.equal(config.stroke, '#123456');
    assert.deepEqual(after.semanticSpec.layers[0].encoding, before.semanticSpec.layers[0].encoding);
    const graphics = JSON.stringify(after.graphicSpec);
    assert.ok(graphics.includes('"strokeWidth":' + value) || graphics.includes('"lineWidth":' + value));
  }
  for (const args of [{ value: -1 }, { value: NaN }, { value: 1, field: 'y' }, { value: 1, scale: {} }, { field: 'y' }])
    assert.throws(() => before.encodeStrokeWidth({ target: 'p', ...args }));
  assert.equal(JSON.stringify(before), snapshot);
});

test('width edits preserve point and area variable stroke mappings', () => {
  for (const method of ['createScatterPlot', 'createAreaPlot']) {
    const before = base()[method]({ id: 'p', x: 'x', y: 'y', ...(method === 'createAreaPlot' ? { groupBy: 'g' } : {}) }).encodeStroke({ target: 'p', field: 'g', fieldType: 'nominal' });
    const after = before.encodeStrokeWidth({ target: 'p', value: 3 });
    assert.deepEqual(after.semanticSpec.layers[0].encoding.stroke, before.semanticSpec.layers[0].encoding.stroke);
    assert.equal(after.markConfigs.p.stroke, undefined);
    assert.equal(after.markConfigs.p.strokeWidth, 3);
  }
});
