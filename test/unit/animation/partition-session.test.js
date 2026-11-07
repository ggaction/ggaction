import test from 'node:test';
import assert from 'node:assert/strict';
import { planTransition, sampleTransition, createAnimationPlayer } from '../../../src/animation.js';
import { createInteractionSession } from '../../../src/interaction.js';
import { getMarkItems } from '../../../src/inspection.js';
import { serializeProgram } from '../../../src/persistence.js';
import { resolveStoredSelection } from '../../../src/materialization/selection/state.js';
import { partitionFrameEndpoints } from '../../support/partition-frames.js';

const target = 'partitionPlot';
const options = { durationMs: 100, easing: 'linear' };
function endpoints() {
  const { before, after } = partitionFrameEndpoints({ labels: false, padding: [2, 4] });
  const key = getMarkItems(before, { target }).find(item => item.fields.key === 'A').key;
  const selected = program => program.selectMarks({ id: 'picked', target, items: [key], empty: 'none' });
  const from = selected(before), to = selected(after);
  return { from, to, key, plan: planTransition({ from, to, options }) };
}
const binding = activation => ({ type: 'keyboard', targets: [{ target, activation }] });
const publish = (session, frame) => session.dispatch({ type: 'frame', frame,
  version: session.getState().frameVersion + 1, generation: session.getState().generation });

test('partition bend frames preserve the selected node, current path focus, native activation and history', () => {
  const { from, key, plan } = endpoints(), saved = serializeProgram(from);
  const session = createInteractionSession({ program: from, bindings: [binding({ type: 'select', selection: 'picked', mode: 'toggle' })] });
  try {
    session.dispatch({ type: 'focus', target, itemKey: key });
    for (const time of [25, 50, 75]) {
      const frame = sampleTransition(plan, time);
      assert.equal(publish(session, frame).status, 'applied');
      const state = session.getState();
      assert.equal(state.animationFrame, frame);
      assert.equal(state.focus.itemKey, key);
      session.dispatch({ type: 'inspect', point: state.focus.screenPoint, slop: 0 });
      assert.ok(session.getState().hit.candidates.some(candidate => candidate.itemKey === key));
      assert.deepEqual(resolveStoredSelection(state.program, 'picked').keys, [key]);
      assert.equal(state.program, from); assert.equal(state.history.undoCount, 0);
    }
    session.dispatch({ type: 'activate' });
    assert.deepEqual(resolveStoredSelection(session.getState().program, 'picked').keys, []);
    assert.equal(session.getState().history.undoCount, 1);
    assert.equal(session.getState().animationFrame, null);
    session.dispatch({ type: 'undo' });
    assert.deepEqual(resolveStoredSelection(session.getState().program, 'picked').keys, [key]);
    session.dispatch({ type: 'redo' });
    assert.deepEqual(resolveStoredSelection(session.getState().program, 'picked').keys, []);
    assert.equal(serializeProgram(from), saved);
  } finally { session.destroy(); }
});

test('hierarchy focus activation during a bend uses the same native node and preserves its selection', () => {
  const { from, key, plan } = endpoints();
  const session = createInteractionSession({ program: from, bindings: [binding({ type: 'focusHierarchy' })] });
  try {
    publish(session, sampleTransition(plan, 50));
    session.dispatch({ type: 'focus', target, itemKey: key });
    session.dispatch({ type: 'activate' });
    assert.deepEqual(session.getState().program.graphicSpec, from.editPartitionPlot({ target, focus: { key: 'A' } }).graphicSpec);
    assert.equal(session.getState().focus.itemKey, key);
    assert.deepEqual(resolveStoredSelection(session.getState().program, 'picked').keys, [key]);
    assert.equal(session.getState().animationFrame, null);
    session.dispatch({ type: 'undo' });
    assert.deepEqual(session.getState().program.graphicSpec, from.graphicSpec);
  } finally { session.destroy(); }
});

test('reduced motion publishes the exact native sunburst once through the accepted-frame boundary', async () => {
  const { from, to, key, plan } = endpoints();
  const session = createInteractionSession({ program: from, bindings: [binding({ type: 'select', selection: 'picked' })] });
  let rendered = 0, committed = 0;
  const player = createAnimationPlayer({ plan, reducedMotion: true,
    clock: { now: () => 0, requestFrame() { throw Error('Reduced motion scheduled a frame'); }, cancelFrame() {} },
    render(frame) { rendered++; publish(session, frame); }, commit() { committed++; } });
  try {
    session.dispatch({ type: 'focus', target, itemKey: key });
    player.play();
    assert.equal((await player.finished).reason, 'completed');
    assert.equal(player.getFrame().graphicSpec, to.graphicSpec);
    assert.equal(session.getState().animationFrame, player.getFrame());
    assert.equal(session.getState().focus.itemKey, key);
    assert.equal(rendered, 1); assert.equal(committed, 1);
    assert.equal(session.getState().program, from);
    assert.equal(session.getState().history.undoCount, 0);
  } finally { player.dispose(); session.destroy(); }
});
