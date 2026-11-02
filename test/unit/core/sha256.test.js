import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createSha256State, updateSha256, finishSha256, clearSha256 } from "../../../src/core/sha256.js";
import { canonicalJSON, contentBytesDigest, contentDigest, copyContentBytes } from "../../../src/core/contentDigest.js";
import { encodeValue } from "../../../src/core/valueEncoding.js";

const oracle = bytes => createHash("sha256").update(bytes).digest("hex");
function chunked(bytes, widths) {
  const state = createSha256State();
  try {
    let offset = 0, index = 0;
    updateSha256(state, bytes, 0, 0);
    while (offset < bytes.length) {
      const end = Math.min(bytes.length, offset + widths[index++ % widths.length]);
      updateSha256(state, bytes, offset, end);
      offset = end;
    }
    updateSha256(state, bytes, bytes.length, bytes.length);
    return finishSha256(state);
  } finally { clearSha256(state); }
}

test("SHA block padding and arbitrary chunk boundaries match independent crypto", () => {
  for (const length of [0, 1, 2, 55, 56, 63, 64, 65, 119, 120, 127, 128, 129, 256, 1025, 8193]) {
    const bytes = Uint8Array.from({ length }, (_, i) => (i * 37 + 11) % 256);
    for (const widths of [[1], [63], [64], [65], [3, 55, 7, 128, 1]]) {
      assert.equal(chunked(bytes, widths), oracle(bytes), `${length}: ${widths}`);
    }
    assert.equal(contentBytesDigest(bytes), oracle(bytes));
  }
  const bytes = new TextEncoder().encode("a🌍\ud800\udc00\ud800x\udc00é\0".repeat(31));
  assert.equal(chunked(bytes, [1]), oracle(bytes));
});

test("byte updates preserve subviews and caller buffers and ignore shadow accessors", () => {
  const bytes = Uint8Array.from({ length: 180 }, (_, i) => i), subview = bytes.subarray(3, 147);
  const before = bytes.slice(); let getters = 0;
  for (const name of ["length", "byteLength", "buffer", "byteOffset", "subarray"]) {
    Object.defineProperty(subview, name, { get() { getters++; throw Error("shadow"); } });
  }
  const state = createSha256State();
  updateSha256(state, subview, 2, 130);
  assert.equal(finishSha256(state), oracle(before.subarray(5, 133)));
  clearSha256(state);
  assert.equal(contentBytesDigest(subview), oracle(before.subarray(3, 147)));
  assert.equal(getters, 0); assert.deepEqual(bytes, before);
});

test("state rejects invalid ranges before mutation and releases buffers after failure or finish", () => {
  const state = createSha256State(), bytes = Uint8Array.of(97, 98, 99);
  updateSha256(state, bytes, 0, 1);
  const snapshot = structuredClone(state);
  for (const [start, end] of [[-1, 2], [1, 0], [0, 4], [NaN, 1], [0, Infinity], [0.5, 1], [0, 1.5], [0, "1"]]) {
    assert.throws(() => updateSha256(state, bytes, start, end), /byte range/);
    assert.deepEqual(state, snapshot);
  }
  assert.throws(() => updateSha256(state, []), /requires bytes/);
  assert.throws(() => updateSha256({}, bytes), /Invalid SHA/);
  assert.throws(() => finishSha256(null), /Invalid SHA/);
  assert.throws(() => clearSha256({}), /Invalid SHA/);
  updateSha256(state, bytes, 1);
  assert.equal(finishSha256(state), oracle(bytes));
  assert.throws(() => finishSha256(state), /no longer active/);
  assert.throws(() => updateSha256(state, bytes, 0, 0), /no longer active/);
  const buffers = [state.hash, state.words, state.tail];
  clearSha256(state); clearSha256(state);
  assert.ok(buffers.every(buffer => buffer.every(value => value === 0)));
  assert.equal(state.hash, null); assert.equal(state.words, null); assert.equal(state.tail, null);
  assert.equal(state.totalBytes, 0); assert.equal(state.tailLength, 0);
  assert.throws(() => finishSha256(state), /no longer active/);
  assert.equal(chunked(bytes, [1]), oracle(bytes));
});

test("length overflow preflight is atomic and clear works on an unfinished state", () => {
  // Fault-inject private bookkeeping, without allocating an impossible input.
  for (const count of [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1, -1, NaN]) {
    const state = createSha256State(); state.totalBytes = count;
    const before = structuredClone(state);
    assert.throws(() => updateSha256(state, Uint8Array.of(1)), /safe integer/);
    assert.deepEqual(state, before);
    if (count !== Number.MAX_SAFE_INTEGER) assert.throws(() => finishSha256(state), /safe integer/);
    const buffers = [state.hash, state.words, state.tail];
    clearSha256(state);
    assert.ok(buffers.every(buffer => buffer.every(value => value === 0)));
  }
  const boundary = createSha256State();
  boundary.totalBytes = Number.MAX_SAFE_INTEGER - 1;
  updateSha256(boundary, Uint8Array.of(1));
  assert.equal(boundary.totalBytes, Number.MAX_SAFE_INTEGER);
  finishSha256(boundary);
  assert.deepEqual([...boundary.tail.slice(56)], [0, 255, 255, 255, 255, 255, 255, 248]);
  clearSha256(boundary);
});

test("detached and shared byte inputs fail without changing block state", () => {
  const state = createSha256State(), before = structuredClone(state);
  const detached = new Uint8Array(2); structuredClone(detached, { transfer: [detached.buffer] });
  for (const bytes of [detached, new Uint8Array(new SharedArrayBuffer(2))]) {
    assert.throws(() => updateSha256(state, bytes), TypeError);
    assert.deepEqual(state, before);
    assert.throws(() => contentBytesDigest(bytes), TypeError);
  }
  clearSha256(state);
});

test("string coercion, signed zero, tagged values and legacy getter order remain unchanged", () => {
  for (const value of [undefined, null, -0, 0, 123, 123n, false, NaN, Infinity, "\ud800", "🌍", "\u0000\b\t\n\f\r\"\\"]) {
    assert.equal(contentDigest(value), oracle(new TextEncoder().encode(value)));
  }
  let calls = 0; const error = Error("coercion");
  assert.throws(() => contentDigest({ toString() { calls++; throw error; } }), e => e === error);
  assert.equal(calls, 1); assert.throws(() => contentDigest(Symbol("x")), TypeError);
  assert.equal(canonicalJSON(-0), "0");
  assert.notEqual(contentDigest(canonicalJSON(encodeValue(-0))), contentDigest(canonicalJSON(encodeValue(0))));
  const order = [], child = { get x() { order.push("child"); return 1; } };
  const value = { get a() { order.push("a"); return child; }, get b() { order.push("b"); return 2; } };
  const encoded = canonicalJSON(encodeValue(value));
  assert.deepEqual(order, ["a", "b", "child"]);
  assert.equal(contentDigest(encoded), oracle(new TextEncoder().encode(encoded)));
  assert.throws(() => contentBytesDigest(new Uint16Array(1)), /Content digest requires bytes/);
  assert.throws(() => copyContentBytes(Uint8Array.of(1, 2), 1), /declared limit/);
});
