import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { planTransition } from "../../../src/animation/planner.js";
import { createAnimationPlayer } from "../../../src/animation/createPlayer.js";

function virtualClock() {
  let time = 0, sequence = 0;
  const callbacks = new Map();
  return { now: () => time, requestFrame(callback) { callbacks.set(++sequence, callback); return sequence; },
    cancelFrame(id) { callbacks.delete(id); },
    tick(next) { time = next; const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach(callback => callback()); },
    pending: () => callbacks.size };
}
function endpoints() {
  const from = chart().createCanvas({ width: 300, height: 200 })
    .createData({ id: "rows", keyField: "id", values: [{ id: "a", x: 1, y: 2 }] })
    .createPointMark({ id: "points" }).encodeX({ field: "x", scale: { domain: [0, 10] } }).encodeY({ field: "y", scale: { domain: [0, 10] } });
  const to = from.reviseData({ source: "rows", id: "revised", values: [{ id: "a", x: 9, y: 8 }] });
  return { from, to };
}

test("native player samples the typed plan on one injected clock and commits its exact final frame", async () => {
  const pair = endpoints(), plan = planTransition({ ...pair, options: { durationMs: 1000, easing: "linear" } });
  const clock = virtualClock(), rendered = [], committed = [];
  const player = createAnimationPlayer({ plan, clock, render: frame => rendered.push(frame), commit: frame => committed.push(frame) });
  assert.equal(player.play(), player);
  assert.equal(player.getFrame().graphicSpec, plan.from.graphicSpec);
  clock.tick(250); assert.equal(player.getFrame().progress, .25);
  const frame = player.getFrame(); assert.equal(rendered.at(-1), frame);
  player.pause(); clock.tick(500); assert.equal(player.getFrame(), frame); assert.equal(clock.pending(), 0);
  player.seek(750); assert.equal(player.getFrame().progress, .75);
  player.play(); clock.tick(750);
  assert.equal(player.getState().status, "finished");
  assert.equal(player.getFrame().graphicSpec, plan.to.graphicSpec);
  assert.deepEqual(committed, [player.getFrame()]);
  assert.equal((await player.finished).reason, "completed");
  player.dispose(); assert.equal(clock.pending(), 0); assert.equal(player.getFrame(), undefined);
});

test("native reduced motion commits once without reserving a frame and rejects forged plans", async () => {
  const plan = planTransition({ ...endpoints(), options: { durationMs: 1000 } }), clock = virtualClock();
  const rendered = [], committed = [];
  assert.throws(() => createAnimationPlayer({ plan: structuredClone(plan), clock, render() {} }), /authentic/);
  const player = createAnimationPlayer({ plan, clock, reducedMotion: true, render: frame => rendered.push(frame), commit: frame => committed.push(frame) });
  player.play(); assert.equal(clock.pending(), 0); assert.equal(rendered.length, 1); assert.equal(committed.length, 1);
  assert.equal(player.getFrame().graphicSpec, plan.to.graphicSpec); assert.equal((await player.finished).reason, "completed");
  player.dispose(); player.dispose(); clock.tick(5000); assert.equal(rendered.length, 1);
});
