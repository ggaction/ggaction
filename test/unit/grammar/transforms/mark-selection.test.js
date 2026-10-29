import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeMarkSelector,
  selectMarkItemKeys
} from "../../../../src/grammar/markSelection.js";

function item(key, value, group = "all", channel = value) {
  return {
    key,
    fields: { value, group },
    channels: { x: channel },
    properties: { height: channel / 2 }
  };
}

const numericItems = Object.freeze([
  item("a", 2, "A", 20),
  item("b", 7, "A", 70),
  item("c", 7, "A", 71),
  item("d", 3, "B", 30),
  item("e", 9, "B", 90),
  item("missing", undefined, "B", undefined)
]);

test("normalizes comparison, set, range, and rank selectors immutably", () => {
  const values = [2, 7];
  const oneOf = normalizeMarkSelector({
    field: "value",
    op: "oneOf",
    values
  });
  values.push(9);
  assert.deepEqual(oneOf, {
    grain: "item",
    field: "value",
    op: "oneOf",
    values: [2, 7]
  });
  assert.equal(Object.isFrozen(oneOf.values), true);
  assert.deepEqual(
    normalizeMarkSelector({ channel: "x", op: "range", min: 10, max: 20 }),
    { grain: "item", channel: "x", op: "range", min: 10, max: 20, inclusive: true }
  );
  assert.deepEqual(
    normalizeMarkSelector({ field: "value", op: "max", groupBy: "group" }),
    {
      grain: "item",
      field: "value",
      op: "max",
      count: 1,
      groupBy: ["group"],
      ties: "first"
    }
  );
});

test("selects every comparison operator without coercion", () => {
  assert.deepEqual(
    selectMarkItemKeys(numericItems, { field: "value", op: "eq", value: 7 }),
    ["b", "c"]
  );
  assert.deepEqual(
    selectMarkItemKeys(numericItems, { field: "value", op: "neq", value: 7 }),
    ["a", "d", "e"]
  );
  assert.deepEqual(
    selectMarkItemKeys(numericItems, { field: "value", op: "gt", value: 3 }),
    ["b", "c", "e"]
  );
  assert.deepEqual(
    selectMarkItemKeys(numericItems, { field: "value", op: "gte", value: 7 }),
    ["b", "c", "e"]
  );
  assert.deepEqual(
    selectMarkItemKeys(numericItems, { field: "value", op: "lt", value: 7 }),
    ["a", "d"]
  );
  assert.deepEqual(
    selectMarkItemKeys(numericItems, { field: "value", op: "lte", value: 3 }),
    ["a", "d"]
  );
  assert.deepEqual(
    selectMarkItemKeys(numericItems, { field: "value", op: "eq", value: "7" }),
    []
  );
});

test("selects set and inclusive or exclusive ranges from fields and channels", () => {
  assert.deepEqual(
    selectMarkItemKeys(numericItems, {
      field: "value",
      op: "oneOf",
      values: [2, 9]
    }),
    ["a", "e"]
  );
  assert.deepEqual(
    selectMarkItemKeys(numericItems, {
      field: "value",
      op: "range",
      min: 3,
      max: 7
    }),
    ["b", "c", "d"]
  );
  assert.deepEqual(
    selectMarkItemKeys(numericItems, {
      channel: "x",
      op: "range",
      min: 20,
      max: 70,
      inclusive: false
    }),
    ["d"]
  );
  assert.deepEqual(
    selectMarkItemKeys(numericItems, {
      property: "height",
      op: "max"
    }),
    ["e"]
  );
});

test("ranks deterministically with count, groups, ties, and stable item order", () => {
  assert.deepEqual(
    selectMarkItemKeys(numericItems, { field: "value", op: "min", count: 2 }),
    ["a", "d"]
  );
  assert.deepEqual(
    selectMarkItemKeys(numericItems, { field: "value", op: "max", count: 2 }),
    ["e", "b"]
  );
  assert.deepEqual(
    selectMarkItemKeys(numericItems, {
      field: "value",
      op: "max",
      groupBy: "group"
    }),
    ["b", "e"]
  );
  assert.deepEqual(
    selectMarkItemKeys(numericItems, {
      field: "value",
      op: "max",
      count: 2,
      groupBy: ["group"],
      ties: "all"
    }),
    ["b", "c", "e", "d"]
  );
});

