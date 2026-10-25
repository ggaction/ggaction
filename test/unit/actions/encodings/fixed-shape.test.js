import assert from 'node:assert/strict';
import test from 'node:test';
import { chart } from '../../../../src/ChartProgram.js';
import { describeAction } from '../../../../src/inspection.js';
import { POINT_SHAPES } from '../../../../src/grammar/pointShapes.js';

const base = () => chart().createCanvas({ width: 480, height: 320, margin: { left: 50, right: 160, top: 30, bottom: 50 } })
  .createData({ values: [{ x: 1, y: 2, g: 'A' }, { x: 2, y: 3, g: 'B' }] })
  .createScatterPlot({ id: 'p', x: 'x', y: 'y', color: { field: 'g' } });

test('fixed shapes replace mapped shapes, preserve other channels, and survive rematerialization', () => {
  const before = base().encodeShape({ target: 'p', field: 'g' }).createGuides();
  const snapshot = JSON.stringify(before);
  for (const value of [...POINT_SHAPES, { polygon: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }] }]) {
    const after = before.encodeShape({ target: 'p', value });
    assert.equal(typeof after.markConfigs.p.shape, typeof value);
    assert.equal(after.semanticSpec.layers[0].encoding.shape, undefined);
    assert.deepEqual(after.semanticSpec.layers[0].encoding.color, before.semanticSpec.layers[0].encoding.color);
    const resized = after.editCanvas({ plot: { width: 250, height: 200 } }).createGuides();
    assert.deepEqual(resized.markConfigs.p.shape, after.markConfigs.p.shape);
    assert.ok(!Object.values(resized.guideConfigs.legend ?? {}).some(l => l.channel === 'shape' || l.channels?.includes('shape')));
    const mapped = after.encodeShape({ target: 'p', field: 'g' });
    assert.equal(mapped.semanticSpec.layers[0].encoding.shape.field, 'g');
    assert.equal(mapped.graphicSpec.objects.p.items[0].type, 'circle');
    assert.equal(mapped.graphicSpec.objects.p.items[1].type, 'rect');
  }
  assert.equal(JSON.stringify(before), snapshot);
});

test('shape fixed/field contract validates before changing a program and is discoverable', () => {
  const before = base(), snapshot = JSON.stringify(before);
  for (const args of [{}, { value: 'circle', field: 'g' }, { value: 'nope' },
    { value: 'circle', fieldType: 'nominal' }, { value: 'circle', scale: {} }]) {
    assert.throws(() => before.encodeShape({ target: 'p', ...args }));
  }
  assert.equal(JSON.stringify(before), snapshot);
  const descriptor = describeAction(before, { action: 'encodeShape', target: { kind: 'mark', id: 'p' }, options: { value: 'circle' } });
  assert.equal(descriptor.applicability, 'supported');
  assert.ok(descriptor.parameterDefinitions.some(p => p.path === 'value'));
  const incomplete = chart().createCanvas().createData({ values: [{ x: 1, y: 2 }] }).createPointMark({ id: 'p' })
    .encodeShape({ value: 'square' }).encodeX({ field: 'x' }).encodeY({ field: 'y' });
  assert.equal(incomplete.graphicSpec.objects.p.items[0].type, 'rect');
});
