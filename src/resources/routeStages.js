const active = signal => { if (signal !== undefined) AbortSignal.prototype.throwIfAborted.call(signal); };

function nextRouteTurn(signal) {
  active(signal);
  return new Promise((resolve, reject) => {
    let timer;
    const done = error => {
      clearTimeout(timer);
      if (signal !== undefined) EventTarget.prototype.removeEventListener.call(signal, "abort", onAbort);
      if (error === undefined) resolve(); else reject(error);
    };
    const onAbort = () => { try { active(signal); } catch (error) { done(error); } };
    timer = setTimeout(() => done(), 0);
    if (signal !== undefined) EventTarget.prototype.addEventListener.call(signal, "abort", onAbort, { once: true });
    onAbort();
  });
}

// Host-only scheduling. Pure iterators never import timers or retain a callback.
export async function drainRouteStages(iterator, signal, check = () => active(signal)) {
  try {
    while (true) {
      check();
      const next = iterator.next();
      check();
      if (next.done) { active(signal); return next.value; }
      await nextRouteTurn(signal);
    }
  } finally { iterator.return(); }
}

export async function drainNativeRouteStages(iterator, lifetime, compute) {
  let completion;
  try {
    while (true) {
      lifetime.check();
      const next = iterator.next(completion); completion = undefined;
      lifetime.check();
      if (next.done) return next.value;
      if (next.value === undefined) await nextRouteTurn(lifetime.signal);
      else {
        if (next.value.kind !== "edge-route-computation") throw new TypeError("Unknown native route continuation.");
        completion = await compute(next.value.job, next.value.scope);
      }
    }
  } finally { iterator.return(); }
}

export function createRouteDeadline(signal, milliseconds, started = performance.now()) {
  active(signal);
  if (!Number.isSafeInteger(milliseconds) || milliseconds < 1 || milliseconds > 30_000) throw new RangeError("Route deadlineMs must be a positive safe integer at most 30000.");
  const controller = new AbortController(), expires = started + milliseconds;
  const expire = () => controller.abort(new RangeError("Route preparation deadline exceeded."));
  const onAbort = () => { try { active(signal); } catch (error) { controller.abort(error); } };
  const timer = setTimeout(expire, Math.max(0, expires - performance.now()));
  if (signal !== undefined) EventTarget.prototype.addEventListener.call(signal, "abort", onAbort, { once: true });
  onAbort();
  return {
    signal: controller.signal,
    cancel: error => controller.abort(error),
    check() { if (performance.now() >= expires) expire(); active(controller.signal); },
    close() { clearTimeout(timer); if (signal !== undefined) EventTarget.prototype.removeEventListener.call(signal, "abort", onAbort); }
  };
}
