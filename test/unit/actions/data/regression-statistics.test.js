import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../../src/persistence/codec.js";
import { referenceLinearStatistics } from "../../../oracles/regression-statistics.js";

const rows = Object.freeze([{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 4 }].map(Object.freeze));
function fit(values = rows, options = {}) {
  return chart().createData({ id: "raw", values })
    .createRegressionData({ id: "fit", x: "x", y: "y", ...options });
}
const statistics = program => program.createRegressionStatisticsData({ id: "statistics", source: "fit" });
const dataset = (program, id) => program.semanticSpec.datasets.find(row => row.id === id);
const currentStatistics = program => dataset(program, program.materializationConfigs.data.regressionStatistics.statistics.current);
function close(actual, expected) {
  for (const [key, value] of Object.entries(expected)) {
    if (typeof value === "number") assert.ok(Math.abs(actual[key] - value) <= 1e-13 * Math.max(1, Math.abs(value)), key);
    else assert.deepEqual(actual[key], value);
  }
}
function tamper(program, change) {
  const snapshot = JSON.parse(serializeProgram(program));
  const state = decodeValue(snapshot.payload); change(state); snapshot.payload = encodeValue(state);
  return JSON.stringify(snapshot);
}

test("statistics expose independent observed linear coefficients and R-squared rather than prediction-row counts", () => {
  const reference = referenceLinearStatistics(rows);
  assert.equal(reference.count, 3); assert.equal(reference.slope, 1.5);
  assert.ok(Math.abs(reference.intercept - 5 / 6) < 1e-15);
  assert.equal(reference.rSquared, 27 / 28);
  const parent = fit(rows, { predict: { domain: [-1, 4], steps: 101 } });
  const before = serializeProgram(parent);
  const program = statistics(parent);
  const output = dataset(program, "statistics");
  assert.equal(dataset(program, "fit").values.length, 101);
  close(output.values[0], reference);
  assert.deepEqual(Object.keys(output.values[0]), ["count", "intercept", "slope", "rSquared"]);
  assert.deepEqual(output.transform, [{ type: "regressionStatistics" }]);
  assert.equal(output.source, "fit");
  assert.deepEqual(program.materializationConfigs.regressionFits.fit,
    { version: 1, method: "linear", groups: [output.values[0]] });
  assert.deepEqual(program.trace.children.at(-1).children.map(node => node.op),
    ["createDerivedData", "materializeRegressionStatisticsData"]);
  assert.equal(serializeProgram(parent), before);
  assert.deepEqual(deserializeProgram(serializeProgram(program)).semanticSpec, program.semanticSpec);
});

test("statistics preserve typed first-seen groups, eligible missing-pair counts and constant-response null", () => {
  const values = [
    { group: "same", x: 0, y: 4 }, { group: false, x: 0, y: 1 },
    { group: "same", x: 1, y: 4 }, { group: false, x: 1, y: 3 },
    { group: "drop", x: null, y: 2 }, { group: "false", x: 0, y: 2 },
    { group: "false", x: 1, y: 4 }
  ];
  const program = statistics(fit(values, { interval: false, missing: "drop", groupBy: "group" }));
  assert.deepEqual(dataset(program, "statistics").values, [
    { group: "same", count: 2, intercept: 4, slope: 0, rSquared: null },
    { group: false, count: 2, intercept: 1, slope: 2, rSquared: 1 },
    { group: "false", count: 2, intercept: 2, slope: 2, rSquared: 1 }
  ]);
  const constant = statistics(fit([{ x: 0, y: 4 }, { x: 1, y: 4 }], { interval: false }));
  assert.deepEqual(dataset(constant, "statistics").values, [{ count: 2, intercept: 4, slope: 0, rSquared: null }]);
  const schema = dataset(constant, "statistics").schema.fields.find(field => field.name === "rSquared");
  assert.equal(schema.storageType, "number"); assert.equal(schema.nullable, true);
  assert.deepEqual(program.semanticSpec.datasets[0].values, values);
});

