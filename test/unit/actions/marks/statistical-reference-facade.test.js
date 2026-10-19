import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { describeAction } from "../../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";

const source = () => chart().createCanvas({ width: 500, height: 400, margin: 50 })
  .createData({ values: [0, 10, 20, 30, 40].map(x => ({ x, y: x * 2, other: x * 3, group: x < 20 ? "A" : "B" })) })
  .createScatterPlot({ id: "points", x: "x", y: "y", guides: false });
const values = (p, id = "statisticalReference") => p.semanticSpec.datasets.find(d =>
  d.id === p.markConfigs[id].statisticalReference.dataId).values[0];
const middle = p => [{ op: "quantile", p }, { op: "quantile", p: 1 - p }];

test("statistical facade defaults to one native mean line with a dark thick solid stroke", () => {
  const p = source(), before = serializeProgram(p);
  const q = p.createStatisticalReference({ source: "points", axis: "y" });
  assert.deepEqual(values(q), { value: 40 });
  const props = q.graphicSpec.objects.statisticalReference.items[0].properties;
  assert.equal(props.stroke, "#222222");
  assert.equal(props.strokeWidth, 2.5);
  assert.deepEqual(props.strokeDash, []);
  assert.equal(q.trace.children.length, p.trace.children.length + 1);
  assert.equal(q.trace.children.at(-1).op, "createStatisticalReference");
  assert.deepEqual(q.trace.children.at(-1).children.map(c => c.op), ["createReferenceLine"]);
  assert.equal(serializeProgram(p), before);
  assert.equal(typeof basicChart().createStatisticalReference, "undefined");
});

test("every statistical facade choice preserves native output on either axis", () => {
  const p = source();
  const cases = [
    [{ statistic: { op: "mean" } }, [20]], [{ statistic: { op: "median" } }, [20]],
    [{ statistic: { op: "min" } }, [0]], [{ statistic: { op: "max" } }, [40]],
    [{ statistic: { op: "quantile", p: .1 } }, [4]],
    [{ statistics: middle(.25) }, [10, 30]], [{ statistics: middle(.025) }, [1, 39]],
  ];
  for (const axis of ["x", "y"]) for (const [recipe, expected] of cases) {
    const args = Object.freeze({ id: "reference", source: "points", axis, ...recipe });
    const q = p.createStatisticalReference(args), band = !!recipe.statistics;
    Object.values(values(q, "reference")).forEach((v, i) => assert.ok(Math.abs(v - expected[i] * (axis === "y" ? 2 : 1)) < 1e-10));
    const native = band ? p.createReferenceBand({ fill: "#6b7280", opacity: .18, ...args }) :
      p.createReferenceLine({ stroke: "#222222", strokeWidth: 2.5, strokeDash: "solid", ...args });
    assert.deepEqual(q.semanticSpec, native.semanticSpec);
    assert.deepEqual(q.graphicSpec, native.graphicSpec);
    assert.equal(renderToSVG(q), renderToSVG(native));
    assert.deepEqual(q.trace.children.at(-1).children.map(c => c.op), [band ? "createReferenceBand" : "createReferenceLine"]);
  }
});

test("facade delegates population, source re-encoding, Canvas replay and persistence", () => {
  const p = source().createStatisticalReference({ source: "points", axis: "y" })
    .createStatisticalReference({ id: "visible", source: "points", axis: "y", population: "visibleItems", statistics: middle(.025) })
    .createStatisticalReference({ id: "explicit", source: "points", axis: "y", field: "y" });
  const filtered = p.filterMarks({ target: "points", field: "x", op: "gte", value: 20 });
  assert.deepEqual(values(filtered), { value: 40 });
  assert.deepEqual(values(filtered, "visible"), { lower: 41, upper: 79 });
  const encoded = filtered.encodeY({ target: "points", field: "other", scale: { id: "otherY" } });
  assert.deepEqual(values(encoded), { value: 60 });
  assert.deepEqual(values(encoded, "explicit"), { value: 40 });
  const restored = deserializeProgram(serializeProgram(encoded));
  const resized = restored.editCanvas({ width: 600, height: 450 });
  assert.deepEqual(values(resized), { value: 60 });
  assert.deepEqual(restored.graphicSpec, encoded.graphicSpec);
  assert.notDeepEqual(resized.graphicSpec.objects.statisticalReference, restored.graphicSpec.objects.statisticalReference);
  const removed = resized.removeMark({ target: "points" });
  assert.deepEqual(removed.semanticSpec.layers, []);
  assert.ok(!removed.semanticSpec.datasets.some(d => d.id.endsWith("-statistical-reference-data")));
  assert.deepEqual(values(p), { value: 40 });
});

