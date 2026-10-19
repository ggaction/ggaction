import assert from 'node:assert/strict';
import test from 'node:test';
import { chart } from '../../../../src/index.js';
import { renderToSVG } from '../../../../src/renderers/svg.js';

const base = () => chart().createCanvas({ width: 600, height: 400, margin: 80 })
  .createData({ values: [{ x: 0, y: 10 }, { x: 10, y: 20 }] })
  .createScatterPlot({ x: 'x', y: 'y' });

test('editAxes edits both existing axes with one public trace and preserves input and bindings', () => {
  const p = base(), snapshot = JSON.stringify(p);
  const args = { x: { labels: { fontSize: 11 } }, y: { ticksAndLabels: { count: 3, labels: { fontSize: 10 } } } };
  const input = structuredClone(args), q = p.editAxes(args);
  assert.equal(q.trace.children.length, p.trace.children.length + 1);
  assert.equal(q.trace.children.at(-1).op, 'editAxes');
  assert.deepEqual(q.trace.children.at(-1).children.map(n => n.op), ['editXAxis', 'editYAxis']);
  assert.equal(q.guideConfigs.axis.x.labels.fontSize, 11);
  assert.equal(q.guideConfigs.axis.y.labels.fontSize, 10);
  assert.deepEqual(q.semanticSpec.guides.axis, p.semanticSpec.guides.axis);
  assert.equal(JSON.stringify(p), snapshot);
  assert.deepEqual(args, input);
  assert.ok(renderToSVG(q).startsWith('<svg'));
  assert.equal(q.editCanvas({ width: 650 }).guideConfigs.axis.x.labels.fontSize, 11);
});

test('editAxes preserves omitted axes and supports existing component removal', () => {
  const p = base(), q = p.editAxes({ x: false, y: { title: false } });
  assert.deepEqual(q.guideConfigs.axis.x, p.guideConfigs.axis.x);
  assert.equal(q.guideConfigs.axis.y.title, undefined);
});

test('editAxes rejects missing, malformed, empty, duplicate and late failing edits atomically', () => {
  const p = base(), snapshot = JSON.stringify(p);
  for (const args of [{}, { x: false }, { x: {} }, { x: [] }, { x: 1 }, { z: {} },
    { x: [{ labels: { fontSize: 11 } }] },
    { x: [{ target: 'x', labels: { fontSize: 11 } }, { target: 'x', title: false }] },
    { theta: [{}] }, { x: { labels: { fontSize: 11 } }, y: { labels: { fontSize: -1 } } },
    { x: { scale: 'other', labels: { fontSize: 11 } } }, { x: { target: 'missing', title: false } }]) {
    assert.throws(() => p.editAxes(args), JSON.stringify(args));
    assert.equal(JSON.stringify(p), snapshot);
  }
  const noAxes = chart().createCanvas({ width: 600, height: 400 }).createData({ values: [{ x: 1, y: 2 }] })
    .createScatterPlot({ x: 'x', y: 'y', guides: false });
  assert.throws(() => noAxes.editAxes({ x: { labels: { fontSize: 11 } } }));
});

test('editAxes delegates explicit named owners without creating or rebinding axes', () => {
  const p = chart().createCanvas({ width: 600, height: 400, margin: 80 })
    .createData({ values: [{ x: 0, y: 10 }, { x: 10, y: 20 }] })
    .createScatterPlot({ x: 'x', y: 'y', guides: false })
    .createAxes({ x: [{ id: 'lower', position: 'bottom' }, { id: 'upper', position: 'top' }], y: false });
  const q = p.editAxes({ x: [{ target: 'lower', labels: { fontSize: 10 } }, { target: 'upper', labels: { fontSize: 11 } }] });
  assert.equal(q.guideConfigs.axis.lower.labels.fontSize, 10);
  assert.equal(q.guideConfigs.axis.upper.labels.fontSize, 11);
  assert.deepEqual(q.semanticSpec.guides.axis, p.semanticSpec.guides.axis);
  assert.throws(() => p.editAxes({ x: { labels: { fontSize: 11 } } }), /multiple|ambig|target/i);
});

test('editAxes delegates Polar and Parallel axis edits through their existing editors', () => {
  const polar = chart().createCanvas({ width: 500, height: 500, margin: 100 })
    .createData({ values: [{ a: 0, r: 0 }, { a: 10, r: 20 }] }).createPointMark()
    .encodeTheta({ field: 'a' }).encodeR({ field: 'r' }).createAxes();
  const q = polar.editAxes({ theta: { labels: { fontSize: 10 } }, radius: { labels: { fontSize: 11 } } });
  assert.equal(q.guideConfigs.axis.theta.labels.fontSize, 10);
  assert.equal(q.guideConfigs.axis.radius.labels.fontSize, 11);
  const parallel = chart().createCanvas({ width: 600, height: 400, margin: 80 })
    .createData({ values: [{ a: 0, b: 10 }, { a: 10, b: 20 }] })
    .createParallelCoordinates({ dimensions: ['a', 'b'], guides: { legend: false } });
  const next = parallel.editAxes({ parallel: [{ field: 'a', labels: { fontSize: 10 } }, { field: 'b', labels: { fontSize: 11 } }] });
  assert.deepEqual(next.trace.children.at(-1).children.map(n => n.op), ['editParallelAxis', 'editParallelAxis']);
  assert.ok(renderToSVG(next).startsWith('<svg'));
});
