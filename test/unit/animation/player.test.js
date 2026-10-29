import assert from "node:assert/strict";
import test from "node:test";
import { createPlaybackController } from "../../../src/animation/player.js";

function virtualClock() {
  let time = 0, sequence = 0;
  const pending = new Map(), cancelled = [];
  return {
    api: { now: () => time, requestFrame(callback) { pending.set(++sequence, callback); return sequence; },
      cancelFrame(id) { cancelled.push(pending.get(id)); pending.delete(id); } },
    elapse(ms, draw = true) { time += ms; if (draw) this.draw(); },
    draw() { const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(callback => callback(time)); },
    pending, cancelled,
    setTime(value) { time = value; }
  };
}
function fixture(options = {}) {
  const clock = virtualClock(), rendered = [], committed = [];
  const player = createPlaybackController({ durationMs: 1000, clock: clock.api,
    sample: time => Object.freeze({ x: 10 + time / 50 }), render: frame => rendered.push(frame),
    commit: frame => committed.push(frame), ...options });
  return { player, clock, rendered, committed };
}

test("playback uses only the injected clock and preserves the current time across pause, seek and rate changes", async () => {
  const { player, clock, rendered, committed } = fixture();
  assert.equal(player.getState().status, "idle");
  assert.equal(player.getFrame(), undefined);
  player.play().play();
  assert.equal(clock.pending.size, 1);
  clock.elapse(250, false); player.pause();
  assert.deepEqual(player.getFrame(), { x: 15 });
  assert.equal(clock.pending.size, 0);
  assert.equal(player.getState().status, "paused");
  player.seek(500); assert.deepEqual(player.getFrame(), { x: 20 });
  clock.elapse(1000); assert.deepEqual(player.getFrame(), { x: 20 });
  player.play(); clock.elapse(100); assert.deepEqual(player.getFrame(), { x: 22 });
  player.setRate(2); clock.elapse(100); assert.deepEqual(player.getFrame(), { x: 26 });
  player.reverse(); clock.elapse(100); assert.deepEqual(player.getFrame(), { x: 22 });
  player.setRate(0); assert.equal(player.getState().status, "paused");
  assert.equal(clock.pending.size, 0);
  player.setRate(1).play(); clock.elapse(400);
  assert.deepEqual(await player.finished, { reason: "completed", timeMs: 1000, iteration: 0 });
  assert.equal(committed.length, 1);
  assert.equal(rendered.at(-1), committed[0]);
  assert.equal(clock.pending.size, 0);
});

test("each completed or cancelled run has its own exactly-once terminal promise", async () => {
  const { player, clock, committed } = fixture();
  const first = player.finished; let endings = 0; first.then(() => endings++);
  player.play(); clock.elapse(1000); clock.elapse(1000);
  assert.equal((await first).reason, "completed");
  assert.equal(endings, 1); assert.equal(committed.length, 1);
  player.play(); const second = player.finished; assert.notEqual(first, second);
  clock.elapse(100, false); player.cancel().cancel();
  assert.deepEqual(await second, { reason: "cancelled", timeMs: 100, iteration: 0 });
  assert.equal(committed.length, 1);
  player.seek(500).play(); clock.elapse(500);
  assert.equal((await player.finished).reason, "completed");
  assert.equal(committed.length, 2);
});

test("repeat, reverse and infinite runtime playback retain exact boundaries without scheduling extra frames", async () => {
  const { player, clock, committed } = fixture({ durationMs: 10, repeat: 2 });
  player.play(); clock.elapse(10);
  assert.deepEqual([player.getState().timeMs, player.getState().iteration], [10, 0]);
  clock.elapse(1); assert.deepEqual([player.getState().timeMs, player.getState().iteration], [1, 1]);
  player.setRepeat(3); clock.elapse(29);
  assert.deepEqual(await player.finished, { reason: "completed", timeMs: 10, iteration: 3 });
  assert.equal(committed.length, 1);
  const reversed = fixture({ durationMs: 10, repeat: Infinity, rate: -1 });
  reversed.player.play(); reversed.clock.elapse(25);
  assert.deepEqual([reversed.player.getState().timeMs, reversed.player.getState().iteration], [5, 2]);
  reversed.player.setRepeat(2); reversed.clock.elapse(5);
  assert.deepEqual(await reversed.player.finished, { reason: "completed", timeMs: 0, iteration: 2 });
});

