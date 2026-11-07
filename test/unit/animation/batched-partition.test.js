import assert from 'node:assert/strict';
import test from 'node:test';
import { createCanvas } from '@napi-rs/canvas';
import { chart } from '../../../src/index.js';
import { renderTransitionScene } from '../../../src/scene.js';
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from '../../../src/animation.js';
import { animationFrameProvenance } from '../../../src/animation/frameProvenance.js';
import { projectBatchSceneRows } from '../../../src/animation/batchScene.js';
import { animationSceneLength, animationSceneRows } from '../../../src/core/sceneRows.js';
import { prepareAnimationHitFrame } from '../../../src/interaction/hitProgram.js';
import { createHitFrameBridge } from '../../../src/interaction/hitFrame.js';

const options = { durationMs: 100, easing: 'linear' };
const hierarchy = (count = 9) => chart().createCanvas({ width: 500, height: 400 })
  .createData({ id: 'rows', keyField: 'key', values: [{ key: 'root', parent: null, value: 0 }, ...Array.from({ length: count - 1 }, (_, id) => ({ key: id, parent: 'root', value: 1 + id % 3 }))] })
  .createHierarchyData({ id: 'hierarchy', key: 'key', parent: 'parent', value: 'value' }).layoutHierarchy({ id: 'layout', method: 'partition' });
const partition = (cells = { strokeWidth: 0 }) => hierarchy().createPartitionPlot({ id: 'partition', labels: false, cells });
const plan = (from, to, extra = {}) => planTransition({ from, to, options: { ...options, formatVersion: 6, ...extra } });
const rows = frame => projectBatchSceneRows(frame.scene, animationFrameProvenance(frame).positions);
function pixels(frame) {
  const surface = createCanvas(500, 400); renderTransitionScene(frame.scene, surface.getContext('2d'));
  return surface.getContext('2d').getImageData(0, 0, 500, 400).data;
}

test('partition body cells sample as one path run with the exact per-node rows', () => {
  for (const [from, to] of [[partition(), partition().editCanvas({ width: 600 })], [partition({ strokeWidth: 1, stroke: '#ffffff' }), partition({ strokeWidth: 1, stroke: '#ffffff' }).editCanvas({ width: 420, height: 300 })]]) {
    const batch = plan(from, to), legacy = planTransition({ from, to, options });
    for (const time of [25, 50, 75]) {
      const frame = sampleTransition(batch, time), expected = sampleTransition(legacy, time), expanded = rows(frame);
      assert.ok(frame.scene.entries.some(entry => entry.kind === 'path-run'));
      assert.equal(frame.graphicSpec.objects[`animation/node/${frame.scene.entries.findIndex(entry => entry.kind === 'path-run')}`].type, 'path-batch');
      assert.equal(animationSceneLength(frame.scene), expected.scene.nodes.length);
      assert.deepEqual(expanded.scene, expected.scene); assert.deepEqual(expanded.decisions, expected.decisions);
      assert.deepEqual(animationFrameProvenance(frame).partitions, animationFrameProvenance(expected).partitions);
      assert.deepEqual(animationFrameProvenance(frame).native, animationFrameProvenance(expected).native);
      assert.deepEqual(pixels(frame), pixels(expected));
    }
  }
});

test('partition path runs survive offline storage and rebase from an interior frame', () => {
  const from = partition(), to = from.editCanvas({ width: 600 }), initial = plan(from, to);
  const stored = serializeAnimation(initial), offline = deserializeAnimation(stored).plan;
  assert.equal(serializeAnimation(offline), stored);
  assert.deepEqual(rows(sampleTransition(offline, 50)).scene, rows(sampleTransition(initial, 50)).scene);
  const start = sampleTransition(initial, 37), rebased = plan(start, to);
  assert.equal(sampleTransition(rebased, 0), start);
  const wire = serializeAnimation(rebased), restored = deserializeAnimation(wire).plan;
  assert.equal(serializeAnimation(restored), wire);
  for (const time of [0, 50, 100]) assert.deepEqual(rows(sampleTransition(restored, time)).scene, rows(sampleTransition(rebased, time)).scene);
  const legacyStart = sampleTransition(planTransition({ from, to, options }), 37), legacy = planTransition({ from: legacyStart, to, options });
  assert.deepEqual(rows(sampleTransition(rebased, 50)).scene, sampleTransition(legacy, 50).scene);
});

test('partition frames keep the per-node fallback when a cell is hidden or labels are shown', () => {
  const labelled = hierarchy().createPartitionPlot({ id: 'partition', labels: {}, cells: { strokeWidth: 0 } });
  const frame = sampleTransition(plan(labelled, labelled.editCanvas({ width: 600 })), 50);
  assert.equal(frame.scene.entries.some(entry => entry.kind === 'path-run'), false);
  const from = partition(), to = from.editCanvas({ width: 600 }), legacy = planTransition({ from, to, options });
  assert.equal(sampleTransition(planTransition({ from, to, options: { ...options, formatVersion: 5 } }), 50).scene.version, 2);
  assert.deepEqual(rows(sampleTransition(plan(from, to), 0)).scene, sampleTransition(legacy, 0).scene);
});

test('partition path-run frames retain every native hit identity', () => {
  const from = partition(), to = from.editCanvas({ width: 600 }), batch = plan(from, to), legacy = planTransition({ from, to, options });
  for (const time of [25, 50]) {
    const sample = sampleTransition(batch, time), a = prepareAnimationHitFrame(sampleTransition(legacy, time), 4), b = prepareAnimationHitFrame(sample, 4);
    assert.deepEqual(b.entries, a.entries);
    const old = createHitFrameBridge(a), current = createHitFrameBridge(b);
    for (const { node } of animationSceneRows(sample.scene)) {
      if (node.type !== 'path') continue;
      const [first, third] = [node.properties.commands[0], node.properties.commands[2]];
      const point = { x: node.offset[0] + (first.x + third.x) / 2, y: node.offset[1] + (first.y + third.y) / 2 };
      assert.deepEqual(current.hit(point), old.hit(point));
    }
    current.dispose(); old.dispose();
  }
});
