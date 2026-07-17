import { graphicDrawOrder } from "../../../support/graphic-tree.js";
import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";

const rows = [
  { year: "2020-01-01", value: 2, origin: "A" },
  { year: "2021-01-01", value: 10, origin: "A" },
  { year: "2020-01-01", value: 6, origin: "B" },
  { year: "2021-01-01", value: 14, origin: "B" }
];

function createSeriesLine() {
  return chart()
    .createCanvas({
      width: 500,
      height: 280,
      margin: { top: 30, right: 140, bottom: 60, left: 60 }
    })
    .createData({ id: "data", values: rows })
    .createLineMark({ id: "trends" })
    .encodeX({ field: "year", fieldType: "temporal" })
    .encodeY({ field: "value", aggregate: "mean" })
    .encodeColor({ field: "origin" })
    .encodeStrokeDash({ field: "origin" });
}

function createGroupedBars() {
  return chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 40, right: 140, bottom: 70, left: 80 }
    })
    .createData({
      id: "jobs",
      values: [
        { year: 1850, perc: 1, sex: "men" },
        { year: 1850, perc: 9, sex: "women" },
        { year: 1860, perc: 2, sex: "men" },
        { year: 1860, perc: 8, sex: "women" }
      ]
    })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "ordinal" })
    .encodeY({ field: "perc", aggregate: "mean" })
    .encodeColor({ field: "sex", layout: "group" })
    .encodeBarWidth({ band: 0.72 });
}

function createCountDonut() {
  return chart()
    .createCanvas({
      width: 400,
      height: 320,
      margin: { top: 30, right: 120, bottom: 50, left: 50 }
    })
    .createData({ values: [
      { category: "A" },
      { category: "A" },
      { category: "B" }
    ] })
    .createArcMark({ innerRadius: 0.3 })
    .encodeTheta({ field: "category", aggregate: "count" })
    .encodeColor({ field: "category" });
}

test("automatically creates axes, grid, and a line-series legend", () => {
  const program = createSeriesLine().createGuides();
  const node = program.trace.children.at(-1);

  assert.deepEqual(node.children.map(child => child.op), [
    "createAxes",
    "createGrid",
    "createLegend"
  ]);
  assert.deepEqual(program.semanticSpec.guides.legend.series.channels, [
    "color",
    "strokeDash"
  ]);
  assert.equal(program.semanticSpec.guides.axis.x.scale, "x");
  assert.equal(program.semanticSpec.guides.axis.y.scale, "y");
  assert.equal(program.semanticSpec.guides.grid.horizontal.scale, "y");
  assert.equal(program.graphicSpec.objects.seriesLegendTitle.type, "text");
  assert.equal(
    graphicDrawOrder(program).indexOf("horizontalGridLines") <
      graphicDrawOrder(program).indexOf("trends"),
    true
  );
});

test("forwards explicit child options", () => {
  const program = createSeriesLine().createGuides({
    axes: {
      x: false,
      y: { ticksAndLabels: { count: 3 } }
    },
    grid: {
      horizontal: { color: "#cbd5e1", lineWidth: 2 }
    },
    legend: {
      title: "Series",
      border: true
    }
  });

  assert.equal(program.semanticSpec.guides.axis.x, undefined);
  assert.equal(program.semanticSpec.guides.axis.y.scale, "y");
  assert.equal(program.semanticSpec.guides.legend.series.title, "Series");
  assert.equal(program.graphicSpec.objects.seriesLegendBackground.type, "rect");
  assert.equal(program.guideConfigs.axis.y.ticks.count, 3);
  assert.equal(
    program.graphicSpec.objects.horizontalGridLines.items[0].properties
      .strokeWidth,
    2
  );
});

test("supports explicit guide opt-out", () => {
  const axesAndGrid = createSeriesLine().createGuides({ legend: false });
  const legendOnly = createSeriesLine().createGuides({
    axes: false,
    grid: false
  });
  const gridOnly = createSeriesLine().createGuides({
    axes: false,
    legend: false
  });

  assert.equal(axesAndGrid.semanticSpec.guides.axis.x.scale, "x");
  assert.equal(axesAndGrid.semanticSpec.guides.grid.horizontal.scale, "y");
  assert.equal(axesAndGrid.semanticSpec.guides.legend, undefined);
  assert.equal(legendOnly.semanticSpec.guides.axis, undefined);
  assert.equal(legendOnly.semanticSpec.guides.grid, undefined);
  assert.deepEqual(legendOnly.semanticSpec.guides.legend.series.scales, [
    "color",
    "strokeDash"
  ]);
  assert.equal(gridOnly.semanticSpec.guides.axis, undefined);
  assert.equal(gridOnly.semanticSpec.guides.grid.horizontal.scale, "y");
  assert.equal(gridOnly.semanticSpec.guides.legend, undefined);
});

test("does not infer the unsupported point legend", () => {
  const program = chart()
    .createCanvas({ width: 400, height: 260 })
    .createData({
      id: "pointsData",
      values: [
        { x: 1, y: 2, group: "A" },
        { x: 2, y: 3, group: "B" }
      ]
    })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "group" })
    .createGuides();

  assert.equal(program.semanticSpec.guides.axis.x.scale, "x");
  assert.equal(program.semanticSpec.guides.axis.y.scale, "y");
  assert.equal(program.semanticSpec.guides.grid.horizontal.scale, "y");
  assert.equal(program.semanticSpec.guides.legend, undefined);
  assert.deepEqual(program.trace.children.at(-1).children.map(child => child.op), [
    "createAxes",
    "createGrid"
  ]);
});

