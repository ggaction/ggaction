import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/core/ChartProgram.js";
import { loadCars } from "../../../support/data.js";

function densityArea({ densityChannel = "y", top = 130 } = {}) {
  return chart()
    .createCanvas({
      width: 720,
      height: 500,
      margin: { top, right: 40, bottom: 70, left: 80 }
    })
    .createData({ id: "cars", values: loadCars() })
    .createAreaMark({ id: "densities", opacity: 0.5 })
    .encodeDensity({
      field: "Acceleration",
      groupBy: "Origin",
      bandwidth: 0.6,
      densityChannel
    })
    .encodeColor({ field: "Origin", scale: { palette: "tableau10" } });
}

const GUIDE_OPTIONS = {
  grid: { horizontal: {}, vertical: {} },
  legend: {
    position: "top",
    direction: "vertical",
    columns: 3,
    titlePosition: "left",
    offset: 8
  }
};

test("creates density axes, two grids, and a top area legend", () => {
  const program = densityArea().createGuides(GUIDE_OPTIONS);

  assert.deepEqual(program.semanticSpec.guides, {
    axis: {
      x: { coordinate: "main", scale: "x", title: "Acceleration" },
      y: { coordinate: "main", scale: "y", title: "Density" }
    },
    grid: {
      horizontal: { scale: "y", coordinate: "main" },
      vertical: { scale: "x", coordinate: "main" }
    },
    legend: { color: { scale: "color", title: "Origin" } }
  });
  assert.deepEqual(
    program.trace.children.at(-1).children.map(child => child.op),
    ["createAxes", "createGrid", "createLegend"]
  );
  assert.deepEqual(program.graphicSpec.order, [
    "canvas",
    "horizontalGridLines",
    "verticalGridLines",
    "densities",
    "xAxisLine",
    "xAxisTicks",
    "xAxisLabels",
    "xAxisTitle",
    "yAxisLine",
    "yAxisTicks",
    "yAxisLabels",
    "yAxisTitle",
    "colorLegendSymbols",
    "colorLegendLabels",
    "colorLegendTitle"
  ]);
});

test("reverses inferred density and source axis titles for x-density", () => {
  const program = densityArea({ densityChannel: "x" }).createGuides({
    grid: false,
    legend: false
  });

  assert.equal(program.semanticSpec.guides.axis.x.title, "Density");
  assert.equal(program.semanticSpec.guides.axis.y.title, "Acceleration");
});

test("keeps createTitle separate and appends it after every guide", () => {
  const guided = densityArea().createGuides(GUIDE_OPTIONS);
  const program = guided.createTitle({
    text: "Distribution of Acceleration",
    subtitle: "By Origin (cars dataset)"
  });

  assert.deepEqual(program.graphicSpec.order.slice(-5), [
    "colorLegendSymbols",
    "colorLegendLabels",
    "colorLegendTitle",
    "chartTitle",
    "chartSubtitle"
  ]);
  assert.equal(program.trace.children.at(-2).op, "createGuides");
  assert.equal(program.trace.children.at(-1).op, "createTitle");
});

test("rematerializes density guides, title, and mark after Canvas edits", () => {
  const before = densityArea()
    .createGuides(GUIDE_OPTIONS)
    .createTitle({
      text: "Distribution of Acceleration",
      subtitle: "By Origin (cars dataset)"
    });
  const after = before.editCanvas({ width: 820, height: 540 });

  for (const id of [
    "horizontalGridLines", "verticalGridLines", "densities",
    "xAxisLine", "yAxisLine", "colorLegendSymbols"
  ]) {
    assert.notDeepEqual(after.graphicSpec.objects[id], before.graphicSpec.objects[id]);
  }
  assert.equal(
    after.trace.children.at(-1).children.some(child => child.op === "rematerializeTitle"),
    true
  );
});

test("supports guide opt-outs and rejects title/legend overlap", () => {
  const axesOnly = densityArea().createGuides({ grid: false, legend: false });
  assert.equal(axesOnly.semanticSpec.guides.grid, undefined);
  assert.equal(axesOnly.semanticSpec.guides.legend, undefined);

  const cramped = densityArea({ top: 70 }).createGuides(GUIDE_OPTIONS);
  assert.throws(
    () => cramped.createTitle({
      text: "Distribution of Acceleration",
      subtitle: "By Origin (cars dataset)"
    }),
    /top legend require more top-margin space/
  );
});