test("interrupt captures the actual in-between frame and never returns to an earlier endpoint", async () => {
  const { player, clock, rendered, committed } = fixture();
  player.play(); clock.elapse(250, false);
  const first = player.finished; let captured;
  player.interrupt({ durationMs: 500, createSample(frame) {
    captured = frame;
    return time => time === 0 ? frame : Object.freeze({ x: frame.x + (50 - frame.x) * time / 500 });
  } });
  assert.deepEqual(captured, { x: 15 });
  assert.equal(player.getFrame(), captured);
  assert.equal(rendered.at(-1), captured);
  assert.deepEqual(await first, { reason: "interrupted", timeMs: 250, iteration: 0 });
  clock.elapse(250); assert.deepEqual(player.getFrame(), { x: 32.5 });
  clock.elapse(250); assert.deepEqual(player.getFrame(), { x: 50 });
  assert.equal((await player.finished).reason, "completed");
  assert.equal(committed.length, 1);
});

test("paused and reversed interruptions retain the captured scene and stay paused until play", async () => {
  const { player, clock } = fixture();
  player.seek(400); const original = player.finished;
  player.interrupt({ durationMs: 20, rate: -1, createSample(frame, initialTime) {
    assert.equal(initialTime, 20);
    return time => time === 20 ? frame : Object.freeze({ x: 100 - time });
  } });
  assert.deepEqual(await original, { reason: "interrupted", timeMs: 400, iteration: 0 });
  assert.deepEqual(player.getFrame(), { x: 18 });
  assert.equal(player.getState().status, "paused");
  assert.equal(clock.pending.size, 0);
  player.play(); clock.elapse(20);
  assert.deepEqual(player.getFrame(), { x: 100 });
  assert.equal((await player.finished).reason, "completed");
});

test("zero duration and reduced motion render and commit the final scene once with no RAF", async () => {
  for (const options of [{ durationMs: 0 }, { reducedMotion: true }, { reducedMotion: true, repeat: Infinity },
    { reducedMotion: true, rate: -1, repeat: 3 }]) {
    const { player, clock, rendered, committed } = fixture(options);
    player.play(); assert.equal((await player.finished).reason, "completed");
    assert.equal(rendered.length, 1); assert.equal(committed.length, 1);
    assert.equal(clock.pending.size, 0);
    assert.deepEqual(rendered[0], { x: options.rate === -1 || options.durationMs === 0 ? 10 : 30 });
  }
  const zeroRate = fixture({ rate: 0, reducedMotion: true });
  zeroRate.player.play(); assert.equal(zeroRate.player.getState().status, "paused");
  assert.equal(zeroRate.committed.length, 0); zeroRate.player.reverse().play(); zeroRate.clock.elapse(1000);
  assert.equal((await zeroRate.player.finished).reason, "completed");
});

test("dispose immediately cancels pending frames and stale callbacks cannot render or commit", async () => {
  const { player, clock, rendered, committed } = fixture();
  player.play(); const terminal = player.finished;
  player.dispose(); player.dispose();
  assert.equal((await terminal).reason, "disposed");
  assert.equal(clock.pending.size, 0);
  clock.cancelled.forEach(callback => callback?.()); clock.elapse(5000);
  assert.equal(rendered.length, 1); assert.equal(committed.length, 0);
  for (const control of [() => player.play(), () => player.pause(), () => player.seek(1), () => player.reverse(),
    () => player.setRate(1), () => player.setRepeat(0), () => player.cancel(), () => player.interrupt({})]) {
    assert.throws(control, /disposed/);
  }
  assert.ok(Object.isFrozen(player.getState())); assert.ok(Object.isFrozen(player));
});

