import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";
import { createCarsRegressionScatterplotValues } from
  "../../../charts/cars-regression-scatterplot/reference-values.js";
import { loadCars } from "../../../support/data.js";
import { graphicTreeSnapshot } from "../../../support/graphic-tree.js";

function regressionProgram() {
  return chart()
    .createCanvas({
      width: 760,
      height: 480,
      margin: { top: 40, right: 190, bottom: 70, left: 80 }
    })
    .createData({ id: "cars", values: loadCars() })
    .filterData({
      id: "selectedCars",
      field: "Origin",
      oneOf: ["Japan", "USA"]
    })
    .createPointMark({ id: "points" })
    .encodeX({ field: "Displacement", scale: { nice: true, zero: false } })
    .encodeY({ field: "Acceleration", scale: { nice: true, zero: false } })
    .encodeColor({ field: "Origin", scale: { palette: "tableau10" } })
    .encodeSize({ field: "Acceleration" })
    .encodeShape({ field: "Origin" })
    .encodeOpacity({ value: 0.27 })
    .createRegression();
}

test("creates shared axes, horizontal grid, and two right-side legends", () => {
  const program = regressionProgram().createGuides();
  assert.deepEqual(program.semanticSpec.guides, {
    axis: {
      x: { coordinate: "main", scale: "x", title: "Displacement" },
      y: { coordinate: "main", scale: "y", title: "Acceleration" }
    },
    grid: { horizontal: { scale: "y", coordinate: "main" } },
    legend: {
      series: {
        channels: ["color", "shape"],
        scales: ["color", "shape"],
        title: "Origin"
      },
      size: { scale: "size", title: "Acceleration" }
    }
  });
  assert.deepEqual(
    program.trace.children.at(-1).children.map(child => child.op),
    ["createAxes", "createGrid", "createLegend"]
  );
  const drawOrder = graphicTreeSnapshot(program).drawOrder;
  assert.equal(drawOrder.indexOf("horizontalGridLines") <
    drawOrder.indexOf("points"), true);
  assert.equal(drawOrder.indexOf("seriesLegendSymbolLines") >
    drawOrder.indexOf("yAxisTitle"), true);
});

test("matches primitive composite and five-symbol size legends", () => {
  const expected = createCarsRegressionScatterplotValues(loadCars());
  const program = regressionProgram().createGuides();
  const origin = expected.legends.origin;
  const size = expected.legends.size;

  assert.deepEqual(
    program.graphicSpec.objects.seriesLegendSymbolLines.items.map(
      child => child.properties
    ),
    origin.items.map(item => ({ ...item.line, stroke: item.color, strokeWidth: 3 }))
  );
  assert.deepEqual(
    program.graphicSpec.objects.seriesLegendSymbolPoints.items,
    origin.items.map((item, index) => ({
      id: `seriesLegendSymbolPoints:${index}`,
      type: item.symbol.type,
      properties: item.symbol.properties
    }))
  );
  assert.deepEqual(
    program.graphicSpec.objects.sizeLegendSymbols.items.map(child =>
      child.properties.radius
    ),
    size.items.map(item => item.symbol.radius)
  );
  assert.deepEqual(
    program.graphicSpec.objects.sizeLegendLabels.items.map(child =>
      child.properties.text
    ),
    size.items.map(item => item.label.text)
  );
  assert.equal(program.graphicSpec.objects.sizeLegendSymbols.items.length, 5);
});

test("rematerializes both legend blocks after Canvas edits", () => {
  const before = regressionProgram().createGuides();
  const after = before.editCanvas({ width: 860 });
  assert.equal(
    after.graphicSpec.objects.seriesLegendSymbolLines.items[0].properties.x1,
    700
  );
  assert.equal(
    after.graphicSpec.objects.sizeLegendSymbols.items[0].properties.x,
    716
  );
  const legendNode = after.trace.children.at(-1).children.find(
    child => child.op === "rematerializeLegend"
  );
  assert.deepEqual(legendNode.children.map(child => child.op), [
    "rematerializeLegendSymbols",
    "rematerializeLegendLabels",
    "rematerializeLegendTitle",
    "rematerializeSizeLegend"
  ]);
});

test("supports an explicit quantitative symbol count and validates point legends", () => {
  const program = regressionProgram().createLegend({ count: 3 });
  assert.equal(program.graphicSpec.objects.sizeLegendSymbols.items.length, 3);
  assert.throws(
    () => regressionProgram().createLegend({ count: 1 }),
    /at least 2/
  );
  assert.throws(
    () => regressionProgram().createLegend({ position: "bottom" }),
    /require a side position/
  );
});