test("statistics reject missing, unsupported and colliding fit sources without mutating the parent", () => {
  for (const options of [{ method: "polynomial", degree: 1 }, { method: "loess" }, { method: "exp" }]) {
    const parent = fit(rows, options), before = serializeProgram(parent);
    assert.throws(() => statistics(parent), /only supports linear/);
    assert.equal(serializeProgram(parent), before);
  }
  const parent = fit(); const before = serializeProgram(parent);
  for (const args of [{ id: "bad" }, { id: "bad", source: "raw" }, { id: "bad", source: "absent" },
    { id: "bad", source: "fit", aliases: {} }]) assert.throws(() => parent.createRegressionStatisticsData(args));
  assert.equal(serializeProgram(parent), before);
  for (const groupBy of ["count", "intercept", "slope", "rSquared"]) {
    const colliding = fit(rows.map(row => ({ ...row, [groupBy]: "A" })), { groupBy });
    assert.throws(() => statistics(colliding), /collides/);
    assert.doesNotThrow(() => deserializeProgram(serializeProgram(colliding)));
  }
  assert.equal(typeof basicChart().createRegressionStatisticsData, "undefined");
  assert.equal(typeof basicChart().editRegressionStatisticsData, "undefined");
});

test("cached fits are reused and old snapshots materialize the missing cache exactly once on explicit request", t => {
  const prototype = Object.getPrototypeOf(chart());
  const original = prototype.materializeRegressionData;
  let calls = 0;
  t.mock.method(prototype, "materializeRegressionData", function (args) { calls += 1; return original.call(this, args); });
  const parent = fit(); assert.equal(calls, 1);
  const cached = statistics(parent); assert.equal(calls, 1);
  cached.createRegressionStatisticsData({ id: "another", source: "fit" }); assert.equal(calls, 1);
  const legacy = deserializeProgram(tamper(parent, state => { delete state.materializationConfigs.regressionFits; }));
  assert.equal(calls, 1); assert.equal(legacy.materializationConfigs.regressionFits, undefined);
  assert.throws(() => legacy.createRegressionStatisticsData({ id: "fit", source: "fit" }), /already exists/);
  assert.equal(calls, 1);
  const result = statistics(legacy); assert.equal(calls, 2);
  result.createRegressionStatisticsData({ id: "another", source: "fit" }); assert.equal(calls, 2);
  assert.deepEqual(dataset(result, "fit"), dataset(parent, "fit"));
  assert.equal(legacy.materializationConfigs.regressionFits, undefined);
});

test("statistics source edits and source revisions replay dependent annotation data and clean old caches", () => {
  let program = statistics(fit()).createCanvas({ width: 400, height: 300, margin: 50 })
    .createTextMark({ id: "annotation", data: "statistics" })
    .encodeX({ datum: 1, scale: { domain: [0, 2] } })
    .encodeY({ datum: 1, scale: { domain: [0, 2] } }).encodeText({ field: "slope" });
  program = program.createRegressionData({ id: "otherFit", source: "raw", x: "x", y: "y", interval: false });
  const before = serializeProgram(program);
  const edited = program.editRegressionStatisticsData({ source: "otherFit" });
  assert.equal(currentStatistics(edited).source, "otherFit");
  assert.equal(dataset(edited, "statistics"), undefined);
  assert.equal(edited.semanticSpec.layers[0].data, currentStatistics(edited).id);
  assert.equal(edited.graphicSpec.objects.annotation.items[0].properties.text, "1.5");
  const revised = program.reviseData({ source: "raw", id: "updated", values: rows.map(row => ({ ...row, y: row.y * 2 })) });
  close(currentStatistics(revised).values[0], { count: 3, slope: 3, intercept: 5 / 3, rSquared: 27 / 28 });
  assert.equal(revised.graphicSpec.objects.annotation.items[0].properties.text, "3");
  assert.equal(revised.materializationConfigs.regressionFits.fit, undefined);
  assert.deepEqual(deserializeProgram(serializeProgram(revised)).graphicSpec, revised.graphicSpec);
  assert.equal(serializeProgram(program), before);
});

