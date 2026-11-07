import assert from "node:assert/strict";
import test from "node:test";
import { advancePlayback, ANIMATION_TIMING_VERSION } from "../../../src/grammar/animation/timing.js";

const advance = (changes = {}) => advancePlayback({ timeMs: 0, durationMs: 1000, elapsedMs: 0, rate: 1, iteration: 0, repeat: 0, ...changes });

test("injected clock arithmetic follows literal elapsed time and rate changes", () => {
  assert.equal(ANIMATION_TIMING_VERSION, "bounded-playback-clock@1");
  assert.deepEqual(advance({ elapsedMs: 250 }), { timeMs: 250, iteration: 0, finished: false });
  assert.deepEqual(advance({ timeMs: 100, elapsedMs: 500, rate: .5 }), { timeMs: 350, iteration: 0, finished: false });
  assert.deepEqual(advance({ timeMs: 100, elapsedMs: 400, rate: 2 }), { timeMs: 900, iteration: 0, finished: false });
  assert.deepEqual(advance({ elapsedMs: 2000 }), { timeMs: 1000, iteration: 0, finished: true });
  assert.deepEqual(advance({ timeMs: 300, elapsedMs: 2000, rate: 0 }), { timeMs: 300, iteration: 0, finished: false });
});

test("exact repeat boundaries retain endpoints and large clock jumps do not run an iteration loop", () => {
  assert.deepEqual(advance({ timeMs: 750, elapsedMs: 250, repeat: 1 }), { timeMs: 1000, iteration: 0, finished: false });
  assert.deepEqual(advance({ timeMs: 750, elapsedMs: 251, repeat: 1 }), { timeMs: 1, iteration: 1, finished: false });
  assert.deepEqual(advance({ timeMs: 750, elapsedMs: 1250, repeat: 1 }), { timeMs: 1000, iteration: 1, finished: true });
  assert.deepEqual(advance({ durationMs: 1, elapsedMs: 1e12, repeat: 3 }), { timeMs: 1, iteration: 3, finished: true });
  assert.deepEqual(advance({ durationMs: 2, elapsedMs: 5, repeat: Infinity }), { timeMs: 1, iteration: 2, finished: false });
  assert.deepEqual(advance({ timeMs: 1000, elapsedMs: 0, repeat: 2, iteration: 1 }), { timeMs: 1000, iteration: 1, finished: false });
});

test("negative rates reverse from the current time and preserve the opposite endpoint", () => {
  assert.deepEqual(advance({ timeMs: 750, elapsedMs: 250, rate: -1 }), { timeMs: 500, iteration: 0, finished: false });
  assert.deepEqual(advance({ timeMs: 250, elapsedMs: 500, rate: -1, repeat: 1 }), { timeMs: 750, iteration: 1, finished: false });
  assert.deepEqual(advance({ timeMs: 250, elapsedMs: 1250, rate: -1, repeat: 1 }), { timeMs: 0, iteration: 1, finished: true });
  assert.deepEqual(advance({ timeMs: 250, elapsedMs: 9999, rate: -1, repeat: 1 }), { timeMs: 0, iteration: 1, finished: true });
});

test("closed-form timing agrees with an independent one-tick virtual clock", () => {
  for (const durationMs of [1, 2, 4, 8]) for (const rate of [-1, 1]) {
    for (let timeMs = 0; timeMs <= durationMs; timeMs++) for (const repeat of [0, 1, 3]) {
      for (let elapsedMs = 0; elapsedMs <= 40; elapsedMs++) {
        let time = timeMs, iteration = 0, finished = false;
        const end = rate > 0 ? durationMs : 0;
        for (let tick = 0; tick <= elapsedMs; tick++) {
          if (time === end && iteration === repeat) { finished = true; break; }
          if (tick === elapsedMs) break;
          if (time === end) { time = rate > 0 ? 0 : durationMs; iteration++; }
          time += rate;
        }
        assert.deepEqual(advance({ durationMs, timeMs, rate, repeat, elapsedMs }), { timeMs: time, iteration, finished });
      }
    }
  }
});

test("zero duration, infinite repetition and numeric limits remain bounded", () => {
  assert.deepEqual(advance({ durationMs: 0, elapsedMs: 100, repeat: Infinity }), { timeMs: 0, iteration: 0, finished: true });
  assert.deepEqual(advance({ durationMs: 0, rate: 0 }), { timeMs: 0, iteration: 0, finished: false });
  assert.deepEqual(advance({ elapsedMs: Number.MAX_VALUE, rate: Number.MAX_VALUE, repeat: 3 }), { timeMs: 1000, iteration: 3, finished: true });
  assert.throws(() => advance({ elapsedMs: Number.MAX_VALUE, rate: Number.MAX_VALUE, repeat: Infinity }), /iteration count/);
  assert.deepEqual(advance({ durationMs: Number.MAX_VALUE, elapsedMs: Number.MAX_VALUE, rate: 2, repeat: 3 }),
    { timeMs: Number.MAX_VALUE, iteration: 1, finished: false });
  assert.deepEqual(advance({ timeMs: Number.MAX_VALUE, durationMs: Number.MAX_VALUE, elapsedMs: Number.MAX_VALUE, rate: -2, repeat: 1 }),
    { timeMs: 0, iteration: 1, finished: true });
  assert.throws(() => advance({ durationMs: Number.MIN_VALUE, elapsedMs: Number.MAX_VALUE, repeat: Infinity }), /iteration count/);
  assert.throws(() => advance({ durationMs: 1, elapsedMs: 2, repeat: Infinity, iteration: Number.MAX_SAFE_INTEGER }), /iteration count/);
  const value = advance({ elapsedMs: 1 }); assert.ok(Object.isFrozen(value));
});

test("invalid clock state is rejected without mutating inputs or reading accessors", () => {
  for (const changes of [{ timeMs: -1 }, { timeMs: 1001 }, { timeMs: NaN }, { elapsedMs: -1 }, { elapsedMs: Infinity },
    { durationMs: -1 }, { durationMs: NaN }, { rate: Infinity }, { rate: "1" },
    { iteration: -1 }, { iteration: 1, repeat: 0 }, { repeat: -1 }, { repeat: 1.5 }, { repeat: "infinite" }, { extra: true }]) {
    assert.throws(() => advance(changes));
  }
  assert.throws(() => advancePlayback(null));
  const state = { timeMs: 100, durationMs: 1000, elapsedMs: 100, rate: 1, iteration: 0, repeat: 0 };
  const before = structuredClone(state); advancePlayback(state); assert.deepEqual(state, before);
  let calls = 0; Object.defineProperty(state, "rate", { enumerable: true, get() { calls++; return 1; } });
  assert.throws(() => advancePlayback(state), /accessors/); assert.equal(calls, 0);
});