test("supports string ranking and excludes mixed or missing ordered values", () => {
  const items = [
    item("first", "beta"),
    item("second", 99),
    item("third", "alpha"),
    item("fourth", undefined)
  ];
  assert.deepEqual(
    selectMarkItemKeys(items, { field: "value", op: "min" }),
    ["third"]
  );
  assert.deepEqual(
    selectMarkItemKeys([], { field: "value", op: "max" }),
    []
  );
});

test("rejects invalid selectors and item contracts before returning keys", () => {
  const invalid = [
    [{ op: "eq", value: 1 }, /exactly one/],
    [{ field: "value", channel: "x", op: "eq", value: 1 }, /exactly one/],
    [{ field: "value", property: "height", op: "eq", value: 1 }, /exactly one/],
    [{ channel: "unknown", op: "eq", value: 1 }, /Unknown selector channel/],
    [{ property: "length", op: "eq", value: 1 }, /Unknown selector graphic property/],
    [{ grain: "row", field: "value", op: "eq", value: 1 }, /Unknown mark selector grain/],
    [{ field: "value", op: "unknown", value: 1 }, /Unknown mark selector operator/],
    [{ field: "value", op: "eq" }, /requires value/],
    [{ field: "value", op: "gt", value: Infinity }, /finite number or string/],
    [{ field: "value", op: "oneOf", values: "A" }, /must be an array/],
    [{ field: "value", op: "range", min: 1, max: "2" }, /one type/],
    [{ field: "value", op: "range", min: 3, max: 2 }, /must not exceed/],
    [{ field: "value", op: "max", count: 0 }, /positive integer/],
    [{ field: "value", op: "max", ties: "random" }, /Unknown selector ties/],
    [{ field: "value", op: "eq", value: 1, count: 2 }, /does not accept/],
    [{ field: "value", op: "max", groupBy: [] }, /at least one/],
    [{ field: "value", op: "max", groupBy: ["group", "group"] }, /unique/]
  ];
  for (const [selector, error] of invalid) {
    assert.throws(() => normalizeMarkSelector(selector), error);
  }
  assert.throws(
    () => selectMarkItemKeys([item("same", 1), item("same", 2)], {
      field: "value",
      op: "max"
    }),
    /Duplicate selectable mark item key/
  );
});


test("logical representation selection preserves current keys and rejects malformed producer aliases", () => {
  const current = [{ ...item("state", 3), representationKeys: ["state", "county-a", "county-b"] }, item("other", 1)];
  const saved = structuredClone(current);
  assert.deepEqual(selectMarkItemKeys(current, { items: ["county-b"] }), ["state"]);
  assert.deepEqual(selectMarkItemKeys(current, { items: ["state", "county-a"] }), ["state"]);
  assert.deepEqual(selectMarkItemKeys(current, { items: ["missing"] }), []);
  assert.deepEqual(selectMarkItemKeys(current, { items: [], empty: "all" }), ["state", "other"]);
  assert.deepEqual(current, saved);
  for (const aliases of [["a", "a"], [""], [null], "a"]) {
    assert.throws(() => selectMarkItemKeys([{ ...item("state", 3), representationKeys: aliases }], { items: ["state"] }));
  }
  assert.throws(() => selectMarkItemKeys([{ ...item("state", 3), representationKeys: ["a".repeat(10_000_001)] }], { items: ["state"] }), RangeError);
});


test("selection producers reject invalid item collections before resolving matching keys", () => {
  for (const items of [null, {}, [null], [42], [{ ...item("a", 1), key: "" }], [{ ...item("a", 1), fields: null }], [{ ...item("a", 1), channels: [] }], [{ ...item("a", 1), properties: null }]]) {
    assert.throws(() => selectMarkItemKeys(items, { items: ["a"] }), TypeError);
  }
  const aliases = ["a".repeat(5_000_000)];
  assert.throws(() => selectMarkItemKeys([{ ...item("first", 1), representationKeys: aliases }, { ...item("second", 1), representationKeys: aliases }], { items: ["first"] }), /Selectable representation work/);
});