test("fit method changes and resource removal enforce the statistics dependency before mutating state", () => {
  const program = statistics(fit()), before = serializeProgram(program);
  assert.throws(() => program.editRegressionData({ target: "fit", method: "exp", dependents: "recompute" }), /linear/);
  assert.throws(() => program.removeData({ id: "fit" }), /live references/);
  assert.equal(serializeProgram(program), before);
  const removed = program.removeData({ id: "statistics" }).removeData({ id: "fit" });
  assert.equal(removed.materializationConfigs.regressionFits?.fit, undefined);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(removed)));
});

test("fit cache snapshots reject orphaned, missing, stale, malformed and misordered statistics", () => {
  const parent = statistics(fit());
  for (const change of [
    state => { delete state.materializationConfigs.regressionFits; },
    state => { state.materializationConfigs.regressionFits.fit.version = 2; },
    state => { state.materializationConfigs.regressionFits.fit.extra = true; },
    state => { state.materializationConfigs.regressionFits.fit.groups[0].count = 101; },
    state => { state.materializationConfigs.regressionFits.fit.groups[0].slope = Infinity; },
    state => { state.materializationConfigs.regressionFits.fit.groups[0].slope = 100; },
    state => { state.semanticSpec.datasets.find(row => row.id === "statistics").values[0].count = 101; },
    state => { state.materializationConfigs.regressionFits.orphan = state.materializationConfigs.regressionFits.fit; }
  ]) assert.throws(() => deserializeProgram(tamper(parent, change)));
  const grouped = statistics(fit(rows.flatMap(row => [{ ...row, group: "A" }, { ...row, group: "B" }]), { groupBy: "group" }));
  assert.throws(() => deserializeProgram(tamper(grouped, state => { state.materializationConfigs.regressionFits.fit.groups.reverse(); })));
});

test("linear statistics stay finite at previously supported extreme ranges without altering predictions", () => {
  for (const values of [
    [{ x: -1e308, y: -1e308 }, { x: 0, y: 0 }, { x: 1e308, y: 1e308 }],
    [{ x: -1, y: 1e-300 }, { x: 0, y: 2e-300 }, { x: 1, y: 3e-300 }],
    [{ x: 0, y: Number.MAX_VALUE / 2 }, { x: 1, y: Number.MAX_VALUE / 2 }]
  ]) {
    const parent = fit(values, { interval: false });
    const program = statistics(parent);
    const result = dataset(program, "statistics").values[0];
    assert.ok(Number.isFinite(result.intercept)); assert.ok(Number.isFinite(result.slope));
    if (values[0].y === 1e-300) {
      assert.ok(Math.abs(result.slope / 1e-300 - 1) < 1e-12);
      assert.ok(Math.abs(result.intercept / 1e-300 - 2) < 1e-12);
    }
    assert.equal(result.rSquared, values.length === 2 ? null : 1);
    assert.deepEqual(dataset(program, "fit"), dataset(parent, "fit"));
    assert.doesNotThrow(() => deserializeProgram(serializeProgram(program)));
  }
});

test("chart-owned regression edits rematerialize dependent statistics and reject unsupported model transitions", () => {
  const program = chart().createCanvas().createData({ values: rows })
    .createRegressionPlot({ x: "x", y: "y", interval: false, guides: false })
    .createRegressionStatisticsData({ id: "statistics", source: "regressionPlotRegressionData" });
  const changed = program.editRegression({ predict: { domain: [-1, 3], steps: 51 } });
  assert.equal(currentStatistics(changed).source, changed.markConfigs.regressionPlot.regression.dataId);
  close(currentStatistics(changed).values[0], referenceLinearStatistics(rows));
  const before = serializeProgram(program);
  assert.throws(() => program.editRegression({ method: "exp" }), /dependent regression statistics/);
  assert.equal(serializeProgram(program), before);
  assert.deepEqual(deserializeProgram(serializeProgram(changed)).graphicSpec, changed.graphicSpec);
});

