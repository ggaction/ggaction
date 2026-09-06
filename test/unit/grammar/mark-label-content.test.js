import assert from "node:assert/strict";
import test from "node:test";
import { normalizeMarkLabelContent, resolveMarkLabelValues } from "../../../src/grammar/markLabels.js";
import { formatTextValue, validateTextFormat } from "../../../src/grammar/text.js";

function bar(aggregate = "sum", horizontal = false) {
  const category = { field: "category", fieldType: "nominal", scale: "category" };
  const measure = { field: "value", fieldType: "quantitative", scale: "measure", aggregate };
  return { mark: { type: "bar" }, encoding: horizontal ? { x: measure, y: category } : { x: category, y: measure } };
}
function item(category, values, horizontal = false) {
  return { channels: horizontal ? { y: category, x: 0.5, x2: 1 } : { x: category, y: 0.5, y2: 1 },
    members: values.map((value, index) => ({ category, value, order: index })) };
}

test("value content uses final members and canonical aggregates rather than stack endpoints", () => {
  for (const horizontal of [false, true]) {
    const items = [item("A", [1, 1], horizontal), item("B", [3], horizontal)];
    for (const [aggregate, expected] of [["sum", [2, 3]], ["count", [2, 1]], ["mean", [1, 3]],
      [{ op: "quantile", probability: 0.5 }, [1, 3]], [{ op: "first", orderBy: "order" }, [1, 3]]]) {
      assert.deepEqual(resolveMarkLabelValues(bar(aggregate, horizontal), items, { content: "value" }), expected);
    }
    assert.deepEqual(resolveMarkLabelValues(bar("sum", horizontal), items, { content: "category" }), ["A", "B"]);
  }
});

test("shares normalize source values globally or within final categories", () => {
  const source = bar();
  const items = [item("A", [1]), item("A", [3]), item("B", [6]), item("B", [0])];
  const global = resolveMarkLabelValues(source, items, { content: "share" });
  for (const [index, expected] of [0.1, 0.3, 0.6, 0].entries()) assert.ok(Math.abs(global[index] - expected) < 1e-15);
  assert.ok(Math.abs(global.reduce((sum, value) => sum + value, 0) - 1) < 1e-15);
  assert.deepEqual(resolveMarkLabelValues(source, items, { content: "share", normalizeBy: "category" }), [0.25, 0.75, 1, 0]);
  assert.deepEqual(resolveMarkLabelValues(source, [], { content: "share" }), []);
  assert.deepEqual(normalizeMarkLabelContent(source, { content: "share" }), { content: "share", normalizeBy: "source" });
});

test("histogram shares use segment counts and exact bin boundaries", () => {
  const source = { mark: { type: "bar" }, encoding: { x: { bin: {}, field: "value" }, y: { aggregate: "count" } } };
  const items = [
    { channels: { x: 0, x2: 1 }, members: [{}, {}] },
    { channels: { x: 0, x2: 1 }, members: [{}] },
    { channels: { x: 1, x2: 2 }, members: [{}] }
  ];
  assert.deepEqual(resolveMarkLabelValues(source, items, { content: "value" }), [2, 1, 1]);
  assert.deepEqual(resolveMarkLabelValues(source, items, { content: "share", normalizeBy: "category" }), [2 / 3, 1 / 3, 1]);
  assert.throws(() => normalizeMarkLabelContent(source, { content: "category" }), /intervals/);
});

