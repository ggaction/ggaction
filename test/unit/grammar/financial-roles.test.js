import assert from "node:assert/strict";
import test from "node:test";
import { resolveOHLCValues } from "../../../src/grammar/ohlc.js";
import { resolveWaterfallValues } from "../../../src/grammar/waterfall.js";

test("OHLC keeps literal high-low and open-close roles for rising falling and doji rows", () => {
  const rows = [
    { key: "up", low: 5, open: 8, close: 12, high: 15 },
    { key: "down", low: -10, open: 2, close: -4, high: 3 },
    { key: "flat", low: 0, open: 0, close: 0, high: 0 }
  ];
  const result = resolveOHLCValues(rows);
  assert.deepEqual(result.items, rows.map((row, sourceIndex) => ({ ...row, sourceIndex, trend: ["up", "down", "flat"][sourceIndex] })));
  assert.deepEqual(result.omittedSourceIndices, []);
  assert.deepEqual(resolveOHLCValues([]), { items: [], omittedSourceIndices: [] });
});

test("OHLC omits complete invalid rows explicitly and retains exact original indexes", () => {
  const good = { key: 1, low: 1, open: 2, close: 3, high: 4 };
  const invalid = [
    { ...good, key: "low", low: 2.5 }, { ...good, key: "high", high: 2.5 },
    { ...good, key: "nan", open: NaN }, { ...good, key: "missing", close: undefined }
  ];
  for (const row of invalid) assert.throws(() => resolveOHLCValues([row]), /low <= min/);
  const result = resolveOHLCValues([invalid[0], good, ...invalid.slice(1)], { invalid: "omit-row" });
  assert.deepEqual(result.items.map(item => [item.key, item.sourceIndex]), [[1, 1]]);
  assert.deepEqual(result.omittedSourceIndices, [0, 2, 3, 4]);
  assert.throws(() => resolveOHLCValues([invalid[0], invalid[0]], { invalid: "omit-row" }), /unique/);
});

test("OHLC validates typed identity and own-data shape even when invalid values are omitted", () => {
  const row = { key: [1, "a"], low: 0, open: 1, close: 2, high: 3 };
  const result = resolveOHLCValues([row, { ...row, key: ["1", "a"] }]);
  row.key[0] = 7; assert.deepEqual(result.items[0].key, [1, "a"]);
  assert.throws(() => { result.items[0].open = 0; }, TypeError);
  for (const invalid of [undefined, null, "skip"]) assert.throws(() => resolveOHLCValues([], { invalid }));
  assert.throws(() => resolveOHLCValues([], { extra: true }), /Unknown/);
  assert.throws(() => resolveOHLCValues([{ ...row, extra: true }], { invalid: "omit-row" }), /Unknown/);
  for (const input of [null, {}, new Array(1), Array.from({ length: 10001 }, () => row)]) assert.throws(() => resolveOHLCValues(input));
  let called = false;
  assert.throws(() => resolveOHLCValues([{ ...row, get high() { called = true; return 3; } }]), /own data/); assert.equal(called, false);
});

test("waterfall literal deltas totals and subtotals retain ordered contribution meaning", () => {
  const input = [
    { key: "a", role: "delta", value: 10 }, { key: "b", role: "delta", value: -4 },
    { key: "subtotal", role: "subtotal" }, { key: "c", role: "delta", value: 3 },
    { key: "total", role: "total" }
  ];
  const result = resolveWaterfallValues(input);
  assert.deepEqual(result.items.map(item => [item.start, item.end, item.runningBefore, item.runningAfter]), [[0, 10, 0, 10], [10, 6, 10, 6], [0, 6, 6, 6], [6, 9, 6, 9], [0, 9, 9, 9]]);
  assert.equal(result.running, 9);
  assert.deepEqual(result.items.map(item => item.key), input.map(row => row.key));
  assert.deepEqual(result.items.map(item => item.sourceIndex), [0, 1, 2, 3, 4]);
  assert.deepEqual(resolveWaterfallValues([]), { items: [], running: 0 });
});

test("waterfall canonical subtotal fixture preserves the independent 5 minus 2 plus 4 total", () => {
  const result = resolveWaterfallValues([
    { key: "a", role: "delta", value: 5 }, { key: "b", role: "delta", value: -2 },
    { key: "subtotal", role: "subtotal" }, { key: "c", role: "delta", value: 4 }, { key: "total", role: "total" }
  ]);
  assert.deepEqual(result.items.map(item => [item.start, item.end]), [[0, 5], [5, 3], [0, 3], [3, 7], [0, 7]]);
  assert.equal(result.running, 7);
});

test("waterfall totals can state an independent explicit total and only reset changes accumulation", () => {
  const result = resolveWaterfallValues([
    { key: 1, role: "delta", value: -5 }, { key: 2, role: "total", value: 100 },
    { key: 3, role: "delta", value: 2 }, { key: 4, role: "subtotal", reset: true },
    { key: 5, role: "delta", value: 7 }, { key: 6, role: "total", value: -20, reset: true },
    { key: 7, role: "delta", value: 0 }, { key: 8, role: "total", reset: false }
  ]);
  assert.deepEqual(result.items.map(item => [item.start, item.end, item.runningAfter]), [[0, -5, -5], [0, 100, -5], [-5, -3, -3], [0, -3, 0], [0, 7, 7], [0, -20, 0], [0, 0, 0], [0, 0, 0]]);
  assert.equal(result.running, 0);
});

test("waterfall requires explicit roles and rejects overflow or malformed input without altering rows", () => {
  const row = { key: [1, "a"], role: "delta", value: 2 }, rows = [row], before = structuredClone(rows);
  const result = resolveWaterfallValues(rows);
  assert.deepEqual(rows, before); row.key[0] = 4; assert.deepEqual(result.items[0].key, [1, "a"]);
  assert.throws(() => { result.items[0].end = 0; }, TypeError);
  for (const invalid of [
    { key: "x", value: 1 }, { key: "x", role: "other", value: 1 }, { key: "x", role: "delta" },
    { key: "x", role: "total", value: undefined }, { key: "x", role: "subtotal", value: 1 },
    { key: "x", role: "delta", value: 1, reset: false }, { key: "x", role: "total", reset: 0 },
    { key: "x", role: "delta", value: Infinity }, { key: "x", role: "delta", value: 1, extra: true }
  ]) assert.throws(() => resolveWaterfallValues([invalid]));
  assert.throws(() => resolveWaterfallValues([row, row]), /unique/);
  assert.throws(() => resolveWaterfallValues([{ key: 1, role: "delta", value: Number.MAX_VALUE }, { key: 2, role: "delta", value: Number.MAX_VALUE }]), /not finite at item 1/);
  for (const input of [null, {}, new Array(1), Array.from({ length: 10001 }, () => row)]) assert.throws(() => resolveWaterfallValues(input));
  let called = false;
  assert.throws(() => resolveWaterfallValues([{ key: 1, role: "delta", get value() { called = true; return 1; } }]), /own data/); assert.equal(called, false);
});

test("waterfall signed delta endpoints satisfy the independent conservation recurrence", () => {
  const input = Array.from({ length: 101 }, (_, index) => ({ key: index, role: "delta", value: (index % 11) - 5 }));
  const result = resolveWaterfallValues(input);
  assert.equal(result.running, input.reduce((sum, row) => sum + row.value, 0));
  for (const [index, item] of result.items.entries()) {
    assert.equal(item.end - item.start, input[index].value);
    assert.equal(item.start, index ? result.items[index - 1].end : 0);
  }
  assert.deepEqual(result, resolveWaterfallValues(input));
});
