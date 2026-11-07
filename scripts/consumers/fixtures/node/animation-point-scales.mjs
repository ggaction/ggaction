import assert from 'node:assert/strict';
import { chart } from 'ggaction';
import { chart as basicChart } from 'ggaction/basic';
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation, exportAnimationFrames } from 'ggaction/animation';

const rows = [{ id: 'a', x: .2, y: .1 }, { id: 'b', x: .4, y: .3 }, { id: 'c', x: .6, y: .5 }, { id: 'd', x: .8, y: .7 }];
const points = factory => factory().createCanvas({ width: 400, height: 400, margin: 20, plotBorder: false })
  .createData({ id: 'rows', keyField: 'id', values: rows }).createPointMark({ id: 'points' })
  .encodeX({ field: 'x', scale: { id: 'x', domain: [0, 1], nice: false } })
  .encodeY({ field: 'y', scale: { id: 'y', domain: [0, 1], nice: false } });
const options = explicit => ({ durationMs: 100, easing: 'linear', ...(explicit ? { maxEndpointNodes: 20, maxOutputNodes: 10 } : {}) });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10);

export const cases = [
  { id: 'animation-point-scales/native-default-and-explicit-meaning', run() {
    for (const factory of [chart, basicChart]) for (const explicit of [false, true]) {
      const from = points(factory), to = from.encodeX({ field: 'x', scale: { id: 'x', domain: [0, 2], nice: false } });
      const plan = planTransition({ from, to, options: options(explicit) }), saved = serializeAnimation(plan);
      assert.equal(sampleTransition(plan, 0).graphicSpec, from.graphicSpec);
      assert.equal(sampleTransition(plan, 100).graphicSpec, to.graphicSpec);
      for (const time of [25, 37, 50, 75, 25]) {
        const frame = sampleTransition(plan, time), circles = frame.scene.nodes.filter(node => node.type === 'circle');
        assert.equal(circles.length, rows.length);
        assert.equal(frame.decisions.filter(decision => decision.kernel === 'cartesian-point').length, rows.length);
        for (let i = 0; i < rows.length; i++) {
          close(circles[i].properties.x, 20 + 360 * rows[i].x / (1 + time / 100));
          close(circles[i].properties.y, 380 - 360 * rows[i].y);
          assert.ok(Object.isFrozen(circles[i].properties));
        }
        assert.throws(() => planTransition({ from: Object.freeze({ ...frame }), to, options: options(explicit) }));
      }
      assert.equal(serializeAnimation(plan), saved);
    }
  } },
  { id: 'animation-point-scales/sampled-rebase-offline-replay', run() {
    for (const factory of [chart, basicChart]) for (const explicit of [false, true]) {
      const from = points(factory), to = from.encodeX({ field: 'x', scale: { id: 'x', domain: [0, 2], nice: false } });
      const first = planTransition({ from, to, options: options(explicit) }), frame = sampleTransition(first, 37);
      const rebased = planTransition({ from: frame, to, options: options(explicit) });
      assert.equal(sampleTransition(rebased, 0), frame);
      const saved = serializeAnimation(rebased), restored = deserializeAnimation(saved);
      assert.equal(serializeAnimation(restored.plan, restored.playback), saved);
      const timesMs = [0, 25, 50, 75, 100];
      assert.deepEqual(exportAnimationFrames(restored.plan, { timesMs }), exportAnimationFrames(rebased, { timesMs }));
      const circles = sampleTransition(restored.plan, 50).scene.nodes.filter(node => node.type === 'circle');
      for (let i = 0; i < rows.length; i++) {
        close(circles[i].properties.x, 20 + 360 * rows[i].x / 1.685);
        close(circles[i].properties.y, 380 - 360 * rows[i].y);
      }
    }
  } }
];
