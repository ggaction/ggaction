import assert from "node:assert/strict";
import test from "node:test";
import { referenceKey, compareReferenceKeys, uniqueReferenceKeys, referenceAllocation } from "../../oracles/identity.js";

test("typed key reference distinguishes scalar types and tuple boundaries", () => {
  assert.equal(referenceKey("a"), '["scalar",[["string","a"]]]');
  assert.equal(referenceKey([1, "1"]), '["tuple",[["number",1],["string","1"]]]');
  assert.equal(referenceKey(new Date(0)), '["scalar",[["date",0]]]');
  const values = [false, true, 0, 1, 0n, 1n, "0", "1", "", new Date(0),
    ["a|b", "c"], ["a", "b|c"], ["a"], "a", ["a", ""], [1, "1"], ["1", 1], "__proto__"];
  assert.equal(new Set(values.map(referenceKey)).size, values.length);
  assert.equal(referenceKey(-0), referenceKey(0));
  assert.equal(referenceKey(new Date("1970-01-01T01:00:00+01:00")), referenceKey(new Date(0)));
});

test("typed key reference ordering is transitive, antisymmetric and locale independent", () => {
  const ordered = [false, true, -1, 0, 2, 10, -2n, 0n, 10n, "", "10", "2", "Z", "a",
    "\uD800", "\uD83D\uDE00", "\uE000", new Date(-1), new Date(0),
    [false], [0], [0, "a"], [0, "a", "b"], [1], [1, false], [1, 0], [1, "a"]];
  assert.deepEqual([...ordered].reverse().sort(compareReferenceKeys), ordered);
  for (let i = 0; i < ordered.length; i++) for (let j = 0; j < ordered.length; j++) {
    assert.equal(Math.sign(compareReferenceKeys(ordered[i], ordered[j])), Math.sign(i - j));
    assert.equal(compareReferenceKeys(ordered[i], ordered[j]) === 0,
      referenceKey(ordered[i]) === referenceKey(ordered[j]));
  }
});

test("invalid, empty, sparse, nested and accessor keys fail without reading accessors", () => {
  let reads = 0;
  const accessor = Object.defineProperty([0], "0", { get() { reads++; return 1; } });
  const named = [1]; named.extra = 2;
  const symbolic = [1]; symbolic[Symbol("extra")] = 2;
  for (const value of [null, undefined, NaN, Infinity, -Infinity, {}, /x/, new Number(1),
    new Date(NaN), [], Array(1), [[1]], [undefined], accessor, named, symbolic, Array(65).fill(0)]) {
    assert.throws(() => referenceKey(value));
    assert.throws(() => compareReferenceKeys(value, "valid"));
  }
  assert.equal(reads, 0);
  assert.doesNotThrow(() => referenceKey(Array(64).fill(0)));
});

test("explicit keys survive ordering and value edits and reject duplicate identity", () => {
  const before = Object.freeze([{ id: "a", v: 1 }, { id: "b", v: 2 }].map(Object.freeze));
  const after = Object.freeze([{ id: "b", v: 3 }, { id: "a", v: 1 }].map(Object.freeze));
  const old = uniqueReferenceKeys(before.map(row => row.id));
  const revised = uniqueReferenceKeys(after.map(row => row.id));
  assert.deepEqual(revised, [old[1], old[0]]);
  assert.equal(before[1].v, 2);
  for (const keys of [[1, 1], [0, -0], [new Date(0), new Date(0)], [["a", 1], ["a", 1]], Array(1)]) {
    assert.throws(() => uniqueReferenceKeys(keys));
  }
  assert.doesNotThrow(() => uniqueReferenceKeys([1, "1", 1n]));
});

test("generated reference labels preserve only explicit correspondence and never reuse deletions", () => {
  const original = referenceAllocation([], 0, [null, null, null]);
  assert.deepEqual(original, { keys: [0, 1, 2], next: 3 });
  const old = structuredClone(original);
  const changed = referenceAllocation(original.keys, original.next, [2, 0, null]);
  assert.deepEqual(changed, { keys: [2, 0, 3], next: 4 });
  const emptied = referenceAllocation(changed.keys, changed.next, []);
  assert.deepEqual(referenceAllocation(emptied.keys, emptied.next, [null]), { keys: [4], next: 5 });
  assert.deepEqual(referenceAllocation(original.keys, original.next, [null, null, null]),
    { keys: [3, 4, 5], next: 6 });
  assert.deepEqual(original, old);
});

test("invalid correspondence and token exhaustion reject atomically", () => {
  const keys = Object.freeze([0, 2]);
  for (const map of [[0, 0], [2], [-1], [0.5], [undefined], Array(1), ["0"], Array(10001).fill(null)]) {
    assert.throws(() => referenceAllocation(keys, 3, map));
    assert.deepEqual(keys, [0, 2]);
  }
  for (const next of [-1, 2, 1.5, Infinity]) assert.throws(() => referenceAllocation(keys, next, []));
  assert.throws(() => referenceAllocation([0, 0], 2, []));
  assert.throws(() => referenceAllocation([1], 1, []));
  assert.throws(() => referenceAllocation([], Number.MAX_SAFE_INTEGER, [null]));
  assert.deepEqual(referenceAllocation([], Number.MAX_SAFE_INTEGER - 1, [null]),
    { keys: [Number.MAX_SAFE_INTEGER - 1], next: Number.MAX_SAFE_INTEGER });
});