test("statistics editors require unique ownership and preserve omitted sources", () => {
  const program = statistics(fit());
  assert.deepEqual(currentStatistics(program.editRegressionStatisticsData()).values, currentStatistics(program).values);
  assert.deepEqual(currentStatistics(program.editRegressionStatisticsData({ target: "statistics" })).values, currentStatistics(program).values);
  const ambiguous = program.createRegressionStatisticsData({ id: "otherStats", source: "fit" })
    .createData({ id: "unrelated", values: rows });
  const before = serializeProgram(ambiguous);
  assert.throws(() => ambiguous.editRegressionStatisticsData({ source: "fit" }), /ambiguous/);
  assert.throws(() => program.editRegressionStatisticsData({ source: "raw" }), /regression dataset/);
  assert.throws(() => program.editRegressionStatisticsData({ source: undefined }), /id/);
  assert.equal(serializeProgram(ambiguous), before);
});

test("statistics source edits reject cycles and lazy transform schemas remain source-specific", () => {
  const values = rows.flatMap(row => [1, 2, 3].map(group => ({ ...row, y: row.y * group, group })));
  const program = statistics(fit(values, { groupBy: "group" }))
    .createRegressionData({ id: "dependentFit", source: "statistics", x: "slope", y: "intercept", interval: false });
  const before = serializeProgram(program);
  assert.throws(() => program.editRegressionStatisticsData({ target: "statistics", source: "dependentFit" }), /dependents as source/);
  assert.equal(serializeProgram(program), before);
  const lazy = fit().createDerivedData({ id: "lazy", source: "fit", transform: [{ type: "regressionStatistics" }] });
  assert.deepEqual(dataset(lazy, "lazy").schema.fields.map(field => field.name), ["count", "intercept", "slope", "rSquared"]);
  assert.equal(lazy.materializeRegressionStatisticsData({ id: "lazy" }).semanticSpec.datasets.at(-1).values[0].count, 3);
  assert.throws(() => fit().createDerivedData({ id: "bad", source: "raw", transform: [{ type: "regressionStatistics" }] }), /regression dataset/);
  assert.throws(() => fit().createDerivedData({ id: "bad", source: "fit", transform: [{ type: "regressionStatistics", aliases: {} }] }), /Unknown/);
  const pendingFit = chart().createData({id:"raw",values:rows}).createDerivedData({id:"pendingFit",source:"raw",
    transform:[{type:"regression",method:"linear",x:"x",y:"y",interval:false}]});
  assert.throws(() => pendingFit.createRegressionStatisticsData({id:"bad",source:"pendingFit"}), /materialized/);
});

test("following chart roles and retained facets rebuild statistics from their fit owners", () => {
  const values = rows.flatMap(row => [
    { ...row, z: row.y * 2, group: "A" }, { ...row, z: row.y * 3, group: "B" }
  ]);
  const program = chart().createCanvas().createData({ id: "raw", values })
    .createScatterPlot({ x: "x", y: "y", color: "group", guides: false })
    .createRegression({ interval: false, sourceBinding: "follow" })
    .createRegressionStatisticsData({ id: "statistics", source: "scatterPlotRegressionData" });
  const followed = program.encodeY({ target: "scatterPlot", field: "z" });
  assert.deepEqual(currentStatistics(followed).values.map(row => row.slope), [3, 4.5]);
  assert.deepEqual(deserializeProgram(serializeProgram(followed)).graphicSpec, followed.graphicSpec);
  const statisticsPlot = fit(values, { interval: false, groupBy: "group" })
    .createRegressionStatisticsData({ id: "statistics", source: "fit" })
    .createCanvas().createScatterPlot({ x: "intercept", y: "slope", color: "group", guides: false });
  const faceted = statisticsPlot.facet({ field: "group", guides: { legend: false } });
  assert.equal(faceted.compositionSpec.children.length, 2);
  for (const child of Object.values(faceted.children)) {
    const output = dataset(child, child.semanticSpec.layers[0].data);
    assert.equal(output.transform[0].type, "regressionStatistics");
    assert.equal(output.values.length, 1); assert.equal(output.values[0].count, 3);
    assert.ok(child.materializationConfigs.regressionFits[output.source]);
  }
  assert.deepEqual(deserializeProgram(serializeProgram(faceted)).graphicSpec, faceted.graphicSpec);
});
