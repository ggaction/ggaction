import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createMockCanvasContext,
  findCanvasCalls
} from "../helpers/mockCanvasContext.js";
import {
  createJobsGroupedBarPrimitives,
  renderJobsGroupedBarPrimitives
} from "../programs/jobsGroupedBarPrimitives.js";
import { createJobsGroupedBarValues } from "../programs/jobsGroupedBarValues.js";

const jobs = JSON.parse(
  readFileSync(new URL("../../data/jobs.json", import.meta.url), "utf8")
);
const layout = {
  width: 720,
  height: 460,
  margin: { top: 40, right: 140, bottom: 70, left: 80 },
  band: 0.72
};

test("authors and renders the complete primitive jobs grouped bar chart", () => {
  const values = createJobsGroupedBarValues(jobs, layout);
  const program = createJobsGroupedBarPrimitives(jobs);
  const context = createMockCanvasContext();

  renderJobsGroupedBarPrimitives(program, context);

  assert.equal(program.semanticSpec.datasets[0].values.length, 7650);
  assert.deepEqual(program.semanticSpec.layers, [{
    id: "bars",
    mark: { type: "bar" },
    data: "jobs",
    coordinate: "main",
    encoding: {
      x: { field: "year", fieldType: "ordinal", scale: "x" },
      y: {
        field: "perc",
        fieldType: "quantitative",
        aggregate: "mean",
        stack: null,
        scale: "y"
      },
      color: { field: "sex", fieldType: "nominal", scale: "color" },
      xOffset: {
        field: "sex",
        fieldType: "nominal",
        scale: "xOffset"
      }
    }
  }]);
  assert.deepEqual(program.semanticSpec.scales, [
    { id: "x", type: "ordinal", domain: "auto", range: "auto" },
    {
      id: "y",
      type: "linear",
      domain: "auto",
      range: "auto",
      nice: true,
      zero: false
    },
    {
      id: "color",
      type: "ordinal",
      domain: "auto",
      range: { palette: "tableau10" }
    },
    { id: "xOffset", type: "ordinal", domain: "auto", range: "auto" }
  ]);
  assert.deepEqual(program.semanticSpec.coordinates, [
    { id: "main", type: "cartesian" }
  ]);
  assert.deepEqual(program.semanticSpec.guides, {
    axis: {
      x: { scale: "x", coordinate: "main", title: "year" },
      y: { scale: "y", coordinate: "main", title: "mean(perc)" }
    },
    grid: {
      horizontal: { scale: "y", coordinate: "main" }
    },
    legend: {
      color: { scale: "color", title: "sex" }
    }
  });

  const bars = program.graphicSpec.objects.bars;
  assert.equal(bars.type, "rect");
  assert.equal(bars.children.length, 30);
  assert.deepEqual(
    bars.children.map(child => child.properties),
    values.rects.map(rect => ({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      fill: rect.fill,
      stroke: "white",
      strokeWidth: 0.5
    }))
  );
  assert.equal(bars.children.every(child =>
    ["x", "y", "width", "height"].every(property =>
      Number.isFinite(child.properties[property])
    )
  ), true);
  assert.equal(bars.children.every(child => child.properties.height >= 0), true);

  assert.deepEqual(
    program.graphicSpec.objects.xAxisLabels.children.map(
      child => child.properties.text
    ),
    values.years.map(String)
  );
  assert.deepEqual(
    program.graphicSpec.objects.colorLegendLabels.children.map(
      child => child.properties.text
    ),
    ["men", "women"]
  );
  assert.deepEqual(
    program.graphicSpec.objects.colorLegendSymbols.children.map(
      child => child.properties.fill
    ),
    ["#4c78a8", "#f58518"]
  );
  assert.deepEqual(program.graphicSpec.order, [
    "canvas",
    "horizontalGridLines",
    "bars",
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

  assert.equal(findCanvasCalls(context, "fillRect").length, 33);
  assert.equal(findCanvasCalls(context, "fillText").length, 25);
  assert.equal(findCanvasCalls(context, "stroke").length > 0, true);

  const topLevelOps = new Set(program.trace.children.map(node => node.op));
  assert.deepEqual([...topLevelOps], [
    "createCanvas",
    "createData",
    "createBarMark",
    "editSemantic",
    "editGraphics",
    "createGraphics"
  ]);
  assert.equal(program.trace.children.some(node => [
    "encodeX",
    "encodeY",
    "encodeColor",
    "encodeXOffset",
    "encodeBarWidth",
    "createAxes",
    "createGrid",
    "createLegend",
    "createGuides"
  ].includes(node.op)), false);
  assert.equal(Object.isFrozen(bars.children[0].properties), true);
  assert.equal(Object.isFrozen(program.semanticSpec.layers[0].encoding.xOffset), true);
  assert.deepEqual(program.actionStack, []);
});

test("owns grouped-bar input and renders from graphicSpec alone", () => {
  const input = structuredClone(jobs);
  const program = createJobsGroupedBarPrimitives(input);
  const stored = program.semanticSpec.datasets[0].values[0].perc;
  input[0].perc = -999;

  assert.equal(program.semanticSpec.datasets[0].values[0].perc, stored);
  const context = createMockCanvasContext();
  renderJobsGroupedBarPrimitives({ graphicSpec: program.graphicSpec }, context);
  assert.equal(findCanvasCalls(context, "fillRect").length, 33);
});
