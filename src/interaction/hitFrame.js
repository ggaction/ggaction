import { freezeOwned } from "../core/immutable.js";
import { ownRecord } from "../core/ownData.js";
import { prepareHitIndex, hitIndex, nearestHitIndex } from "../grammar/hitIndex.js";

function request(frame) {
  ownRecord(frame, "Hit frame");
  const keys = ["scene", "entries", "version"];
  if (Object.keys(frame).length !== keys.length || keys.some(key => !Object.hasOwn(frame, key)) ||
      !Number.isSafeInteger(frame.version) || frame.version < 0) {
    throw new TypeError("Hit frame requires scene, entries and a non-negative safe integer version.");
  }
  return frame;
}
function prepare(frame) {
  const index = prepareHitIndex(frame.scene, frame.entries);
  return { index, scene: frame.scene, version: frame.version,
    snapshot: freezeOwned({ scene: frame.scene, version: frame.version, itemCount: index.itemCount, indexedCount: index.indexedCount }) };
}

/** Private, host-independent current-frame lifecycle. No listeners, timers or animation sampling. */
export function createHitFrameBridge(initialFrame) {
  let current = prepare(request(initialFrame));
  const live = () => {
    if (current === null) throw new Error("Hit frame bridge is disposed.");
    return current;
  };
  return Object.freeze({
    getState() { return live().snapshot; },
    updateFrame(frame) {
      const previous = live(); request(frame);
      // A late completed frame never rebuilds or replaces the current index.
      if (frame.version <= previous.version) return freezeOwned({ applied: false, version: previous.version, reason: "stale-frame" });
      const next = prepare(frame);
      current = next;
      return freezeOwned({ applied: true, version: next.version });
    },
    hit(point, options = {}) {
      const frame = live(), result = hitIndex(frame.index, frame.scene, point, options);
      return freezeOwned({ ...result, frameVersion: frame.version });
    },
    nearest(point, options) {
      const frame = live(), result = nearestHitIndex(frame.index, frame.scene, point, options);
      return freezeOwned({ ...result, frameVersion: frame.version });
    },
    dispose() {
      if (current === null) return false;
      current = null;
      return true;
    }
  });
}
