import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { createCarsDensityArea } from "../../../../examples/cars-density-area/program.js";
import { createCarsHistogram } from "../../../../examples/cars-histogram/program.js";
import { createCarsLineChart } from "../../../../examples/cars-line-chart/program.js";
import { loadCars } from "../../../support/data.js";

const rows = [
  { id: "a1", category: "A", x: 1, y: 10 },
  { id: "b1", category: "B", x: 2, y: 20 },
  { id: "a2", category: "A", x: 3, y: 30 },
  { id: "b2", category: "B", x: 4, y: 40 }
];

function encodedPointProgram() {
  return chart()
    .createCanvas({ width: 400, height: 300, margin: 30 })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({
      field: "x",
      scale: { nice: false, zero: false }
    })
    .encodeY({
      field: "y",
      scale: { nice: false, zero: false }
    })
    .encodeRadius({ value: 3 });
}

test("supports the shortest call immediately after point creation", () => {
  const program = chart()
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points" })
    .filterMarks({ field: "category", op: "oneOf", values: ["A"] });

  assert.equal(program.semanticSpec.layers[0].data, "pointsFilteredData");
  assert.equal(program.graphicSpec.objects.points.children.length, 2);
  assert.deepEqual(
    program.trace.children.at(-1).children.map(node => node.op),
    [
      "createDerivedData",
      "materializeMarkFilteredData",
      "editSemantic",
      "rematerializePointMark"
    ]
  );
});

test("filters the current mark through an immutable derived dataset", () => {
  const before = encodedPointProgram();
  const program = before.filterMarks({
    field: "category",
    op: "oneOf",
    values: ["A"]
  });

  assert.deepEqual(program.semanticSpec.datasets[0], {
    id: "rows",
    values: rows
  });
  assert.deepEqual(program.semanticSpec.datasets[1], {
    id: "pointsFilteredData",
    source: "rows",
    transform: [{
      type: "markFilter",
      target: "points",
      selector: {
        grain: "item",
        field: "category",
        op: "oneOf",
        values: ["A"]
      }
    }],
    values: [rows[0], rows[2]]
  });
  assert.equal(program.semanticSpec.layers[0].data, "pointsFilteredData");
  assert.equal(program.context.currentData, "pointsFilteredData");
  assert.deepEqual(program.resolvedScales.x.domain, [1, 3]);
  assert.deepEqual(program.resolvedScales.y.domain, [10, 30]);
  assert.equal(program.graphicSpec.objects.points.children.length, 2);
  assert.equal(before.semanticSpec.layers[0].data, "rows");
  assert.equal(before.graphicSpec.objects.points.children.length, 4);

  assert.deepEqual(
    program.trace.children.at(-1).children.map(node => node.op),
    [
      "createDerivedData",
      "materializeMarkFilteredData",
      "editSemantic",
      "rematerializeScale",
      "rematerializeScale",
      "rematerializePointMark"
    ]
  );
});

test("supports explicit targets and comparison or range modes", () => {
  const base = encodedPointProgram();
  const compared = base.filterMarks({
    target: "points",
    field: "x",
    op: "gte",
    value: 3
  });
  const ranged = base.filterMarks({
    target: "points",
    field: "x",
    op: "range",
    min: 2,
    max: 3,
    inclusive: true
  });

  assert.deepEqual(
    compared.semanticSpec.datasets[1].values.map(row => row.id),
    ["a2", "b2"]
  );
  assert.deepEqual(
    ranged.semanticSpec.datasets[1].values.map(row => row.id),
    ["b1", "a2"]
  );
});

test("supports grouped rank, semantic channel, and concrete property selectors", () => {
  const base = encodedPointProgram();
  const ranked = base.filterMarks({
    field: "x",
    op: "max",
    groupBy: "category"
  });
  const ranged = base.filterMarks({
    channel: "x",
    op: "range",
    min: 2,
    max: 3
  });
  const rightmost = base.filterMarks({ property: "x", op: "max" });

  assert.deepEqual(
    ranked.semanticSpec.datasets.at(-1).values.map(row => row.id),
    ["a2", "b2"]
  );
  assert.deepEqual(
    ranged.semanticSpec.datasets.at(-1).values.map(row => row.id),
    ["b1", "a2"]
  );
  assert.deepEqual(
    rightmost.semanticSpec.datasets.at(-1).values.map(row => row.id),
    ["b2"]
  );
});

