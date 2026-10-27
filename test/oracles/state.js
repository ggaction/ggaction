import assert from "node:assert/strict";

export function captureState(value) {
  return structuredClone(value);
}

export function assertUnchanged(value, before) {
  assert.deepEqual(value, before, "State or trace changed unexpectedly.");
}
