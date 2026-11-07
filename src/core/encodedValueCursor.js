import { ownArray, ownRecord } from "./ownData.js";
import { isOwned, isPlainObject } from "./immutable.js";
import { encodeValue, encodedContainerTag, encodedHole, invalidSnapshot } from "./valueEncoding.js";
import { jsonStringUnitWidth, writeJSONStringUnit } from "./jsonText.js";
import { validateGeneratedItemLimit } from "./validation.js";

const cursors = new WeakMap();
const BYTES_LABEL = "Encoded value bytes";
// Tokens collect in one small reused batch instead of one allocation per
// token. A pending batch never exceeds the 352 bytes the route hash scratch
// reserves. The batch is flushed at FLUSH_AT before every scalar, string unit,
// container opening, member and container closing. Between two such checks at
// most one 24-byte number or six-byte unit and a few one- or two-byte
// delimiters are written, well inside the 64-byte margin.
const BATCH_BYTES = 352, FLUSH_AT = BATCH_BYTES - 64;
const ARRAY_OPEN = `[${JSON.stringify(encodedContainerTag(true))},[`, RECORD_OPEN = `[${JSON.stringify(encodedContainerTag(false))},[`;

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
// One ASCII token: one step and its bytes, checked before it is written.
function atom(state, text) {
  step(state); charge(state, text.length);
  const batch = state.batch;
  let used = state.used;
  for (let index = 0; index < text.length; index++) batch[used++] = text.charCodeAt(index);
  state.used = used;
}
function take(state) {
  const count = state.used;
  state.used = 0;
  return state.batch.subarray(0, count);
}
// The path is only spelled when an error needs it.
function pathOf(state) {
  let path = "payload";
  for (const key of state.trail) path += typeof key === "number" ? `[${key}]` : `.${key}`;
  return path;
}
function* string(state, text) {
  // The complete string's minimum is checked before any unit is escaped.
  const offset = state.bytes, maximum = state.limits.maxBytes;
  validateGeneratedItemLimit(offset + text.length + 2, BYTES_LABEL, maximum);
  if (state.used >= FLUSH_AT) yield take(state);
  atom(state, '"');
  let length = 2;
  for (let index = 0; index < text.length;) {
    const width = jsonStringUnitWidth(text, index);
    length += width;
    validateGeneratedItemLimit(offset + length, BYTES_LABEL, maximum);
    if (state.used >= FLUSH_AT) yield take(state);
    step(state); charge(state, width);
    index = writeJSONStringUnit(text, index, width, state.batch, state.used);
    state.used += width;
  }
  atom(state, '"');
}
// encodeValue's tags for undefined, bigint, -0, NaN, infinities and holes are
// arrays of strings.
function* tagged(state, parts) {
  if (state.used >= FLUSH_AT) yield take(state);
  atom(state, "[");
  for (let index = 0; index < parts.length; index++) {
    if (index) atom(state, ",");
    yield* string(state, parts[index]);
  }
  atom(state, "]");
}
function* visit(state, value, depth) {
  if (value === null || typeof value !== "object") {
    // Existing primitive tags, numeric spelling and unsupported scalar errors.
    // Plain JSON scalars are written directly; encodeValue returns them as is.
    if (typeof value === "string") yield* string(state, value);
    else if (value === null || typeof value === "boolean" || typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0)) {
      if (state.used >= FLUSH_AT) yield take(state);
      atom(state, JSON.stringify(value));
    } else yield* tagged(state, encodeValue(value, pathOf(state)));
    return;
  }
  if (state.ancestors.has(value)) { const path = pathOf(state); throw invalidSnapshot(`Cannot serialize a cycle at ${path}.`, path); }
  if (depth > state.limits.maxDepth) throw new RangeError(`Encoded value depth exceeded at ${pathOf(state)}.`);
  const array = Array.isArray(value);
  if (!array && !isPlainObject(value)) { const path = pathOf(state); throw invalidSnapshot(`Cannot serialize a class instance at ${path}.`, path); }
  if (array && value.length > state.limits.maxBytes - state.bytes) throw new RangeError("Encoded array minimum bytes exceeded.");
  if (array) ownArray(value, "Encoded array", false); else ownRecord(value, "Encoded record");
  if (!isOwned(value)) throw new TypeError("Encoded value requires a deep-owned snapshot.");
  // Both checks above admit only own enumerable data properties on a frozen
  // value, so reading members directly sees exactly those descriptors.
  const keys = array ? undefined : Object.keys(value), length = array ? value.length : keys.length, trail = state.trail;
  state.ancestors.add(value);
  try {
    if (state.used >= FLUSH_AT) yield take(state);
    atom(state, array ? ARRAY_OPEN : RECORD_OPEN);
    for (let index = 0; index < length; index++) {
      if (state.used >= FLUSH_AT) yield take(state);
      if (index) atom(state, ",");
      if (array && !Object.hasOwn(value, index)) { yield* tagged(state, encodedHole()); continue; }
      const key = array ? index : keys[index];
      if (!array) { atom(state, "["); yield* string(state, key); atom(state, ","); }
      trail.push(key);
      yield* visit(state, value[key], depth + 1);
      trail.pop();
      if (!array) atom(state, "]");
    }
    if (state.used >= FLUSH_AT) yield take(state);
    atom(state, "]]");
  } finally { state.ancestors.delete(value); }
}
function* root(state, snapshot) {
  yield* visit(state, snapshot, 0);
  // Every value writes at least one token after its last flush.
  yield take(state);
}

// This private cursor grants no domain authority. Callers must establish the
// exact native job/resource and policy before supplying its immutable snapshot.
export function createEncodedValueCursor(snapshot, limits) {
  options(limits, ["maxBytes", "maxDepth", "maxSteps"], "Encoded value limits");
  if (limits.maxDepth > 128) throw new RangeError("Encoded value depth maximum is 128.");
  if (snapshot !== null && typeof snapshot === "object" && !isOwned(snapshot)) throw new TypeError("Encoded value requires a deep-owned snapshot.");
  const state = { limits: { ...limits }, bytes: 0, steps: 0, ancestors: new Set(), trail: [], batch: new Uint8Array(BATCH_BYTES), used: 0, pending: null, offset: 0, iterator: null };
  state.iterator = root(state, snapshot);
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
  state.iterator?.return(); state.iterator = null; state.pending = null; state.batch = null; state.ancestors.clear(); state.trail.length = 0; cursors.delete(handle);
}
