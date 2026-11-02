import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { cloneAndFreeze, freezeOwned } from "../../../src/core/immutable.js";
import { encodeValue } from "../../../src/core/valueEncoding.js";
import { canonicalJSON } from "../../../src/core/contentDigest.js";
import { createEncodedValueCursor, advanceEncodedValueCursor, clearEncodedValueCursor } from "../../../src/core/encodedValueCursor.js";
import { createSha256State, updateSha256, finishSha256, clearSha256 } from "../../../src/core/sha256.js";
import { writeJSONStringBytes } from "../../../src/core/jsonText.js";

const limits = { maxBytes: 1_000_000, maxDepth: 128, maxSteps: 1_000_000 };
const chunk = { maxBytes: 64, maxSteps: 4096 };
function drain(value, budget = chunk, policy = limits) {
  const cursor = createEncodedValueCursor(value, policy), sha = createSha256State(), pieces = [];
  let part;
  try {
    do {
      part = advanceEncodedValueCursor(cursor, budget);
      assert.ok(part.bytes.length <= budget.maxBytes);
      pieces.push(Buffer.from(part.bytes)); updateSha256(sha, part.bytes);
    } while (!part.done);
    assert.throws(() => advanceEncodedValueCursor(cursor, budget), /not active/);
    return { bytes: Buffer.concat(pieces), hash: finishSha256(sha), stats: part.stats };
  } finally { clearEncodedValueCursor(cursor); clearSha256(sha); }
}
const expected = value => Buffer.from(canonicalJSON(encodeValue(value)));

test("strict tagged bytes preserve native ordering, unusual scalars, holes and shared occurrences", () => {
  const sparse = []; sparse.length = 4; sparse[1] = undefined; sparse[3] = -0;
  const shared = { b: 2, a: "quote\"\\\ud800😀\udfff" };
  const values = [null, true, false, undefined, 0, -0, NaN, Infinity, -Infinity, Number.MIN_VALUE,
    Number.MAX_VALUE, 42n, -(10n ** 100n), "", "é한🙂", [], {}, sparse,
    ["number", "NaN"], { b: shared, a: shared, "10": 10, "2": 2, sparse }, Object.create(null)];
  for (const raw of values) {
    const value = cloneAndFreeze(raw), bytes = expected(value);
    for (const size of [1, 7, 64, 65536]) {
      const actual = drain(value, { maxBytes: size, maxSteps: size === 7 ? 1 : 4096 }, { ...limits, maxBytes: bytes.length });
      assert.deepEqual(actual.bytes, bytes);
      assert.equal(actual.hash, createHash("sha256").update(bytes).digest("hex"));
      assert.equal(actual.stats.bytes, bytes.length);
    }
    assert.throws(() => drain(value, chunk, { ...limits, maxBytes: bytes.length - 1 }), bytes.length === 1 ? /positive safe maxBytes/ : /exceed/);
  }
});

test("JSON writer shares all UTF-16 width decisions without unbounded escaped string allocation", () => {
  for (let unit = 0; unit <= 0xffff; unit++) {
    const text = String.fromCharCode(unit), bytes = Buffer.from(JSON.stringify(text));
    const pieces = [...writeJSONStringBytes(text, 7, 7 + bytes.length, "string")];
    assert.ok(pieces.every(piece => piece.length <= 6));
    assert.deepEqual(Buffer.concat(pieces), bytes);
  }
  for (const text of ["", "\ud800\udc00", "\udbff\udfff", "a\ud800\ud800\udc00\udfff", "\udc00\ud800x\udfff"]) {
    const bytes = Buffer.from(JSON.stringify(text));
    assert.deepEqual(Buffer.concat([...writeJSONStringBytes(text, 0, bytes.length, "string")]), bytes);
    assert.throws(() => [...writeJSONStringBytes(text, 0, bytes.length - 1, "string")], /string must not exceed/);
  }
  const old = JSON.stringify; let maximum = 0;
  try {
    JSON.stringify = function(value) { if (typeof value === "string") maximum = Math.max(maximum, value.length); return old(value); };
    [...writeJSONStringBytes("é🙂".repeat(100), 0, 1000, "string")];
  } finally { JSON.stringify = old; }
  assert.equal(maximum, 2);
});

