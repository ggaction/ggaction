import test from "node:test";
import assert from "node:assert/strict";
import { combineSelectionKeys, normalizeSelectionKeys, normalizeSelectionEmpty } from "../../../src/grammar/selectionSet.js";
import { normalizeMarkSelector, selectMarkItemKeys } from "../../../src/grammar/markSelection.js";
import { MAX_WORK_ITEMS } from "../../../src/core/validation.js";

const previous = Object.freeze(["b", "a", "b", "hidden"]);
const incoming = Object.freeze(["c", "b", "c"]);
for (const [mode, expected] of [
  ["replace", ["c", "b"]], ["add", ["b", "a", "hidden", "c"]],
  ["toggle", ["a", "hidden", "c"]], ["subtract", ["a", "hidden"]], ["intersect", ["b"]]
]) test(`selection ${mode} preserves logical identity and deterministic set order`, () => {
  const actual = combineSelectionKeys(previous, incoming, mode);
  assert.deepEqual(actual, expected);
  assert.ok(Object.isFrozen(actual));
  assert.deepEqual(previous, ["b", "a", "b", "hidden"]);
  assert.deepEqual(incoming, ["c", "b", "c"]);
  assert.deepEqual(combineSelectionKeys([], [], mode), []);
});

test("selection updates preserve duplicates only once and reject malformed own data before executing getters", () => {
  assert.deepEqual(combineSelectionKeys([], ["x"]), ["x"]);
  assert.deepEqual(normalizeSelectionKeys(["__proto__", "constructor", "__proto__"]), ["__proto__", "constructor"]);
  assert.equal(normalizeSelectionEmpty(), "none");
  assert.equal(normalizeSelectionEmpty("all"), "all");
  for (const value of [undefined, null, {}, [1], [null], [""], new Array(1), Object.assign(["x"], {extra: 1})]) {
    assert.throws(() => normalizeSelectionKeys(value));
  }
  for (const value of [null, "", true, "everything"]) assert.throws(() => normalizeSelectionEmpty(value));
  assert.throws(() => combineSelectionKeys([], [], "compose"), /mode/);
  assert.throws(() => combineSelectionKeys(null, []), /array/);
  let calls = 0;
  const input = ["x"];
  Object.defineProperty(input, 0, {enumerable: true, get() { calls++; return "x"; }});
  assert.throws(() => normalizeSelectionKeys(input), /own data/);
  assert.throws(() => normalizeMarkSelector({get items() { calls++; return []; }}), /own data/);
  assert.equal(calls, 0);
  assert.throws(() => combineSelectionKeys(["a".repeat(MAX_WORK_ITEMS / 2)], ["b".repeat(MAX_WORK_ITEMS / 2)]), /update work/);
  const oversized = new Array(MAX_WORK_ITEMS + 1);
  assert.throws(() => normalizeSelectionKeys(oversized), /must not exceed/);
  assert.throws(() => combineSelectionKeys(new Array(MAX_WORK_ITEMS), ["x"]), /update work/);
});

test("logical item selectors distinguish empty state from hidden zero matches", () => {
  const items = ["a", "b", "c"].map(key => ({key, fields: {}, channels: {}, properties: {}}));
  assert.deepEqual(normalizeMarkSelector({items: ["b", "b"]}), {grain: "item", items: ["b"], empty: "none"});
  assert.deepEqual(selectMarkItemKeys(items, {items: ["c", "a"]}), ["a", "c"]);
  assert.deepEqual(selectMarkItemKeys(items, {items: []}), []);
  assert.deepEqual(selectMarkItemKeys(items, {items: [], empty: "all"}), ["a", "b", "c"]);
  assert.deepEqual(selectMarkItemKeys(items, {items: ["hidden"], empty: "all"}), []);
  assert.deepEqual(selectMarkItemKeys([], {items: [], empty: "all"}), []);
  for (const value of [{items: [], field: "x"}, {items: [], rows: {}}, {items: [], grain: "row"}, {empty: "all", field: "x", op: "eq", value: 2}]) assert.throws(() => normalizeMarkSelector(value));
});
