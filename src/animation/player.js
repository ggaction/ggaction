import { ownRecord } from "../core/ownData.js";
import { rejectUnknownProperties } from "../core/validation.js";
import { advancePlayback } from "../grammar/animation/timing.js";
import { normalizePlaybackOptions } from "../grammar/animation/playbackOptions.js";

const MAX_QUEUED_CONTROLS = 256;
const option = (input, key, fallback) => Object.hasOwn(input, key) ? input[key] : fallback;
function callable(value, label) {
  if (typeof value !== "function") throw new TypeError(`${label} must be a function.`);
  return value;
}
function configuration(durationMs, rate, repeat) {
  advancePlayback({ timeMs: 0, durationMs, elapsedMs: 0, rate, iteration: 0, repeat });
  return { durationMs, rate, repeat };
}

// Private runtime owner. Sampling and rendering stay injected until the typed
// planner and its public entry are qualified together.
export function createPlaybackController(input) {
  ownRecord(input, "Animation controller");
  rejectUnknownProperties(input, ["durationMs", "clock", "sample", "render", "commit", "rate", "repeat", "reducedMotion"], "animation controller");
  let clock = option(input, "clock");
  ownRecord(clock, "Animation clock");
  for (const name of ["now", "requestFrame", "cancelFrame"]) {
    if (!Object.hasOwn(clock, name)) throw new TypeError(`Animation clock requires ${name}.`);
    callable(clock[name], `Animation clock ${name}`);
  }
  let render = callable(option(input, "render"), "Animation render");
  let commit = option(input, "commit");
  if (commit !== undefined) callable(commit, "Animation commit");
  let sample = callable(option(input, "sample"), "Animation sample");
  const playback = normalizePlaybackOptions(Object.fromEntries(["rate", "repeat", "reducedMotion"]
    .filter(key => Object.hasOwn(input, key)).map(key => [key, input[key]])));
  let { durationMs, rate, repeat } = configuration(option(input, "durationMs"), playback.rate, playback.repeat);
  let reducedMotion = playback.reducedMotion;
  let status = "idle", timeMs = rate < 0 ? durationMs : 0, iteration = 0, frame;
  let anchor, scheduled = false, handle, generation = 0, requesting = false;
  let busy = false, queue = [], settled, resolveFinished, finished;

  function newRun() {
    settled = false;
    finished = new Promise(resolve => { resolveFinished = resolve; });
  }
  newRun();
  function settle(reason) {
    if (settled) return;
    settled = true;
    resolveFinished(Object.freeze({ reason, timeMs, iteration }));
  }
  function alive() {
    if (status === "disposed") throw new Error("Animation controller is disposed.");
  }
  function now() {
    const value = clock.now();
    if (!Number.isFinite(value) || value < 0 || anchor !== undefined && value < anchor) {
      throw new RangeError("Animation clock must be finite, nonnegative and monotonic.");
    }
    return value;
  }
  function unschedule() {
    generation++;
    if (!scheduled) return;
    scheduled = false;
    clock.cancelFrame(handle);
  }
  function complete() {
    unschedule();
    status = "finished";
    if (commit !== undefined) commit(frame);
    if (status !== "disposed") settle("completed");
  }
  function candidate(at) {
    const next = status === "playing" ? advancePlayback({ timeMs, durationMs,
      elapsedMs: at - anchor, rate, iteration, repeat }) : { timeMs, iteration, finished: false };
    return { ...next, frame: next.timeMs === timeMs && next.iteration === iteration && frame !== undefined
      ? frame : sample(next.timeMs) };
  }
  function apply(next, at, emit = true) {
    timeMs = next.timeMs;
    iteration = next.iteration;
    frame = next.frame;
    anchor = at;
    if (emit) render(frame);
    if (status !== "disposed" && next.finished) complete();
  }
  function synchronize() {
    if (status !== "playing") return;
    const at = now();
    apply(candidate(at), at, at !== anchor);
  }
  function schedule() {
    if (scheduled || status !== "playing") return;
    const token = generation;
    scheduled = true;
    requesting = true;
    try {
      handle = clock.requestFrame(() => {
        if (requesting) throw new Error("Animation clock frames must be asynchronous.");
        if (!scheduled || token !== generation || status !== "playing") return;
        scheduled = false;
        perform(synchronize);
      });
    } finally { requesting = false; }
  }
  function perform(control) {
    if (busy) {
      if (queue.length >= MAX_QUEUED_CONTROLS) throw new RangeError("Animation control queue exceeds its limit.");
      queue.push(control);
      return api;
    }
    busy = true;
    try {
      control();
      let count = 0;
      while (queue.length && status !== "disposed") {
        if (++count > MAX_QUEUED_CONTROLS) throw new RangeError("Animation control queue exceeds its limit.");
        queue.shift()();
      }
      schedule();
    } catch (error) {
      queue = [];
      if (status !== "disposed") {
        status = "cancelled";
        try { unschedule(); } finally { settle("cancelled"); }
      }
      throw error;
    } finally { busy = false; }
    return api;
  }
  function start() {
    const at = now();
    status = rate === 0 ? "paused" : "playing";
    anchor = at;
    if (reducedMotion && rate !== 0) {
      timeMs = rate < 0 ? 0 : durationMs;
      iteration = repeat === Infinity ? 0 : repeat;
      frame = sample(timeMs);
      render(frame);
      if (status !== "disposed") complete();
    } else {
      const next = advancePlayback({ timeMs, durationMs, elapsedMs: 0, rate, iteration, repeat });
      apply({ ...next, frame: sample(next.timeMs) }, at);
    }
  }
  function play() {
    alive();
    return perform(() => {
      if (status === "playing") return;
      if (settled) { newRun(); timeMs = rate < 0 ? durationMs : 0; iteration = 0; }
      start();
    });
  }
  function pause() {
    alive();
    return perform(() => { synchronize(); if (status === "playing") { status = "paused"; unschedule(); } });
  }
  function seek(value) {
    alive();
    if (!Number.isFinite(value)) throw new TypeError("Animation seek time must be finite.");
    return perform(() => {
      synchronize();
      if (status === "disposed") return;
      if (settled) { newRun(); status = "paused"; iteration = 0; }
      timeMs = Math.max(0, Math.min(durationMs, value));
      frame = sample(timeMs);
      render(frame);
    });
  }
  function changeRate(value) {
    alive();
    if (!Number.isFinite(value)) throw new TypeError("Animation rate must be finite.");
    return perform(() => {
      synchronize();
      rate = value;
      if (rate === 0 && status === "playing") { status = "paused"; unschedule(); }
    });
  }
  function reverse() {
    alive();
    return perform(() => { synchronize(); rate = rate === 0 ? -1 : -rate; });
  }
  function changeRepeat(value) {
    alive();
    configuration(durationMs, rate, value);
    if (value < iteration) throw new RangeError("Animation repeat cannot precede the current iteration.");
    return perform(() => {
      const at = now(), next = candidate(at);
      if (next.iteration > value) throw new RangeError("Animation repeat cannot precede the current iteration.");
      repeat = value;
      apply({ ...next, finished: status === "playing" && advancePlayback({ timeMs: next.timeMs,
        durationMs, elapsedMs: 0, rate, iteration: next.iteration, repeat }).finished }, at);
    });
  }
  function cancel() {
    alive();
    return perform(() => {
      synchronize();
      if (settled || status === "disposed") return;
      status = "cancelled";
      unschedule();
      settle("cancelled");
    });
  }
  function interrupt(request) {
    alive();
    ownRecord(request, "Animation interruption");
    rejectUnknownProperties(request, ["durationMs", "createSample", "rate", "repeat", "reducedMotion"], "animation interruption");
    const next = configuration(option(request, "durationMs"), option(request, "rate", 1), option(request, "repeat", 0));
    const motion = option(request, "reducedMotion", reducedMotion);
    if (typeof motion !== "boolean") throw new TypeError("Animation reducedMotion must be boolean.");
    const factory = callable(option(request, "createSample"), "Animation interruption sampler factory");
    function prepare() {
      const at = now(), captured = candidate(at), initialTime = next.rate < 0 ? next.durationMs : 0;
      const nextSample = callable(factory(captured.frame, initialTime), "Animation interrupted sample");
      if (nextSample(initialTime) !== captured.frame) throw new Error("Animation interruption must preserve its captured starting frame.");
      return { at, captured, initialTime, nextSample, playing: status === "playing" };
    }
    function replace({ at, captured, initialTime, nextSample, playing }) {
      unschedule();
      timeMs = captured.timeMs; iteration = captured.iteration;
      settle("interrupted");
      ({ durationMs, rate, repeat } = next);
      reducedMotion = motion; sample = nextSample; timeMs = initialTime; iteration = 0;
      newRun();
      status = playing ? "playing" : "paused";
      if (playing) start();
      else { frame = captured.frame; anchor = at; render(frame); }
    }
    // A rejected target must leave the active run and its pending frame intact.
    const prepared = busy ? undefined : prepare();
    return perform(() => replace(prepared ?? prepare()));
  }
  function dispose() {
    if (status === "disposed") return;
    status = "disposed";
    queue = [];
    try { unschedule(); } finally {
      settle("disposed");
      frame = sample = render = commit = clock = undefined;
    }
  }
  const api = Object.freeze({ play, pause, seek, reverse, setRate: changeRate, setRepeat: changeRepeat,
    cancel, interrupt, dispose, getState: () => Object.freeze({ status, timeMs, durationMs, rate, iteration, repeat }),
    getFrame: () => frame, get finished() { return finished; } });
  return api;
}