test("facade statistics follow derived data edits and facet partitions without expanding source domains", () => {
  const p = source().createComputedData({ id: "derived", source: "data", as: "value", expression: { op: "multiply", left: { field: "y" }, right: { constant: 2 } } })
    .createScatterPlot({ id: "derivedPoints", data: "derived", x: "x", y: "value", guides: false })
    .createStatisticalReference({ source: "derivedPoints", axis: "y" });
  const edited = p.editComputedData({ target: "derived", expression: { op: "multiply", left: { field: "y" }, right: { constant: 3 } } });
  assert.deepEqual(values(p), { value: 80 });
  assert.deepEqual(values(edited), { value: 120 });
  const faceted = source().createStatisticalReference({ source: "points", axis: "y" }).facet({ field: "group", guides: { legend: false } });
  assert.deepEqual(faceted.compositionSpec.children.map(id => values(faceted.children[id]).value), [10, 60]);
  const base = source(), far = base.createStatisticalReference({ source: "points", axis: "y", field: "other", statistic: { op: "max" } });
  assert.deepEqual(far.resolvedScales.y.domain, base.resolvedScales.y.domain);
  const without = far.removeMark({ target: "statisticalReference" });
  assert.equal(without.semanticSpec.layers.length, 1);
  assert.ok(!without.semanticSpec.datasets.some(d => d.id === "statisticalReference-statistical-reference-data"));
});

test("facade rejects ambiguous recipes, invalid branches and resource conflicts atomically", () => {
  const p = source(), before = serializeProgram(p);
  for (const args of [
    {}, { source: "points" }, { source: "missing", axis: "y" }, { source: "points", axis: "z" },
    { source: "points", axis: "y", statistic: { op: "mean" }, statistics: middle(.25) },
    { source: "points", axis: "y", statistic: { op: "quantile", p: 2 } },
    { source: "points", axis: "y", statistics: [{ op: "min" }] },
    { source: "points", axis: "y", statistics: [{ op: "max" }, { op: "min" }] },
    { source: "points", axis: "y", fill: "red" },
    { source: "points", axis: "y", statistics: middle(.25), strokeDash: "solid" },
    { source: "points", axis: "y", y: 10 }, { source: "points", axis: "y", field: "group" },
  ]) { assert.throws(() => p.createStatisticalReference(args)); assert.equal(serializeProgram(p), before); }
  const q = p.createStatisticalReference({ source: "points", axis: "y" });
  assert.throws(() => q.createStatisticalReference({ source: "points", axis: "x", statistics: middle(.25) }), /exist|already|used|ambiguous/i);
  const custom = p.createStatisticalReference({ source: "points", axis: "y", stroke: "black", strokeWidth: 4, strokeDash: "dotted" });
  assert.equal(custom.graphicSpec.objects.statisticalReference.items[0].properties.strokeWidth, 4);
});

test("inspection exposes the real facade with source and axis requirements and native branches", () => {
  const p = source();
  const missing = describeAction(p, { action: "createStatisticalReference" });
  assert.equal(missing.applicability, "needs-input");
  for (const key of ["source", "axis", "statistic", "statistics"]) assert.ok(missing.parameterDefinitions.some(o => o.path === key));
  for (const key of ["x", "y", "space", "data", "coordinate", "temporalUnit"]) assert.ok(!missing.parameterDefinitions.some(o => o.path === key));
  for (const options of [{ source: "points", axis: "y" }, { source: "points", axis: "y", statistics: middle(.025) }]) {
    assert.equal(describeAction(p, { action: "createStatisticalReference", options }).applicability, "supported");
  }
});
