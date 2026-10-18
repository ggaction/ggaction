import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

const observations = [1, 1.0000000000001, 1.0000000000002,
  1.0000000000003, 1.0000000000004];
const rows = observations.map(value => ({ group: "a", x: 0, value }));
const method = Object.freeze({ type: "bootstrap", seed: 1 });
const outputs = Object.freeze({ center: "mean", lower: "lower", upper: "upper" });
// Literal independent resampling/R7 regression values, not rounded expectations.
const expected = { group: "a", mean: 1.0000000000002,
  lower: 1.00000000000008, upper: 1.0000000000003397 };
const interval = (source, options = {}) => source.createIntervalData({
  id: "result", field: "value", groupBy: "group", method, as: outputs, ...options
});
const derived = program => program.semanticSpec.datasets.find(dataset => dataset.id === "result");
const summary = values => chart().createData({ values }).createSummaryData({
  id: "summary", groupBy: "group", aggregates: [
    { field: "value", op: "mean", as: "mean" },
    { field: "value", op: { op: "ciLower", method }, as: "lower" },
    { field: "value", op: { op: "ciUpper", method }, as: "upper" }
  ]
}).semanticSpec.datasets.at(-1).values;

test("preserves literal small-span bootstrap bounds around a unit-sized center", () => {
  const source = chart().createData({ id: "raw", values: rows });
  const before = serializeProgram(source), input = structuredClone(rows);
  const program = interval(source);
  assert.deepEqual(derived(program).values, [expected]);
  assert.ok(expected.lower < expected.mean && expected.mean < expected.upper);
  assert.deepEqual(derived(program).values, summary(rows));
  assert.deepEqual(deserializeProgram(serializeProgram(program)).semanticSpec, program.semanticSpec);
  assert.equal(serializeProgram(source), before);
  assert.deepEqual(rows, input);
});

test("keeps exact bootstrap values under binary scaling and ordered multiple groups", () => {
  for (const factor of [0.5, 2, 1024]) {
    const values = rows.map(row => ({ ...row, value: row.value * factor }));
    const program = interval(chart().createData({ values }));
    assert.deepEqual(derived(program).values, [{ group: "a", mean: expected.mean * factor,
      lower: expected.lower * factor, upper: expected.upper * factor }]);
  }
  const values = [...rows, ...rows.map(row => ({ ...row, group: "b", value: row.value + 5 })),
    { group: "singleton", x: 2, value: 1.0000000000001 }];
  const actual = derived(interval(chart().createData({ values }))).values;
  assert.deepEqual(actual, summary(values));
  assert.deepEqual(actual.map(row => row.group), ["a", "b", "singleton"]);
  assert.ok(actual[0].lower < actual[0].upper);
  assert.ok(actual[1].lower < actual[1].upper);
  assert.deepEqual(actual[2], { group: "singleton", mean: 1.0000000000001,
    lower: 1.0000000000001, upper: 1.0000000000001 });
});

test("recomputes precise intervals after source revisions and focused edits", () => {
  const source = chart().createData({ id: "raw", values: rows }), program = interval(source);
  const before = serializeProgram(program);
  const revised = program.reviseData({ source: "raw", id: "revised", values:
    rows.map(row => ({ ...row, value: row.value * 2 })) });
  const dataset = revised.semanticSpec.datasets.find(dataset => dataset.source === "revised");
  assert.deepEqual(dataset.values, [{ group: "a", mean: expected.mean * 2,
    lower: expected.lower * 2, upper: expected.upper * 2 }]);
  const edited = program.editIntervalData({ target: "result", method: { type: "bootstrap", seed: 2 } });
  const next = edited.semanticSpec.datasets.find(dataset => dataset.source === "raw" && dataset.id !== "result");
  assert.ok(next.values[0].lower < next.values[0].upper);
  assert.deepEqual(deserializeProgram(serializeProgram(edited)).semanticSpec, edited.semanticSpec);
  assert.equal(serializeProgram(program), before);
});

test("interval-backed complete chart facades consume precise positive bounds", () => {
  const source = chart().createCanvas({ width: 400, height: 300, margin: 40 })
    .createData({ values: [...rows, ...rows.map(row => ({ ...row, group: "b", x: 1 }))] });
  for (const program of [
    source.createIntervalPlot({ x: "group", y: { field: "value", method }, guides: false }),
    source.createErrorBand({ x: { field: "x" }, y: { field: "value", method } })
  ]) {
    const dataset = program.semanticSpec.datasets.find(dataset => dataset.transform?.[0]?.type === "interval");
    const as = dataset.transform[0].as, row = dataset.values[0];
    assert.deepEqual([row[as.center], row[as.lower], row[as.upper]],
      [expected.mean, expected.lower, expected.upper]);
    assert.equal(dataset.values.length, 2);
    assert.ok(dataset.values.every(row => row[as.lower] < row[as.upper]));
    assert.ok(Object.keys(program.graphicSpec.objects).length > 0);
  }
});
