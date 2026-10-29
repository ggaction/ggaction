import test from "node:test";
import assert from "node:assert/strict";
import { normalizeOHLCPlot, validateOHLCBinding, readOHLCItems } from "../../../src/grammar/ohlcPlot.js";
const make = patch => normalizeOHLCPlot({ open: "o", close: "c", ...patch });
const layer = binding => ({ id: "prices", mark: { type: "ohlc" }, ohlc: binding, encoding: {
  x: { field: "day", fieldType: "nominal", scale: "x" }, y: { field: "l", fieldType: "quantitative", scale: "y" }, y2: { field: "h", fieldType: "quantitative", scale: "y" }
} });
test("OHLC plot keeps field meaning and appearance in separate canonical owners", () => {
  const state = make({ labels: { content: "high", fontSize: 14 }, width: { pixels: 8 } });
  assert.deepEqual(state.binding, { open: "o", close: "c", invalid: "error", doji: "line", labels: { content: "high", format: "auto" } });
  assert.equal(state.config.labels.fontSize, 14); assert.equal(state.binding.width, undefined);
  assert.ok(Object.isFrozen(state.config.body)); validateOHLCBinding(layer(state.binding), state.config);
  const edited = normalizeOHLCPlot({ labels: false, doji: "none" }, state.binding, state.config);
  assert.equal(edited.config.labels, false); assert.deepEqual(edited.config.width, { pixels: 8 });
  assert.equal(state.binding.doji, "line");
});
test("OHLC plot delegates whole-row eligibility and typed keys to the price kernel", () => {
  const state = make({ invalid: "omit-row" });
  const dataset = { values: [{ l: 1, h: 8, o: 3, c: 6 }, { l: 9, h: 2, o: 3, c: 1 }, { l: -4, h: -1, o: -2, c: -2 }], rowKeys: [1, "1", "flat"] };
  const result = readOHLCItems(dataset, layer(state.binding));
  assert.deepEqual(result.items.map(item => [item.key, item.sourceIndex, item.trend]), [[1, 0, "up"], ["flat", 2, "flat"]]);
  assert.deepEqual(result.omittedSourceIndices, [1]);
});
test("OHLC plot rejects malformed options and stored price-scale disagreement", () => {
  for (const patch of [{ open: null }, { close: undefined }, { invalid: "skip" }, { doji: "rect" }, { width: { band: 0 } }, { width: { pixels: 2, band: 1 } }, { body: { fill: "red" } }, { stem: { strokeWidth: -1 } }, { labels: { content: "x" } }, { labels: { offset: -1 } }, { clip: 1 }]) assert.throws(() => make(patch));
  const state = make({});
  assert.throws(() => validateOHLCBinding({ ...layer(state.binding), encoding: { ...layer(state.binding).encoding, y2: { field: "h", fieldType: "quantitative", scale: "other" } } }, state.config), /one quantitative/);
  assert.throws(() => validateOHLCBinding(layer(state.binding), { ...state.config, extra: true }), /extra/);
});
