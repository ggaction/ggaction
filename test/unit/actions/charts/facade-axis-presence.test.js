import assert from 'node:assert/strict';
import test from 'node:test';
import { chart } from '../../../../src/index.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';

for (const method of ['createDotPlot', 'createLollipopPlot', 'createDumbbellPlot', 'createECDFPlot']) {
  test(`${method} role edits preserve axes removed after construction`, () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ group: i % 2 ? 'A' : 'B', category: `C${i % 4}`, value: i + 1, end: i + 3 }));
    const endpoint = method !== 'createECDFPlot';
    const start = chart().createCanvas({ plot: { width: 314, height: 314 }, margin: 100 })
      .createData({ id: 'd', values: rows })[method]({ id: 'p', data: 'd', guides: { axes: {} },
        ...(endpoint ? { category: 'group', summary: 'mean', ...(method === 'createDumbbellPlot' ? { start: 'value', end: 'end' } : { value: 'value' }) } : { field: 'value' }) });
    const edited = endpoint ? { category: 'category' } : { field: 'end' };
    for (const axis of ['x', 'y']) {
      const raw = start[`remove${axis.toUpperCase()}Axis`]({});
      const before = serializeProgram(raw);
      const next = raw[endpoint ? 'editEndpointPlot' : 'editECDFPlot']({ target: 'p', ...edited });
      assert.equal(next.semanticSpec.guides.axis[axis], undefined);
      assert.ok(next.semanticSpec.guides.axis[axis === 'x' ? 'y' : 'x']);
      assert.deepEqual(serializeProgram(raw), before);
      assert.deepEqual(deserializeProgram(serializeProgram(next)).graphicSpec, next.graphicSpec);
      const layer = next.semanticSpec.layers.find(layer => layer.id === 'p');
      assert.ok(next[`create${axis.toUpperCase()}Axis`]({ scale: layer.encoding[axis].scale, coordinate: layer.coordinate }));
    }
  });
}
