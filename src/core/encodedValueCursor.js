import { ownArray, ownRecord } from "./ownData.js";
import { isOwned, isPlainObject } from "./immutable.js";
import { encodeValue, encodedContainerTag, encodedHole, invalidSnapshot } from "./valueEncoding.js";
import { writeJSONStringBytes } from "./jsonText.js";

const cursors = new WeakMap();
const encoder = new TextEncoder();

function options(value, keys, label) {
  ownRecord(value, label);
  for (const key of Object.keys(value)) if (!keys.includes(key)) throw new TypeError(`${label} has an unknown ${key}.`);
  for (const key of keys) {
    if (!Object.hasOwn(value, key) || !Number.isSafeInteger(value[key]) || value[key] < 1) throw new RangeError(`${label} requires a positive safe ${key}.`);
  }
}
function charge(state, count) {
  if (count > state.limits.maxBytes - state.bytes) throw new RangeError("Encoded value bytes exceeded.");
  state.bytes += count;
}
function step(state) {
  if (++state.steps > state.limits.maxSteps) throw new RangeError("Encoded value steps exceeded.");
}
function* atom(state, text) {
  step(state); charge(state, text.length);
  yield encoder.encode(text);
}
function* string(state, text) {
  // The writer checks the complete string's minimum before escaping any unit.
  for (const bytes of writeJSONStringBytes(text, state.bytes, state.limits.maxBytes, "Encoded value bytes")) {
    step(state); charge(state, bytes.length); yield bytes;
  }
}
function* scalarTree(state, value) {
  if (typeof value === "string") { yield* string(state, value); return; }
  if (Array.isArray(value)) {
    yield* atom(state, "[");
    for (let index = 0; index < value.length; index++) {
      if (index) yield* atom(state, ",");
      yield* scalarTree(state, value[index]);
    }
    yield* atom(state, "]"); return;
  }
  yield* atom(state, JSON.stringify(value));
}
function* visit(state, value, path, depth) {
  if (value === null || typeof value !== "object") {
    // Existing primitive tags, numeric spelling and unsupported scalar errors.
    yield* scalarTree(state, encodeValue(value, path)); return;
  }
  if (state.ancestors.has(value)) throw invalidSnapshot(`Cannot serialize a cycle at ${path}.`, path);
  if (depth > state.limits.maxDepth) throw new RangeError(`Encoded value depth exceeded at ${path}.`);
  const array = Array.isArray(value);
  if (!array && !isPlainObject(value)) throw invalidSnapshot(`Cannot serialize a class instance at ${path}.`, path);
  if (array && value.length > state.limits.maxBytes - state.bytes) throw new RangeError("Encoded array minimum bytes exceeded.");
  if (array) ownArray(value, "Encoded array", false); else ownRecord(value, "Encoded record");
  if (!isOwned(value)) throw new TypeError("Encoded value requires a deep-owned snapshot.");
  const keys = array ? undefined : Object.keys(value), length = array ? value.length : keys.length;
  state.ancestors.add(value);
  try {
    yield* atom(state, `[${JSON.stringify(encodedContainerTag(array))},[`);
    for (let index = 0; index < length; index++) {
      if (index) yield* atom(state, ",");
      const key = array ? String(index) : keys[index];
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (array && descriptor === undefined) { yield* scalarTree(state, encodedHole()); continue; }
      if (!array) { yield* atom(state, "["); yield* string(state, key); yield* atom(state, ","); }
      yield* visit(state, descriptor.value, array ? `${path}[${index}]` : `${path}.${key}`, depth + 1);
      if (!array) yield* atom(state, "]");
    }
    yield* atom(state, "]]");
  } finally { state.ancestors.delete(value); }
}

// This private cursor grants no domain authority. Callers must establish the
// exact native job/resource and policy before supplying its immutable snapshot.
export function createEncodedValueCursor(snapshot, limits) {
  options(limits, ["maxBytes", "maxDepth", "maxSteps"], "Encoded value limits");
  if (limits.maxDepth > 128) throw new RangeError("Encoded value depth maximum is 128.");
  if (snapshot !== null && typeof snapshot === "object" && !isOwned(snapshot)) throw new TypeError("Encoded value requires a deep-owned snapshot.");
  const state = { limits: { ...limits }, bytes: 0, steps: 0, ancestors: new Set(), pending: null, offset: 0, iterator: null };
  state.iterator = visit(state, snapshot, "payload", 0);
  const handle = Object.freeze({}); cursors.set(handle, state); return handle;
}

export function advanceEncodedValueCursor(handle, budget) {
  const state = cursors.get(handle);
  if (state === undefined || state.iterator === null) throw new TypeError("Encoded value cursor is not active.");
  try {
    options(budget, ["maxBytes", "maxSteps"], "Encoded value chunk");
    if (budget.maxBytes > 65_536 || budget.maxSteps > 4096) throw new RangeError("Encoded value chunk maximum exceeded.");
    const output = new Uint8Array(Math.min(budget.maxBytes, state.limits.maxBytes));
    let written = 0, turns = 0;
    while (written < output.length && turns < budget.maxSteps) {
      if (state.pending === null) {
        const next = state.iterator.next(); turns++;
        if (next.done) { state.iterator = null; break; }
        state.pending = next.value; state.offset = 0;
      }
      const count = Math.min(state.pending.length - state.offset, output.length - written);
      output.set(state.pending.subarray(state.offset, state.offset + count), written);
      written += count; state.offset += count;
      if (state.offset === state.pending.length) state.pending = null;
    }
    return { bytes: output.subarray(0, written), done: state.iterator === null, stats: { bytes: state.bytes, steps: state.steps } };
  } catch (error) { clearEncodedValueCursor(handle); throw error; }
}

export function clearEncodedValueCursor(handle) {
  const state = cursors.get(handle);
  if (state === undefined) return;
  state.iterator?.return(); state.iterator = null; state.pending = null; state.ancestors.clear(); cursors.delete(handle);
}