test("filters histogram stacks without changing their approved bin boundaries", () => {
  const cars = loadCars();
  const base = createCarsHistogram(cars);
  const boundaries = base.semanticSpec.layers
    .find(layer => layer.id === "bars").encoding.x.bin;
  const filtered = base.filterMarks({
    target: "bars",
    grain: "stack",
    channel: "y2",
    op: "max"
  });
  const layer = filtered.semanticSpec.layers.find(candidate => candidate.id === "bars");
  const rectangles = filtered.graphicSpec.objects.bars.children;

  assert.equal(filtered.semanticSpec.datasets.at(-1).values.length < cars.length, true);
  assert.equal(rectangles.length, 3);
  assert.equal(new Set(rectangles.map(rect => rect.properties.x)).size, 1);
  assert.deepEqual(layer.encoding.x.bin.boundaries, [
    50, 100, 150, 200, 250, 300, 350, 400, 450, 500
  ]);
  assert.notDeepEqual(layer.encoding.x.bin, boundaries);
});

test("filters complete line and density-area series at native path grain", () => {
  const cars = loadCars();
  const line = createCarsLineChart(cars).filterMarks({
    target: "trends",
    field: "Origin",
    op: "eq",
    value: "Japan"
  });
  const area = createCarsDensityArea(cars).filterMarks({
    target: "densities",
    field: "Origin",
    op: "eq",
    value: "Japan"
  });

  assert.equal(line.graphicSpec.objects.trends.children.length, 1);
  assert.deepEqual(line.resolvedScales.color.domain, ["Japan"]);
  assert.equal(line.graphicSpec.objects.seriesLegendSymbols.children.length, 1);
  assert.equal(area.graphicSpec.objects.densities.children.length, 1);
  assert.deepEqual(area.resolvedScales.color.domain, ["Japan"]);
  assert.equal(area.graphicSpec.objects.colorLegendSymbols.children.length, 1);
});

test("filters individual rule items and rematerializes their endpoints", () => {
  const base = chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ values: [
      { group: "A", value: 10 },
      { group: "B", value: 30 },
      { group: "C", value: 20 }
    ] })
    .createRuleMark()
    .encodeX({ field: "value", fieldType: "quantitative" });
  const filtered = base.filterMarks({
    field: "group",
    op: "oneOf",
    values: ["B", "C"]
  });

  assert.deepEqual(
    filtered.semanticSpec.datasets.at(-1).values.map(row => row.group),
    ["B", "C"]
  );
  assert.equal(filtered.graphicSpec.objects.rule.children.length, 2);
  assert.notDeepEqual(filtered.graphicSpec.objects.rule, base.graphicSpec.objects.rule);
});

test("rematerializes connected axes and grids from the filtered scale domains", () => {
  const before = encodedPointProgram().createGuides({ legend: false });
  const after = before.filterMarks({
    field: "category",
    op: "oneOf",
    values: ["A"]
  });

  assert.deepEqual(
    before.graphicSpec.objects.xAxisLabels.children.map(
      child => child.properties.text
    ),
    ["1", "2", "3", "4"]
  );
  assert.deepEqual(
    after.graphicSpec.objects.xAxisLabels.children.map(
      child => child.properties.text
    ),
    ["1", "1.5", "2", "2.5", "3"]
  );
  assert.notDeepEqual(
    after.graphicSpec.objects.horizontalGridLines,
    before.graphicSpec.objects.horizontalGridLines
  );
});

test("validates mark selection and filter application atomically", () => {
  const base = encodedPointProgram();
  assert.throws(
    () => base.filterMarks({ target: "missing", field: "x", op: "eq", value: 1 }),
    /Unknown filter mark target/
  );
  assert.throws(
    () => base.filterMarks({ field: "x", op: "eq", value: 1, min: 1 }),
    /does not accept "min"/
  );
  assert.throws(
    () => base.filterMarks({ field: "x", oneOf: [1] }),
    /Unknown filterMarks option "oneOf"/
  );
  assert.throws(
    () => base.filterMarks({ field: "x", op: "eq", value: 999 }),
    /at least one matching mark item/
  );
  const filtered = base.filterMarks({
    field: "category",
    op: "eq",
    value: "A"
  });
  assert.throws(
    () => filtered.filterMarks({ field: "category", op: "eq", value: "B" }),
    /already exists/
  );
  assert.equal(base.semanticSpec.datasets.length, 1);
  assert.equal(base.semanticSpec.layers[0].data, "rows");
});
