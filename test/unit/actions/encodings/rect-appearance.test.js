import test from 'node:test';
import assert from 'node:assert/strict';
import { chart } from '../../../../src/index.js';
import { renderToSVG } from '../../../../src/renderers/svg.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';
import { describeAction, inspectProgram } from '../../../../src/inspection.js';
const rows = [{ X: 'A', Y: 'B', V: 1 }, { X: 'B', Y: 'B', V: 3 }];
const base = () => chart().createCanvas({ width: 700, height: 430, margin: { left: 80, right: 200, top: 40, bottom: 70 } })
  .createData({ values: rows }).createHeatmap({ id: 'cells', x: 'X', y: 'Y', color: 'V', guides: false });
const values = (p, channel) => p.graphicSpec.objects.cells.items.map(i => i.properties[channel]);
for (const [method, channel, range, fixed] of [['encodeOpacity', 'opacity', [.2, .8], .5], ['encodeStrokeWidth', 'strokeWidth', [1, 4], 2]]) {
  test(`${method} maps rect rows and replaces fixed/field modes immutably`, () => {
    const p = base(), before = JSON.stringify(p);
    const q = p[method]({ field: 'V', scale: { domain: [1, 3], range } });
    assert.deepEqual(values(q, channel), range);
    const r = q[method]({ value: fixed });
    assert.equal(r.semanticSpec.layers[0].encoding[channel], undefined);
    assert.deepEqual(values(r, channel), [fixed, fixed]);
    const again = r[method]({ field: 'V', scale: { domain: [1, 3], range } });
    assert.deepEqual(values(again, channel), range);
    assert.deepEqual(values(q, channel), range);
    assert.equal(JSON.stringify(p), before);
    assert.throws(() => q.editRectMark({ [channel]: fixed }), /conflicts/);
    assert.equal(q.trace.children.length, p.trace.children.length + 1);
    assert.equal(describeAction(p, { action: method, target: { kind: 'mark', id: 'cells' } }).applicability, 'supported');
    assert.ok(!inspectProgram(q).findings.some(f => f.severity === 'error'));
  });
  test(`${method} rect scale, Canvas, persistence and sampled legend replay`, () => {
    const p = base()[method]({ field: 'V', scale: { domain: [1, 3], range } });
    const q = p[`edit${channel[0].toUpperCase()+channel.slice(1)}Scale`]({ reverse: true }).editCanvas({ width: 760 });
    assert.deepEqual(values(q, channel), [...range].reverse());
    const roundtrip = deserializeProgram(serializeProgram(q));
    assert.deepEqual(roundtrip.graphicSpec, q.graphicSpec);
    assert.match(renderToSVG(roundtrip), /^<svg/);
    const legend = p.createLegend({ channels: [channel], position: 'right', count: 2 });
    assert.ok(legend.graphicSpec.objects[`${channel}LegendSymbols`]);
    const reset = legend[method]({ value: fixed });
    assert.equal(reset.graphicSpec.objects[`${channel}LegendSymbols`], undefined);
    assert.deepEqual(values(reset, channel), [fixed, fixed]);
  });
  test(`${method} rejects invalid rect field values without changing the original`, () => {
    const p = base(), before = JSON.stringify(p);
    assert.throws(() => p[method]({ value: -1 }));
    assert.throws(() => p[method]({ value: Infinity }));
    assert.throws(() => p[method]({ field: 'X' }));
    assert.throws(() => p[method]({ field: 'missing' }));
    assert.equal(JSON.stringify(p), before);
  });
}
test('rect appearance assignments before positions materialize when complete', () => {
  const p = chart().createCanvas().createData({ values: rows }).createRectMark({ id: 'cells' })
    .encodeOpacity({ field: 'V', scale: { domain: [1, 3], range: [.2, .8] } })
    .encodeStrokeWidth({ field: 'V', scale: { domain: [1, 3], range: [1, 4] } })
    .encodeX({ field: 'X', fieldType: 'nominal' }).encodeY({ field: 'Y', fieldType: 'nominal' });
  assert.deepEqual(values(p, 'opacity'), [.2, .8]);
  assert.deepEqual(values(p, 'strokeWidth'), [1, 4]);
});
test('appearance inspection rejects incompatible marks before execution', () => {
  const p = base();
  for (const action of ['encodeSize', 'encodeShape', 'encodeAngle', 'encodeStrokeDash']) {
    assert.equal(describeAction(p, { action, target: { kind: 'mark', id: 'cells' } }).applicability, 'unsupported', action);
  }
});
