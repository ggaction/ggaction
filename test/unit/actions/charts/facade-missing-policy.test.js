import assert from 'node:assert/strict';
import test from 'node:test';
import { chart } from '../../../../src/index.js';

test('scatter and bar facades forward native missing policy while retaining source rows', () => {
  const rows = [{ x: 1, y: 2, category: 'A' }, { x: null, y: null, category: 'B' }, { x: 3, y: 4, category: 'C' }];
  const p = chart().createCanvas({ width: 500, height: 350, margin: 70 }).createData({ id: 'data', values: rows });
  for (const [method, args] of [['createScatterPlot', { x: 'x', y: 'y' }], ['createBarPlot', { x: 'category', y: 'y' }]]) {
    assert.throws(() => p[method]({ ...args, missing: 'error' }));
    const q = p[method]({ ...args, missing: 'skip' });
    assert.deepEqual(q.semanticSpec.datasets[0].values, rows);
    assert.equal(q.trace.children.length, p.trace.children.length + 1);
    assert.equal(q.trace.children.at(-1).op, method);
    assert.throws(() => p[method]({ ...args, missing: 'invented' }));
  }
});
