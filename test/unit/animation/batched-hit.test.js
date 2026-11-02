import test from 'node:test';
import assert from 'node:assert/strict';
import { chart } from '../../../src/index.js';
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from '../../../src/animation.js';
import { animationSceneRows } from '../../../src/core/sceneRows.js';
import { prepareAnimationHitFrame, rebindProgramHitFrame } from '../../../src/interaction/hitProgram.js';
import { createHitFrameBridge } from '../../../src/interaction/hitFrame.js';
import { createInteractionSession } from '../../../src/interaction.js';

function pointProgram() {
  return chart().createCanvas({ width: 300, height: 200, margin: 20 })
    .createData({ id: 'data', keyField: 'id', values: [{ id: 'a', x: 2, y: 2 }, { id: 'b', x: 8, y: 8 }] })
    .createPointMark({ id: 'points' }).encodeX({ field: 'x', scale: { id: 'x', domain: [0, 10], nice: false } })
    .encodeY({ field: 'y', scale: { domain: [0, 10], nice: false } });
}
function plans() {
  const from = pointProgram();
  const to = from.editScale({ id: 'x', domain: [0, 20], nice: false });
  return [undefined, 6].map(formatVersion => planTransition({ from, to, options: { durationMs: 100, easing: 'linear', ...(formatVersion ? { formatVersion } : {}) } }));
}
test('batch frames retain every native hit identity and stale-frame/nearest lifecycle', () => {
  const [legacy, batch] = plans();
  for (const t of [0, 25, 50, 100]) {
    const a = prepareAnimationHitFrame(sampleTransition(legacy, t), 4), sample = sampleTransition(batch, t), b = prepareAnimationHitFrame(sample, 4);
    assert.deepEqual(b.entries, a.entries);
    const old = createHitFrameBridge(a), current = createHitFrameBridge(b);
    for (const { node } of animationSceneRows(sample.scene)) {
      if (node.type !== 'circle') continue;
      const point = { x: node.offset[0] + node.properties.x, y: node.offset[1] + node.properties.y };
      assert.deepEqual(current.hit(point), old.hit(point));
      const nearest = { ownerId: "points", childPath: [], itemKeys: b.entries.map(entry => entry.metadata.itemKey), maxDistance: 100 };
      assert.deepEqual(current.nearest(point, nearest), old.nearest(point, nearest));
    }
    assert.deepEqual(rebindProgramHitFrame(b, sample.scene, 5).entries, b.entries);
    assert.equal(current.updateFrame(b).applied, false);
    assert.equal(current.dispose(), true); assert.equal(current.dispose(), false); old.dispose();
    assert.throws(() => prepareAnimationHitFrame(structuredClone(sample)), /authentic/);
    assert.throws(() => createHitFrameBridge(b, { maxSceneNodes: 1 }), /budget|nodes|preparation/);
  }
  const offline = deserializeAnimation(serializeAnimation(batch)).plan;
  assert.throws(() => prepareAnimationHitFrame(sampleTransition(offline, 50)), /native endpoint/);
});

test('public sessions accept batch frames and preserve inspection, stale rejection and disposal', () => {
  const from = pointProgram(), to = from.editScale({ id: 'x', domain: [0, 20], nice: false });
  const plan = planTransition({ from, to, options: { durationMs: 100, easing: 'linear', formatVersion: 6 } });
  const session = createInteractionSession({ program: from }), generation = session.getState().generation;
  const frame = sampleTransition(plan, 50);
  assert.equal(session.dispatch({ type: 'frame', frame, version: 1, generation }).status, 'applied');
  assert.equal(session.getState().scene.version, 3);
  assert.equal(session.getState().animationFrame, frame);
  const hitFrame = prepareAnimationHitFrame(frame, 1), node = [...animationSceneRows(frame.scene)].find(row => row.node.type === 'circle').node;
  const point = { x: node.offset[0] + node.properties.x, y: node.offset[1] + node.properties.y };
  session.dispatch({ type: 'inspect', point });
  assert.equal(session.getState().hit.target.itemKey, hitFrame.entries[0].metadata.itemKey);
  const state = session.getState();
  assert.equal(session.dispatch({ type: 'frame', frame, version: 0, generation }).status, 'stale');
  assert.equal(session.getState(), state);
  assert.throws(() => session.dispatch({ type: 'frame', frame: structuredClone(frame), version: 2, generation }), /authentic/);
  assert.equal(session.getState(), state);
  assert.equal(session.destroy(), true); assert.equal(session.destroy(), false);
  assert.equal(session.getState().destroyed, true);
});
