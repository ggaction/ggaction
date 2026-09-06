import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { createCarsDensityArea } from "../../../../examples/cars-density-area/program.js";
import { createCarsHistogram } from "../../../../examples/cars-histogram/program.js";
import { createCarsLineChart } from "../../../../examples/cars-line-chart/program.js";
import { loadCars } from "../../../support/data.js";
import {
  normalizeMarkFilterTransform,
  validateMarkFilterTransform
} from "../../../../src/grammar/markFilter.js";

const rows = [
  { id: "a1", category: "A", x: 1, y: 10 },
  { id: "b1", category: "B", x: 2, y: 20 },
  { id: "a2", category: "A", x: 3, y: 30 },
  { id: "b2", category: "B", x: 4, y: 40 }
];

function encodedPointProgram() {
  return chart()
    .createCanvas({
      width: 400,
      height: 300,
      margin: { top: 30, right: 30, bottom: 60, left: 60 }
    })
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
  assert.equal(program.graphicSpec.objects.points.items.length, 2);
  assert.deepEqual(
    program.trace.children.at(-1).children.map(node => node.op),
    [
      "createDerivedData",
      "materializeMarkFilteredData"
    ]
  );
  assert.deepEqual(
    program.trace.children.at(-1).children[1].children.map(node => node.op),
    ["editSemantic", "editSemantic", "rematerializePointMark"]
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
      selectors: [{
        grain: "item",
        field: "category",
        op: "oneOf",
        values: ["A"]
      }]
    }],
    values: [rows[0], rows[2]]
  });
  assert.equal(program.semanticSpec.layers[0].data, "pointsFilteredData");
  assert.equal(program.context.currentData, "pointsFilteredData");
  assert.deepEqual(program.resolvedScales.x.domain, [1, 3]);
  assert.deepEqual(program.resolvedScales.y.domain, [10, 30]);
  assert.equal(program.graphicSpec.objects.points.items.length, 2);
  assert.equal(before.semanticSpec.layers[0].data, "rows");
  assert.equal(before.graphicSpec.objects.points.items.length, 4);

  assert.deepEqual(
    program.trace.children.at(-1).children.map(node => node.op),
    ["createDerivedData", "materializeMarkFilteredData"]
  );
  assert.deepEqual(
    program.trace.children.at(-1).children[1].children.map(node => node.op),
    [
      "editSemantic", "editSemantic", "rematerializeScale",
      "rematerializeScale", "rematerializePointMark"
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
  const rectangles = filtered.graphicSpec.objects.bars.items;

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

  assert.equal(line.graphicSpec.objects.trends.items.length, 1);
  assert.deepEqual(line.resolvedScales.color.domain, ["Japan"]);
  assert.equal(line.graphicSpec.objects.seriesLegendSymbols.items.length, 1);
  assert.equal(area.graphicSpec.objects.densities.items.length, 1);
  assert.deepEqual(area.resolvedScales.color.domain, ["Japan"]);
  assert.equal(area.graphicSpec.objects.colorLegendSymbols.items.length, 1);
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
  assert.equal(filtered.graphicSpec.objects.rule.items.length, 2);
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
    before.graphicSpec.objects.xAxisLabels.items.map(
      child => child.properties.text
    ),
    ["1", "2", "3", "4"]
  );
  assert.deepEqual(
    after.graphicSpec.objects.xAxisLabels.items.map(
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
  const empty = base.filterMarks({ field: "x", op: "eq", value: 999 });
  assert.deepEqual(empty.semanticSpec.datasets.at(-1).values, []);
  assert.equal(empty.graphicSpec.objects.points.items.length, 0);
  assert.deepEqual(empty.resolvedScales.x.domain, base.resolvedScales.x.domain);
  const filtered = base.filterMarks({
    field: "category",
    op: "eq",
    value: "A"
  });
  assert.throws(
    () => filtered.filterMarks({ field: "category", op: "eq", value: "B" }),
    /requires mode "replace" or "compose"/
  );
  assert.equal(base.semanticSpec.datasets.length, 1);
  assert.equal(base.semanticSpec.layers[0].data, "rows");
});

test("replaces, composes, and idempotently repeats one active filter", () => {
  const base = encodedPointProgram();
  const first = base.filterMarks({
    field: "category",
    op: "eq",
    value: "A"
  });
  const same = first.filterMarks({
    field: "category",
    op: "eq",
    value: "A"
  });
  const replaced = first.filterMarks({
    mode: "replace",
    field: "category",
    op: "eq",
    value: "B"
  });
  const composed = first.filterMarks({
    mode: "compose",
    field: "x",
    op: "gt",
    value: 1
  });

  assert.deepEqual(same.semanticSpec, first.semanticSpec);
  assert.deepEqual(same.graphicSpec, first.graphicSpec);
  assert.deepEqual(
    replaced.semanticSpec.datasets.at(-1).values.map(row => row.id),
    ["b1", "b2"]
  );
  assert.deepEqual(
    replaced.semanticSpec.datasets.at(-1).transform[0].selectors,
    [{ grain: "item", field: "category", op: "eq", value: "B" }]
  );
  assert.deepEqual(
    composed.semanticSpec.datasets.at(-1).values.map(row => row.id),
    ["a2"]
  );
  assert.deepEqual(
    composed.semanticSpec.datasets.at(-1).transform[0].selectors,
    [
      { grain: "item", field: "category", op: "eq", value: "A" },
      { grain: "item", field: "x", op: "gt", value: 1 }
    ]
  );
  assert.throws(
    () => first.filterMarks({
      mode: "append",
      field: "x",
      op: "gt",
      value: 1
    }),
    /Unknown mark filter mode/
  );
});

test("keeps an empty view on the preceding domain and removes stale graphics", () => {
  const first = encodedPointProgram()
    .createMarkLabels({ source: "points", field: "category" })
    .highlightMarks({
      target: "points",
      select: { field: "category", op: "eq", value: "A" },
      fill: "red"
    })
    .filterMarks({ field: "category", op: "eq", value: "A" });
  const domains = {
    x: first.resolvedScales.x.domain,
    y: first.resolvedScales.y.domain
  };
  const empty = first.filterMarks({
    mode: "compose",
    field: "x",
    op: "gt",
    value: 99
  });

  assert.deepEqual(empty.semanticSpec.datasets.at(-1).values, []);
  assert.deepEqual(empty.resolvedScales.x.domain, domains.x);
  assert.deepEqual(empty.resolvedScales.y.domain, domains.y);
  assert.equal(empty.graphicSpec.objects.points.items.length, 0);
  assert.equal(empty.graphicSpec.objects["points-labels"].items.length, 0);
});

test("removes an active filter and restores source, domains, and histogram bins", () => {
  const base = encodedPointProgram();
  const filtered = base.filterMarks({
    field: "category",
    op: "eq",
    value: "A"
  });
  const restored = filtered.removeMarkFilter();

  assert.equal(restored.semanticSpec.layers[0].data, "rows");
  assert.deepEqual(restored.semanticSpec.datasets, base.semanticSpec.datasets);
  assert.deepEqual(restored.resolvedScales, base.resolvedScales);
  assert.deepEqual(restored.graphicSpec, base.graphicSpec);
  assert.equal(restored.context.currentData, "rows");
  assert.equal(restored.markConfigs.points.markFilter, undefined);
  assert.throws(() => base.removeMarkFilter(), /mark filter requires an eligible layer/);

  const histogram = createCarsHistogram(loadCars());
  const originalBin = histogram.semanticSpec.layers
    .find(layer => layer.id === "bars").encoding.x.bin;
  const histogramFiltered = histogram.filterMarks({
    target: "bars",
    grain: "stack",
    channel: "y2",
    op: "max"
  });
  const histogramRestored = histogramFiltered.removeMarkFilter({ target: "bars" });
  assert.deepEqual(
    histogramRestored.semanticSpec.layers
      .find(layer => layer.id === "bars").encoding.x.bin,
    originalBin
  );
  assert.deepEqual(histogramRestored.graphicSpec, histogram.graphicSpec);
});

test("preserves downstream snapshots when an active filter is revised", () => {
  const first = encodedPointProgram().filterMarks({
    field: "category",
    op: "eq",
    value: "A"
  });
  const dependent = first.filterData({
    id: "highA",
    source: "pointsFilteredData",
    field: "x",
    predicate: { op: "gt", value: 1 }
  });
  const revised = dependent.filterMarks({
    target: "points",
    mode: "replace",
    field: "category",
    op: "eq",
    value: "B"
  });

  assert.equal(revised.semanticSpec.layers[0].data, "pointsFilteredData2");
  assert.deepEqual(
    revised.semanticSpec.datasets.find(dataset =>
      dataset.id === "pointsFilteredData"
    ).values.map(row => row.id),
    ["a1", "a2"]
  );
  assert.deepEqual(
    revised.semanticSpec.datasets.find(dataset => dataset.id === "highA")
      .values.map(row => row.id),
    ["a2"]
  );
  assert.deepEqual(
    revised.semanticSpec.datasets.find(dataset =>
      dataset.id === "pointsFilteredData2"
    ).values.map(row => row.id),
    ["b1", "b2"]
  );
});

test("supports empty views for every current final-item mark family", () => {
  const values = [
    { category: "A", x: 1, y: 2 },
    { category: "A", x: 2, y: 3 },
    { category: "B", x: 3, y: 4 },
    { category: "B", x: 4, y: 5 }
  ];
  const source = () => chart().createCanvas().createData({ values });
  const cases = [
    ["point", source().createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" })],
    ["barPlot", source().createBarPlot({ x: "category", y: "y", guides: false })],
    ["linePlot", source().createLinePlot({ x: "x", y: "y", groupBy: "category", guides: false })],
    ["areaPlot", source().createAreaPlot({ x: "x", y: "y", groupBy: "category", guides: false })],
    ["piePlot", source().createPiePlot({ category: "category", value: "y", aggregate: "sum", guides: false })],
    ["rule", source().createRuleMark().encodeX({ field: "x", fieldType: "quantitative" })],
    ["tick", source().createTickMark().encodeX({ field: "x" }).encodeY({ field: "y" })],
    ["rect", source().createRectMark().encodeX({ field: "x" }).encodeY({ field: "y" })]
  ];

  for (const [id, program] of cases) {
    const empty = program.filterMarks({
      field: "category",
      op: "eq",
      value: "missing"
    });
    assert.deepEqual(empty.semanticSpec.datasets.at(-1).values, [], id);
    assert.equal(empty.graphicSpec.objects[id].items.length, 0, id);
    const resized = empty.editCanvas({ width: 700 });
    assert.equal(resized.graphicSpec.objects[id].items.length, 0, `${id} resize`);
  }
});

test("keeps a shared scale domain stable while one filtered consumer is empty", () => {
  const program = chart()
    .createCanvas()
    .createData({
      id: "firstData",
      values: [{ x: 1, category: "A" }, { x: 2, category: "A" }]
    })
    .createPointMark({ id: "first" })
    .encodeX({ field: "x", scale: { id: "shared", nice: false, zero: false } })
    .createData({
      id: "secondData",
      values: [{ x: 50, category: "B" }, { x: 100, category: "B" }]
    })
    .createPointMark({ id: "second" })
    .encodeX({ target: "second", field: "x", scale: { id: "shared" } });
  const domain = program.resolvedScales.shared.domain;
  const empty = program.filterMarks({
    target: "first",
    field: "category",
    op: "eq",
    value: "missing"
  });
  const resized = empty.editCanvas({ width: 800 });

  assert.deepEqual(domain, [1, 100]);
  assert.deepEqual(empty.resolvedScales.shared.domain, domain);
  assert.deepEqual(resized.resolvedScales.shared.domain, domain);
  assert.equal(resized.graphicSpec.objects.first.items.length, 0);
  assert.equal(resized.graphicSpec.objects.second.items.length, 2);
});

test("keeps legacy selector provenance readable and rejects mixed recipes", () => {
  const selector = { field: "category", op: "eq", value: "A" };
  assert.doesNotThrow(() => validateMarkFilterTransform({
    type: "markFilter",
    target: "points",
    selector
  }));
  assert.deepEqual(
    normalizeMarkFilterTransform("points", selector).selectors,
    [{ grain: "item", field: "category", op: "eq", value: "A" }]
  );
  assert.throws(
    () => validateMarkFilterTransform({
      type: "markFilter",
      target: "points",
      selector,
      selectors: [selector]
    }),
    /exactly one of selector or selectors/
  );
});