test("dispose inside the final render prevents a later commit and completion callback", async () => {
  const clock = virtualClock(); let player, renders = 0, commits = 0;
  player = createPlaybackController({ durationMs: 1, clock: clock.api, sample: time => ({ time }),
    render(frame) { renders++; if (frame.time === 1) player.dispose(); }, commit() { commits++; } });
  player.play(); clock.elapse(1);
  assert.equal((await player.finished).reason, "disposed");
  assert.equal(renders, 2); assert.equal(commits, 0); assert.equal(clock.pending.size, 0);
});

test("render controls are FIFO and do not recurse into the current callback", async () => {
  const clock = virtualClock(), seen = []; let player, active = false;
  player = createPlaybackController({ durationMs: 10, clock: clock.api, sample: time => time,
    render(time) { assert.equal(active, false); active = true; seen.push(time);
      if (time === 0) player.seek(2).pause(); active = false; } });
  player.play(); assert.deepEqual(seen, [0, 2]); assert.equal(clock.pending.size, 0);
  player.cancel(); assert.equal((await player.finished).reason, "cancelled");
});

test("callback failures and malicious synchronous clocks leave no scheduled work or pending terminal", async () => {
  for (const type of ["sample", "render", "commit"]) {
    const fail = () => { throw new Error(type); };
    const { player, clock } = fixture({ [type]: fail });
    const terminal = player.finished;
    if (type === "commit") { player.play(); assert.throws(() => clock.elapse(1000), /commit/); }
    else assert.throws(() => player.play(), new RegExp(type));
    assert.equal((await terminal).reason, "cancelled");
    assert.equal(clock.pending.size, 0);
  }
  const player = createPlaybackController({ durationMs: 10, sample: time => time, render() {},
    clock: { now: () => 0, requestFrame(callback) { callback(); }, cancelFrame() {} } });
  assert.throws(() => player.play(), /asynchronous/);
  assert.equal((await player.finished).reason, "cancelled");
});

test("closed options and invalid controls reject without invoking executable properties", () => {
  for (const options of [{ durationMs: -1 }, { rate: Infinity }, { repeat: -1 }, { reducedMotion: 1 },
    { sample: null }, { render: 1 }, { commit: true }, { extra: 1 }, { clock: {} }, { clock: null }]) {
    assert.throws(() => fixture(options));
  }
  let calls = 0;
  const input = { get clock() { calls++; return {}; } };
  assert.throws(() => createPlaybackController(input), /accessors/); assert.equal(calls, 0);
  const { player, clock } = fixture(); player.play();
  const saved = player.getState();
  for (const operation of [() => player.seek(NaN), () => player.setRate(Infinity), () => player.setRepeat(-1),
    () => player.interrupt({ durationMs: 10, createSample: null }),
    () => player.interrupt({ durationMs: 10, createSample() {}, reducedMotion: 1 }),
    () => player.interrupt({ durationMs: 10, extra: 1 })]) assert.throws(operation);
  assert.deepEqual(player.getState(), saved); assert.equal(clock.pending.size, 1);
  player.dispose();
});

test("clock rollback and non-finite time cancel safely, while seek clamps explicit endpoints", async () => {
  for (const value of [-1, NaN, Infinity, 49]) {
    const { player, clock } = fixture(); player.play(); clock.elapse(50);
    clock.setTime(value); assert.throws(() => player.pause(), /monotonic/);
    assert.equal((await player.finished).reason, "cancelled"); assert.equal(clock.pending.size, 0);
  }
  const { player } = fixture();
  player.seek(-100); assert.deepEqual(player.getFrame(), { x: 10 });
  player.seek(5000); assert.deepEqual(player.getFrame(), { x: 30 }); player.dispose();
});

