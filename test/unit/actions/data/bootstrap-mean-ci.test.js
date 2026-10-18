import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { deriveSummaryRows, normalizeSummaryTransform } from "../../../../src/grammar/summary.js";
import { validateBootstrapDrawCount } from "../../../../src/grammar/statistics/confidenceInterval.js";

const groups = [[0, 0, 1, 2, 30], [1, 2, 2, 3, 35], [0, 1, 4, 5, 40], [2, 3, 5, 8, 45], [1, 2, 6, 10, 50]];
const rows = groups.flatMap((values, group) => values.map(value => ({ group, value })));
const method = { type: "bootstrap", seed: 1 };
const lower = (as = "lower", options = {}) => ({ field: "value", op: { op: "ciLower", method, ...options }, as });
const upper = (as = "upper", options = {}) => ({ field: "value", op: { op: "ciUpper", method, ...options }, as });
const aggregates = [{ field: "value", op: "mean", as: "mean" }, lower(), upper()];
const expected = [
  { group: 0, mean: 6.6, lower: 0.4, upper: 18.4 },
  { group: 1, mean: 8.6, lower: 1.6, upper: 22 },
  { group: 2, mean: 10, lower: 1.2, upper: 25.2 },
  { group: 3, mean: 12.6, lower: 3.2, upper: 29.2 },
  { group: 4, mean: 13.8, lower: 2.2, upper: 31.6 }
];
function summary(values = rows, outputs = aggregates) {
  return chart().createData({ id: "raw", values }).createSummaryData({ id: "result", groupBy: "group", aggregates: outputs });
}
const values = p => p.semanticSpec.datasets.find(dataset => dataset.id === "result").values;

test("matches independent asymmetric percentile endpoints and persists normalized method provenance", () => {
  const p = summary();
  assert.deepEqual(values(p), expected);
  assert.deepEqual(values(summary()), expected);
  const transform = p.semanticSpec.datasets.find(dataset => dataset.id === "result").transform[0];
  assert.deepEqual(transform.aggregates[1].op.method, { type: "bootstrap", seed: 1, samples: 1000 });
  assert.equal(transform.aggregates[1].op.level, 0.95);
  assert.deepEqual(p.semanticSpec.datasets[0].values, rows);
  assert.deepEqual(values(deserializeProgram(serializeProgram(p))), expected);
});

test("shares streams across endpoint/output order and multiple levels without extra draws", () => {
  const reversed = values(summary(rows, [upper(), lower()]));
  assert.deepEqual(reversed, expected.map(({ mean: _, ...row }) => row));
  const only = values(summary(rows, [lower()]));
  assert.deepEqual(only, expected.map(({ group, lower }) => ({ group, lower })));
  const multiple = values(summary(rows, [upper("high80", { level: 0.8 }), lower(), upper(), lower("low80", { level: 0.8 })]));
  multiple.forEach((row, i) => {
    assert.equal(row.lower, expected[i].lower);
    assert.equal(row.upper, expected[i].upper);
    assert.ok(row.low80 >= row.lower);
    assert.ok(row.high80 <= row.upper);
  });
});

test("keeps independent streams for fields, seeds and sample counts", () => {
  const input = rows.map(row => ({ ...row, other: row.value * 2 }));
  const alternate = { field: "other", op: { op: "ciLower", method }, as: "otherLower" };
  const seed2 = lower("seed2", { method: { ...method, seed: 2 } });
  const few = lower("few", { method: { ...method, samples: 7 } });
  const first = values(summary(input, [lower(), alternate, seed2, few]));
  const last = values(summary(input, [few, seed2, alternate, lower()]));
  assert.deepEqual(first, last);
  first.forEach((row, i) => {
    assert.equal(row.lower, expected[i].lower);
    assert.equal(row.otherLower, row.lower * 2);
  });
  assert.notDeepEqual(first.map(row => row.seed2), expected.map(row => row.lower));
});

test("preserves row/group traversal and consumes singleton samples while empty groups consume none", () => {
  const baseline = values(summary(rows));
  const reordered = values(summary([...rows].reverse()));
  assert.deepEqual(reordered.map(row => row.group), [4, 3, 2, 1, 0]);
  assert.notDeepEqual(reordered, [...baseline].reverse());
  const singleton = values(summary([{ group: "single", value: 7 }, ...rows]));
  assert.deepEqual(singleton[0], { group: "single", mean: 7, lower: 7, upper: 7 });
  assert.notDeepEqual(singleton.slice(1), baseline);
  const missing = values(summary([{ group: "empty", value: null }, ...rows]));
  assert.deepEqual(missing[0], { group: "empty", mean: undefined, lower: undefined, upper: undefined });
  assert.deepEqual(missing.slice(1), baseline);
  assert.deepEqual(deriveSummaryRows([], normalizeSummaryTransform({ groupBy: "group", aggregates })), []);
  assert.deepEqual(deriveSummaryRows([], normalizeSummaryTransform({ aggregates })), [{ mean: undefined, lower: undefined, upper: undefined }]);
});

test("uses the same mean bootstrap in interval data with the existing decimal output boundary", () => {
  const p = chart().createData({ values: rows }).createIntervalData({
    id: "result", field: "value", groupBy: "group", method,
    as: { center: "mean", lower: "lower", upper: "upper" }
  });
  assert.deepEqual(values(p), expected);
  const one = chart().createData({ values: [{ value: 9 }] }).createIntervalData({ id: "result", field: "value", method });
  assert.deepEqual(Object.values(values(one)[0]), [9, 9, 9]);
});

