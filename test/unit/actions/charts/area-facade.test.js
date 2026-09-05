import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { assertAtomicFailures } from "../../../support/program-state.js";
const rows = [{ time: 1, value: 2, lo: 1, hi: 3 }, { time: 2, value: 4, lo: 6, hi: 2 }, { time: 3, value: 3, lo: 1, hi: 5 }];
const base = () => chart().createCanvas({ width: 1000, height: 700, margin: 150 }).createData({ id: "data", values: rows });

test("shortest Area facade is exactly its lower-level owner chain", () => {
  const before = base();
  const p = before.createAreaPlot({ x: "time", y: "value" });
  const lower = before.createAreaMark({ id: "areaPlot", data: "data", missing: "error" })
    .encodeX({ target: "areaPlot", field: "time" })
    .encodeYRange({ target: "areaPlot", lower: "value", upper: { datum: 0 } })
    .layoutSeries({ target: "areaPlot", mode: "overlay" }).createGuides();
  assert.deepEqual(p.semanticSpec, lower.semanticSpec);
  assert.deepEqual(p.graphicSpec, lower.graphicSpec);
  assert.deepEqual(p.trace.children.at(-1).children.filter(c => ["createAreaMark", "encodeX", "encodeYRange", "layoutSeries", "createGuides"].includes(c.op)).map(c => c.op), ["createAreaMark", "encodeX", "encodeYRange", "layoutSeries", "createGuides"]);
  assert.equal(p.semanticSpec.layers[0].mark.missing, "error");
  assert.deepEqual(p.resolvedScales.y.domain, [0, 4]);
  assert.equal(p.graphicSpec.objects.areaPlot.items[0].properties.opacity, 0.2);
  assert.equal(before.semanticSpec.layers.length, 0);
  assert.throws(() => p.createAreaPlot({ x: "time", y: "value" }), /id/);
});

test("Area facade preserves explicit range roles and horizontal log baselines", () => {
  const ribbon = base().createAreaPlot({ x: "time", y: { lower: "lo", upper: "hi" }, guides: false });
  assert.equal(ribbon.semanticSpec.layers[0].encoding.y.field, "lo");
  assert.equal(ribbon.semanticSpec.layers[0].encoding.y2.field, "hi");
  const primaryDatum = base().createAreaPlot({ x: "time", y: { lower: { datum: 0 }, upper: "value" } });
  assert.equal(primaryDatum.graphicSpec.objects.yAxisTitle.properties.text, "value");
  const horizontal = base().createAreaPlot({ x: { field: "value", scale: { type: "log", nice: false } }, y: "time", valueChannel: "x", baseline: 1, guides: false });
  assert.deepEqual(horizontal.resolvedScales.x.domain, [1, 4]);
  assert.equal(horizontal.semanticSpec.layers[0].encoding.x2.datum, 1);
});

test("invalid nested roles, constants, guides and ambiguous resources fail atomically", () => {
  const before = base();
  assertAtomicFailures(before, [{}, { x: "time" }, { y: "value" }].map(options => ({ operation: () => before.createAreaPlot(options), inputs: [options] })));
  const invalid = [
    { valueChannel: "z" }, { baseline: null }, { missing: "skip" },
    { x: { field: "time", target: "wrong" } }, { y: { field: "value", coordinate: "wrong" } },
    { x: { field: "time", fieldType: "nominal" } }, { y: { field: "value", aggregate: "sum" } },
    { y: { lower: "lo", upper: "hi" }, baseline: 0 },
    { y: { lower: { datum: 0 }, upper: { datum: 1 } } },
    { y: { field: "value", scale: { type: "log" } } },
    { layout: "group" }, { groupBy: [] }, { groupBy: ["time", "time"] },
    { color: { field: "time", fieldType: "quantitative" } }, { color: "time", area: { fill: "red" } },
    { area: { unknown: 1 } }, { guides: { legend: {} } }, { guides: { unknown: true } }
  ];
  assertAtomicFailures(before, invalid.map(options => ({ operation: () => before.createAreaPlot({ x: "time", y: "value", ...options }), inputs: [options] })));
  assert.throws(() => chart().createCanvas().createAreaPlot({ x: "time", y: "value" }), /data/);
});