test("strict cursor requires exact owned containers and rejects hostile shapes without getters", () => {
  for (const value of [{}, Object.freeze({}), []]) assert.throws(() => createEncodedValueCursor(value, limits), /deep-owned/);
  const cycle = {}; cycle.self = cycle; freezeOwned(cycle);
  const named = []; named.extra = 1; freezeOwned(named);
  const hidden = {}; Object.defineProperty(hidden, "x", { value: 1 }); freezeOwned(hidden);
  const symbol = { [Symbol("x")]: 1 }; freezeOwned(symbol);
  let reads = 0;
  const accessor = freezeOwned({ get x() { reads++; return 1; } });
  const nestedMutable = freezeOwned({ child: {} });
  for (const [value, message] of [[cycle, /cycle/], [named, /extra properties/], [hidden, /enumerable/],
    [symbol, /enumerable/], [accessor, /accessor/], [nestedMutable, /deep-owned/],
    [freezeOwned(new Date()), /class instance/], [freezeOwned(new (class extends Array {})()), /ordinary array/],
    [Symbol("x"), /symbol/], [() => 1, /function/]]) {
    assert.throws(() => drain(value), message);
  }
  assert.equal(reads, 0);
  const legacy = { bad: () => 1, get later() { reads++; return 2; } };
  assert.throws(() => encodeValue(legacy), /function/); assert.equal(reads, 1);
  reads = 0; assert.throws(() => drain(freezeOwned(legacy)), /accessor/); assert.equal(reads, 0);
});

test("strict cursor limits precede allocation and failed or cleared state cannot resume", () => {
  for (const policy of [null, { ...limits, other: 1 }, { maxBytes: 1, maxSteps: 1 },
    { ...limits, maxBytes: undefined }, { ...limits, maxSteps: NaN }, { ...limits, maxDepth: 129 },
    { ...limits, maxBytes: 0 }, { ...limits, maxBytes: Number.MAX_SAFE_INTEGER + 1 }]) {
    assert.throws(() => createEncodedValueCursor(null, policy));
  }
  const inherited = Object.create({ maxBytes: 10 });
  assert.throws(() => createEncodedValueCursor(null, inherited), /plain object/);
  const sparse = new Array(100); freezeOwned(sparse);
  assert.throws(() => drain(sparse, chunk, { ...limits, maxBytes: 10 }), /array minimum/);
  assert.throws(() => drain(cloneAndFreeze({ a: { b: {} } }), chunk, { ...limits, maxDepth: 1 }), /depth/);
  assert.throws(() => drain(cloneAndFreeze({ a: 1 }), chunk, { ...limits, maxSteps: 1 }), /steps/);
  const handle = createEncodedValueCursor(cloneAndFreeze({ a: "long" }), limits);
  for (const budget of [{ maxBytes: 65537, maxSteps: 1 }, { maxBytes: 1, maxSteps: 4097 },
    { maxBytes: 0, maxSteps: 1 }, { maxBytes: 1 }, { ...chunk, unknown: true }]) {
    const invalid = createEncodedValueCursor(cloneAndFreeze({ a: "long" }), limits);
    assert.throws(() => advanceEncodedValueCursor(invalid, budget));
    assert.throws(() => advanceEncodedValueCursor(invalid, chunk), /not active/);
  }
  assert.equal(advanceEncodedValueCursor(handle, { maxBytes: 1, maxSteps: 1 }).done, false);
  clearEncodedValueCursor(handle); clearEncodedValueCursor(handle);
  assert.throws(() => advanceEncodedValueCursor(handle, chunk), /not active/);
  clearEncodedValueCursor({});
  const failed = createEncodedValueCursor("abcdef", { ...limits, maxBytes: 2 });
  assert.throws(() => advanceEncodedValueCursor(failed, chunk), /exceed/);
  assert.throws(() => advanceEncodedValueCursor(failed, chunk), /not active/);
});

test("actual macrotask cancellation clears hash and traversal without publishing a digest", async () => {
  const value = cloneAndFreeze({ text: "🙂".repeat(80), rows: Array.from({ length: 8 }, (_, i) => ({ i })) });
  const reason = new Error("cancelled hash");
  async function run(abortAt) {
    const control = new AbortController(), handle = createEncodedValueCursor(value, limits), sha = createSha256State();
    let turns = 0, publications = 0, terminal = 0;
    try {
      while (true) {
        control.signal.throwIfAborted();
        const part = advanceEncodedValueCursor(handle, { maxBytes: 7, maxSteps: 7 });
        updateSha256(sha, part.bytes); turns++;
        if (turns === abortAt) setTimeout(() => control.abort(reason), 0);
        await new Promise(resolve => setTimeout(resolve, 0)); control.signal.throwIfAborted();
        if (part.done) { publications++; terminal++; return { hash: finishSha256(sha), turns }; }
      }
    } catch (error) { terminal++; assert.equal(publications, 0); throw error; }
    finally {
      clearEncodedValueCursor(handle); clearSha256(sha);
      assert.equal(terminal, 1); assert.equal(sha.hash, null); assert.equal(sha.tail, null);
      assert.throws(() => advanceEncodedValueCursor(handle, chunk), /not active/);
    }
  }
  const completed = await run(0);
  assert.equal(completed.hash, createHash("sha256").update(expected(value)).digest("hex"));
  for (const turn of [1, 2, completed.turns]) await assert.rejects(run(turn), error => error === reason);
});
