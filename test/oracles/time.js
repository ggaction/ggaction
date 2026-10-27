// A host-free frame clock: callbacks scheduled during a tick run on the next tick.
export function manualClock(start = 0) {
  if (!Number.isFinite(start) || start < 0) throw new Error("Clock start must be finite and non-negative.");
  let now = start, nextId = 1;
  const pending = new Map();
  return {
    now: () => now,
    pending: () => pending.size,
    requestFrame(callback) {
      if (typeof callback !== "function") throw new Error("Frame callback must be a function.");
      if (pending.size >= 10000) throw new Error("Frame queue limit exceeded.");
      const id = nextId++;
      pending.set(id, callback);
      return id;
    },
    cancelFrame(id) { pending.delete(id); },
    advance(delta) {
      if (!Number.isFinite(delta) || delta < 0 || !Number.isFinite(now + delta)) throw new Error("Clock delta must stay finite and non-negative.");
      now += delta;
      for (const id of [...pending.keys()]) {
        const callback = pending.get(id);
        if (!callback) continue;
        pending.delete(id);
        callback(now);
      }
      return now;
    }
  };
}
