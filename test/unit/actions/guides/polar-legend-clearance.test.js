import assert from 'node:assert/strict';
import test from 'node:test';
import { chart } from '../../../../src/index.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';
import { unionConcreteGraphicBounds } from '../../../../src/grammar/schemas/graphicBounds.js';
import { resolveGuideCollisionBlocks } from '../../../../src/materialization/guides/resources.js';
const rows = ['Continuous (Square)', 'Continuous (Wedge)', 'Juxtaposed (Continuous)', 'Juxtaposed (Discrete)'].map((category, i) => ({ category, value: i + 1 }));
function clear(p) {
  const labels = unionConcreteGraphicBounds(p.graphicSpec, ['thetaAxisLabels'], p.materializationConfigs.textMetrics);
  const legends = resolveGuideCollisionBlocks(p.graphicSpec, p.guideConfigs, undefined, p.materializationConfigs.textMetrics).filter(b => b.kind === 'legend' && b.position === 'right');
  assert.ok(legends.length);
  for (const legend of legends) assert.ok(legend.bounds.left >= labels.right + 7.9, JSON.stringify({labels, legend}));
}
test('outside polar legends clear angular labels through font edits, resizing and persistence', () => {
  const p = chart().createCanvas({ plot: { width: 400, height: 400 }, margin: { left: 350, right: 350, top: 140, bottom: 140 } })
    .createData({ values: rows }).createRadialBarPlot({ id: 'plot', category: 'category', value: 'value', guides: { axes: { radius: { ticksAndLabels: { count: 3 } } } } });
  const before = p.graphicSpec;
  clear(p);
  const q = p.editThetaAxisLabels({ fontSize: 18 }); clear(q);
  const r = q.editCanvas({ plot: { width: 420, height: 420 } }); clear(r);
  const restored = deserializeProgram(serializeProgram(r)); clear(restored);
  assert.deepEqual(restored.graphicSpec, r.graphicSpec);
  assert.strictEqual(p.graphicSpec, before);
});