test("a callback cannot create unbounded controls or hide a queue overflow", async () => {
  const clock = virtualClock(); let player;
  player = createPlaybackController({ durationMs: 1000, clock: clock.api, sample: time => time,
    render() { for (let index = 0; index < 257; index++) player.pause(); } });
  assert.throws(() => player.play(), /queue exceeds/);
  assert.equal((await player.finished).reason, "cancelled"); assert.equal(clock.pending.size, 0);
  let looping;
  looping = createPlaybackController({ durationMs: 1000, clock: clock.api, sample: time => time,
    render() { looping.seek(0); } });
  assert.throws(() => looping.play(), /queue exceeds/);
  assert.equal((await looping.finished).reason, "cancelled");
});

test("rejected interruption and repeat changes preserve the active run and its scheduled frame", async () => {
  const { player, clock } = fixture({ durationMs: 10, repeat: 4 });
  player.play(); clock.elapse(25);
  const state = player.getState(), frame = player.getFrame(), terminal = player.finished;
  assert.throws(() => player.setRepeat(1), /current iteration/);
  assert.throws(() => player.interrupt({ durationMs: 5, createSample: () => () => ({ x: 0 }) }), /captured/);
  assert.throws(() => player.interrupt({ durationMs: 5, createSample: () => null }), /function/);
  assert.deepEqual(player.getState(), state); assert.equal(player.getFrame(), frame);
  assert.equal(player.finished, terminal); assert.equal(clock.pending.size, 1);
  player.dispose(); assert.equal(player.getFrame(), undefined);
  assert.equal((await terminal).reason, "disposed");
});

test("interruption queued inside rendering uses the current frame without recursive callbacks", async () => {
  const clock = virtualClock(); let player, replaced = false, first;
  player = createPlaybackController({ durationMs: 10, clock: clock.api, sample: time => ({ x: time }),
    render(frame) {
      if (!replaced && frame.x === 5) {
        replaced = true; first = player.finished;
        player.interrupt({ durationMs: 5, createSample: current => time => time === 0 ? current : ({ x: current.x + time }) });
      }
    } });
  player.play(); clock.elapse(5);
  assert.equal((await first).reason, "interrupted");
  assert.deepEqual(player.getFrame(), { x: 5 }); assert.equal(clock.pending.size, 1);
  clock.elapse(5); assert.equal((await player.finished).reason, "completed");
});

test("cancelled frame callbacks remain invalid after a new run is scheduled", async () => {
  const { player, clock, rendered } = fixture();
  player.play().pause(); const stale = clock.cancelled.at(-1);
  player.play(); const length = rendered.length;
  stale(); assert.equal(rendered.length, length); assert.equal(clock.pending.size, 1);
  player.cancel(); assert.equal((await player.finished).reason, "cancelled");
});

test("a queued rejected interruption preserves the previous run and its next clock callback", async () => {
  const clock = virtualClock(); let player, rejected = false;
  player = createPlaybackController({ durationMs: 10, clock: clock.api, sample: time => ({ x: time }),
    render(frame) {
      if (frame.x === 5 && !rejected) {
        rejected = true;
        player.interrupt({ durationMs: 5, createSample() { throw new Error("invalid replacement"); } });
      }
    } });
  player.play(); const terminal = player.finished;
  assert.throws(() => clock.elapse(5), /invalid replacement/);
  assert.equal(player.getState().status, "playing"); assert.deepEqual(player.getFrame(), { x: 5 });
  assert.equal(player.finished, terminal); assert.equal(clock.pending.size, 1);
  clock.elapse(5); assert.equal((await terminal).reason, "completed"); player.dispose();
});

test("an ordinary callback throwing a non-object value still cancels its run", async () => {
  const { player, clock } = fixture({ render() { throw undefined; } });
  assert.throws(() => player.play());
  assert.equal(player.getState().status, "cancelled"); assert.equal(clock.pending.size, 0);
  assert.equal((await player.finished).reason, "cancelled"); player.dispose();
});
