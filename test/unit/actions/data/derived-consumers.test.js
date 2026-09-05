import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

function sourceProgram() {
  return chart()
    .createCanvas({ width: 400, height: 300, margin: 60 })
    .createData({ id: "source", values: [
      { category: "A", x: 1, y: 2 },
      { category: "A", x: 2, y: 3 },
      { category: "B", x: 3, y: 4 }
    ] })
    .createDerivedData({ id: "pending", source: "source", transform: [
      { type: "filter", field: "category", oneOf: ["A"] }
    ] });
}

function assertMaterializationError(callback) {
  assert.throws(callback, error => {
    assert.equal(error.name, "Error");
    assert.match(error.message, /Dataset "pending" requires materialized values/);
    assert.match(error.message, /createDerivedData/);
    return true;
  });
}

test("chart facades reject explicit and current definition-only data immutably", () => {
  const source = sourceProgram();
  const before = structuredClone(source);
  const requests = [
    ["createScatterPlot", { x: "x", y: "y" }],
    ["createLinePlot", { x: "x", y: "y" }],
    ["createBarPlot", { x: "category", y: "y" }],
    ["createHistogram", { field: "x" }],
    ["createBoxPlot", { x: "category", y: "y" }],
    ["createViolinPlot", { x: "category", y: "y" }],
    ["createHeatmap", { x: "category", y: "category", color: "y" }],
    ["createParallelCoordinates", { dimensions: ["x", "y"] }]
  ];
  for (const [operation, options] of requests) {
    for (const data of [{}, { data: "pending" }]) {
      assertMaterializationError(() => source[operation]({ ...options, ...data }));
      assert.deepEqual(structuredClone(source), before, operation);
    }
  }
  assert.equal(source.semanticSpec.datasets.at(-1).values, undefined);
});

test("mark creation shares the definition-only data precondition", () => {
  const source = sourceProgram();
  const before = structuredClone(source);
  for (const operation of [
    "createPointMark", "createLineMark", "createBarMark", "createAreaMark",
    "createArcMark", "createRectMark", "createRuleMark", "createTextMark",
    "createTickMark"
  ]) {
    for (const data of [{}, { data: "pending" }]) {
      assertMaterializationError(() => source[operation](data));
      assert.deepEqual(structuredClone(source), before, operation);
    }
  }
});

test("materialized data remains usable and explicit data takes precedence", () => {
  const source = sourceProgram();
  const explicit = source.createScatterPlot({ data: "source", x: "x", y: "y" });
  assert.equal(explicit.semanticSpec.layers[0].data, "source");
  assert.equal(explicit.graphicSpec.objects.scatterPlot.items.length, 3);

  const filtered = source.filterData({
    id: "filtered", source: "source", field: "category", oneOf: ["A"]
  }).createScatterPlot({ x: "x", y: "y" });
  assert.equal(filtered.semanticSpec.layers[0].data, "filtered");
  assert.equal(filtered.graphicSpec.objects.scatterPlot.items.length, 2);

  const empty = chart().createData({ values: [] }).createPointMark();
  assert.equal(empty.graphicSpec.objects.point.items.length, 0);
});