test("automatically selects a histogram color legend", () => {
  const program = chart()
    .createCanvas({
      width: 432,
      height: 460,
      margin: { top: 80, right: 140, bottom: 130, left: 80 }
    })
    .createData({
      id: "cars",
      values: [
        { value: 60, origin: "A" },
        { value: 100, origin: "B" }
      ]
    })
    .createBarMark({ id: "bars" })
    .encodeHistogram({ field: "value" })
    .encodeColor({ field: "origin" })
    .createGuides();

  assert.deepEqual(
    program.trace.children.at(-1).children.map(child => child.op),
    ["createAxes", "createGrid", "createLegend"]
  );
  assert.equal(program.semanticSpec.guides.legend.color.scale, "color");
  assert.equal(program.graphicSpec.objects.colorLegendSymbols.type, "rect");
});

test("creates only applicable Polar guides for a theta-only arc", () => {
  const program = createCountDonut().createGuides();

  assert.deepEqual(
    program.trace.children.at(-1).children.map(child => child.op),
    ["createAxes", "createGrid", "createLegend"]
  );
  assert.ok(program.semanticSpec.guides.axis.theta);
  assert.equal(program.semanticSpec.guides.axis.radius, undefined);
  assert.ok(program.semanticSpec.guides.grid.theta);
  assert.equal(program.semanticSpec.guides.grid.radial, undefined);
  assert.equal(program.semanticSpec.guides.legend.color.scale, "color");
  assert.ok(program.graphicSpec.objects.colorLegendSymbols);
});

test("supports an inferred arc legend when axes and grid are disabled", () => {
  const program = createCountDonut().createGuides({
    axes: false,
    grid: false
  });

  assert.deepEqual(
    program.trace.children.at(-1).children.map(child => child.op),
    ["createLegend"]
  );
  assert.equal(program.semanticSpec.guides.axis, undefined);
  assert.equal(program.semanticSpec.guides.grid, undefined);
  assert.equal(program.semanticSpec.guides.legend.color.scale, "color");
});

test("collects grouped bar axes, grid, and right legend", () => {
  const program = createGroupedBars().createGuides();
  const node = program.trace.children.at(-1);

  assert.deepEqual(node.children.map(child => child.op), [
    "createAxes",
    "createGrid",
    "createLegend"
  ]);
  assert.deepEqual(node.children[0].children.map(child => child.op), [
    "createXAxis",
    "createYAxis"
  ]);
  assert.deepEqual(
    program.graphicSpec.objects.xAxisLabels.items.map(
      child => child.properties.text
    ),
    ["1850", "1860"]
  );
  assert.equal(
    program.graphicSpec.objects.colorLegendSymbols.items[0].properties.x,
    610
  );
  assert.equal(
    graphicDrawOrder(program).indexOf("horizontalGridLines") <
      graphicDrawOrder(program).indexOf("bars"),
    true
  );
});

test("forwards grouped guide options, supports opt-out, and rematerializes", () => {
  const configured = createGroupedBars().createGuides({
    axes: {
      x: { ticksAndLabels: { labels: { fontSize: 11 } } },
      y: false
    },
    grid: false,
    legend: { title: "Sex" }
  });
  const before = createGroupedBars().createGuides();
  const after = before.editCanvas({ width: 820 });

  assert.equal(configured.semanticSpec.guides.axis.y, undefined);
  assert.equal(configured.semanticSpec.guides.grid, undefined);
  assert.equal(configured.semanticSpec.guides.legend.color.title, "Sex");
  assert.equal(
    configured.graphicSpec.objects.xAxisLabels.items[0].properties.fontSize,
    11
  );
  assert.equal(
    before.graphicSpec.objects.colorLegendSymbols.items[0].properties.x,
    610
  );
  assert.equal(
    after.graphicSpec.objects.colorLegendSymbols.items[0].properties.x,
    710
  );
  assert.notEqual(
    before.graphicSpec.objects.xAxisLabels.items[0].properties.x,
    after.graphicSpec.objects.xAxisLabels.items[0].properties.x
  );
  assert.notEqual(
    before.graphicSpec.objects.bars.items[0].properties.width,
    after.graphicSpec.objects.bars.items[0].properties.width
  );
});

test("validates options and requires a selected guide", () => {
  assert.throws(() => chart().createGuides(), /at least one selected guide/);
  assert.throws(
    () => createSeriesLine().createGuides({
      axes: false,
      grid: false,
      legend: false
    }),
    /at least one selected guide/
  );
  assert.throws(
    () => createSeriesLine().createGuides({ grid: true }),
    /false or a plain object/
  );
  assert.throws(
    () => createSeriesLine().createGuides({ axes: "auto" }),
    /false or a plain object/
  );
  assert.throws(
    () => createSeriesLine().createGuides({ legend: null }),
    /false or a plain object/
  );
  assert.throws(
    () => createSeriesLine().createGuides({ title: {} }),
    /Unknown createGuides option/
  );
});