test("arc values distinguish weighted/count sectors, quantitative theta and measured radius", () => {
  const source = { mark: { type: "arc" }, encoding: { theta: { field: "category", fieldType: "nominal", aggregate: "sum", weight: "value" } } };
  const items = [{ channels: { theta: "A" }, members: [{ value: 2 }, { value: 2 }] },
    { channels: { theta: "B" }, members: [{ value: 8 }] }];
  assert.deepEqual(resolveMarkLabelValues(source, items, { content: "category" }), ["A", "B"]);
  assert.deepEqual(resolveMarkLabelValues(source, items, { content: "value" }), [4, 8]);
  const count = { ...source, encoding: { theta: { ...source.encoding.theta, aggregate: "count" } } };
  assert.deepEqual(resolveMarkLabelValues(count, items, { content: "value" }), [2, 1]);
  const numeric = { ...source, encoding: { theta: { field: "value", fieldType: "quantitative" } } };
  assert.deepEqual(resolveMarkLabelValues(numeric, [{ channels: { theta: 9 }, members: [] }], { content: "value" }), [9]);
  assert.throws(() => normalizeMarkLabelContent(numeric, { content: "category" }), /categorical Arc/);
  const radial = { ...source, encoding: { ...source.encoding, radius: { aggregate: "sum" } } };
  assert.deepEqual(resolveMarkLabelValues(radial, [{ channels: { radius: 7 }, members: [] }], { content: "value" }), [7]);
});

test("share conservation survives huge finite values and rejects undefined or negative denominators", () => {
  const source = bar();
  const items = [item("A", [1e308]), item("B", [1e308]), item("C", [5e307])];
  const shares = resolveMarkLabelValues(source, items, { content: "share" });
  assert.deepEqual(shares, [0.4, 0.4, 0.2]);
  assert.equal(shares.reduce((a, b) => a + b), 1);
  for (const value of [-1, null, NaN, Infinity]) {
    assert.throws(() => resolveMarkLabelValues(source, [item("A", [value])], { content: "share" }), /finite non-negative/);
  }
  assert.throws(() => resolveMarkLabelValues(source, [item("A", [0])], { content: "share" }), /denominator must be positive/);
  assert.throws(() => resolveMarkLabelValues(source, [item("A", [0]), item("B", [2])],
    { content: "share", normalizeBy: "category" }), /denominator must be positive/);
});

test("semantic content validation preserves incomplete intent and rejects ambiguous source meaning", () => {
  assert.deepEqual(normalizeMarkLabelContent({ mark: { type: "bar" } }, { content: "value" }), { content: "value" });
  for (const content of ["raw", undefined, {}, null]) assert.throws(() => normalizeMarkLabelContent(bar(), { content }), /Unsupported text content/);
  for (const type of ["point", "rect", "rule", "text", undefined]) {
    assert.throws(() => normalizeMarkLabelContent({ mark: { type } }, { content: "value" }), /Bar or Arc source/);
  }
  assert.throws(() => normalizeMarkLabelContent(undefined, { content: "value" }), /Bar or Arc source/);
  assert.throws(() => normalizeMarkLabelContent(bar(), { content: "value", normalizeBy: "source" }), /only supported/);
  assert.throws(() => normalizeMarkLabelContent(bar(), { content: "share", normalizeBy: "row" }), /Unsupported text normalizeBy/);
  assert.throws(() => normalizeMarkLabelContent({ mark: { type: "arc" } }, { content: "share", normalizeBy: "category" }), /requires a Bar/);
  const ranged = bar(); ranged.encoding.y2 = { fieldType: "quantitative" };
  assert.throws(() => normalizeMarkLabelContent(ranged, { content: "value" }), /Ranged Bar/);
});

test("text percent formats preserve precision and reject overflow", () => {
  for (let precision = 0; precision <= 12; precision += 1) {
    const format = `.${precision}%`;
    assert.equal(validateTextFormat(format), format);
    assert.equal(formatTextValue(0.125, format), `${(12.5).toFixed(precision)}%`);
  }
  for (let precision = 0; precision <= 9; precision += 1) {
    for (const suffix of ["f", "%"]) {
      assert.equal(formatTextValue(0.125, `.0${precision}${suffix}`), formatTextValue(0.125, `.${precision}${suffix}`));
    }
  }
  assert.equal(formatTextValue(null, ".1%"), undefined);
  assert.throws(() => formatTextValue(1e308, ".0%"), /percent format overflow/);
  assert.throws(() => formatTextValue("0.5", ".1%"), /finite number/);
  assert.throws(() => validateTextFormat(".13%"), /at most 12/);
});
