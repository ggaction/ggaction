import { canonicalJSON } from "../../../core/contentDigest.js";
import { encodeValue } from "../../../core/valueEncoding.js";
import { createEncodedValueCursor, advanceEncodedValueCursor, clearEncodedValueCursor } from "../../../core/encodedValueCursor.js";
import { createSha256State, updateSha256, finishSha256, clearSha256 } from "../../../core/sha256.js";

const zeroHash = "0".repeat(64), size = value => canonicalJSON(encodeValue(value)).length;
// Exact ASCII tagged-envelope overhead; value bytes keep the existing encoder.
export const ROUTE_JOB_HASH_BYTES = size({ inputHash: zeroHash }) - size({}) + 1;
export const ROUTE_COMPLETION_BYTES = size({ schemaVersion: 2, inputHash: zeroHash, resultHash: zeroHash, result: null }) - size(null);
export const routeHashScratchBytes = maximum => Math.min(65_536, maximum) + 352 + 64;

export function* routeHashStages(snapshot, execution, ledger, overhead = 0) {
  const maximum = execution.maxBytes - overhead;
  if (maximum < 1) throw new RangeError("Route packet exceeds execution maxBytes.");
  const reservation = routeHashScratchBytes(maximum);
  let cursor, sha, reserved = false;
  try {
    ledger.reserve(reservation); reserved = true;
    cursor = createEncodedValueCursor(snapshot, { maxBytes: maximum, maxDepth: 128, maxSteps: maximum });
    sha = createSha256State();
    let done = false, bytes = 0;
    do {
      ledger.check();
      let part = advanceEncodedValueCursor(cursor, { maxBytes: 65_536, maxSteps: 4096 });
      updateSha256(sha, part.bytes);
      done = part.done; bytes = part.stats.bytes;
      // Release the previous output before suspension and the next allocation.
      part = undefined;
      // The host checks cancellation after the last bytes and before publication.
      yield undefined;
    } while (!done);
    ledger.check();
    return { hash: finishSha256(sha), bytes: bytes + overhead };
  } finally {
    if (cursor !== undefined) clearEncodedValueCursor(cursor);
    if (sha !== undefined) clearSha256(sha);
    if (reserved) ledger.release(reservation);
  }
}

export function finishRouteStages(iterator) {
  let next;
  try { do { next = iterator.next(); } while (!next.done); return next.value; }
  finally { iterator.return(); }
}