test("validates seed/sample endpoints, unknown method keys, unsupported consumers and atomicity", () => {
  const base = chart().createData({ values: rows });
  const snapshot = serializeProgram(base);
  for (const bad of [
    "bootstrap", { type: "bootstrap" }, { ...method, seed: 0 }, { ...method, seed: -1 },
    { ...method, seed: 1.5 }, { ...method, seed: 2147483647 }, { ...method, seed: "1" },
    { ...method, samples: null }, { ...method, samples: 0 }, { ...method, samples: 10001 }, { ...method, samples: 1.5 },
    { ...method, extra: true }, { type: "other", seed: 1 }
  ]) {
    assert.throws(() => base.createSummaryData({ id: "result", aggregates: [lower("lower", { method: bad })] }));
    assert.throws(() => base.createIntervalData({ id: "result", field: "value", method: bad }));
  }
  assert.throws(() => base.createSummaryData({ id: "result", aggregates, weight: { field: "value", kind: "frequency" } }), /weight/);
  assert.throws(() => base.createIntervalData({ id: "result", field: "value", center: "median", extent: "iqr", method }));
  assert.throws(() => base.createRegressionData({ id: "result", x: "group", y: "value", confidenceMethod: method }));
  assert.equal(serializeProgram(base), snapshot);
  assert.equal(basicChart().createSummaryData, undefined);
  assert.equal(basicChart().createIntervalData, undefined);
  const minimum = values(summary(rows, [lower("lower", { method: { ...method, samples: 1, seed: 2147483646 } })]));
  assert.equal(minimum.length, 5);
});

test("preflights the action draw limit, deduplicates bounds/levels and retains raw source immutability", () => {
  assert.doesNotThrow(() => validateBootstrapDrawCount(50000000));
  assert.throws(() => validateBootstrapDrawCount(50000001), /50000000/);
  const huge = Array.from({ length: 5001 }, () => ({ group: "A", value: 1 }));
  const base = chart().createData({ values: huge });
  const before = serializeProgram(base);
  const big = lower("lower", { method: { ...method, samples: 10000 } });
  assert.throws(() => base.createSummaryData({ id: "result", aggregates: [big] }), /50000000/);
  assert.equal(serializeProgram(base), before);
  const admitted = values(summary(huge.slice(1), [big, upper("upper", { method: big.op.method }), lower("low80", { method: big.op.method, level: 0.8 })]));
  assert.deepEqual(admitted, [{ group: "A", lower: 1, upper: 1, low80: 1 }]);
});

test("supports immutable focused edits, source revisions and rematerialization", () => {
  const p = summary();
  const revised = p.reviseData({ source: "raw", id: "updated", values: rows.map(row => ({ ...row, value: row.value * 2 })) });
  const revisedRows = revised.semanticSpec.datasets.find(dataset => dataset.transform?.[0]?.type === "summary" && dataset.source === "updated").values;
  assert.deepEqual(revisedRows, expected.map(row => ({ ...row, mean: row.mean * 2, lower: row.lower * 2, upper: row.upper * 2 })));
  assert.deepEqual(values(p), expected);
  const edited = p.editSummaryData({ target: "result", aggregates: [lower("lower", { method: { ...method, seed: 2 } })] });
  const current = edited.semanticSpec.datasets.find(dataset => dataset.transform?.[0]?.type === "summary" && dataset.id !== "result");
  assert.ok(current);
  assert.notDeepEqual(current.values.map(row => row.lower), expected.map(row => row.lower));
});

test("normalizes raw transform evaluation without changing caller-owned definitions", () => {
  const transform = { type: "summary", groupBy: ["group"], aggregates };
  const snapshot = JSON.stringify(transform);
  assert.deepEqual(deriveSummaryRows(rows, transform), expected);
  assert.equal(JSON.stringify(transform), snapshot);
  assert.deepEqual(deriveSummaryRows(rows, normalizeSummaryTransform(transform)), expected);
});


test("edits interval seeds and recomputes interval data from source revisions", () => {
  const p = chart().createData({ id: "raw", values: rows }).createIntervalData({
    id: "result", field: "value", groupBy: "group", method,
    as: { center: "mean", lower: "lower", upper: "upper" }
  });
  const before = serializeProgram(p);
  const edited = p.editIntervalData({ target: "result", method: { type: "bootstrap", seed: 2 } });
  const revision = edited.semanticSpec.datasets.find(dataset => dataset.transform?.[0]?.type === "interval" && dataset.id !== "result");
  assert.ok(revision);
  assert.notDeepEqual(revision.values, expected);
  assert.deepEqual(deserializeProgram(serializeProgram(edited)).semanticSpec, edited.semanticSpec);
  assert.equal(serializeProgram(p), before);
  const revised = p.reviseData({ source: "raw", id: "updated", values: rows.map(row => ({ ...row, value: row.value * 2 })) });
  const current = revised.semanticSpec.datasets.find(dataset => dataset.transform?.[0]?.type === "interval" && dataset.source === "updated");
  assert.deepEqual(current.values, expected.map(row => ({ ...row, mean: row.mean * 2, lower: row.lower * 2, upper: row.upper * 2 })));
});
