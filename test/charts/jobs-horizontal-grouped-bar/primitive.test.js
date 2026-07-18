import assert from "node:assert/strict";
import test from "node:test";

import { loadJobs } from "../../support/data.js";
import { createHorizontalGroupedBarPrimitives } from "./primitive.program.js";
import { createHorizontalGroupedBarValues } from "./reference-values.js";

test("authors the Gate J-A chart only through graphical primitives", () => {
  const values = createHorizontalGroupedBarValues(loadJobs());
  const program = createHorizontalGroupedBarPrimitives(loadJobs());
  const bars = program.graphicSpec.objects.bar;

  assert.equal(program.graphicSpec.objects.canvas.properties.width, 760);
  assert.equal(program.graphicSpec.objects.canvas.properties.height, 640);
  assert.equal(program.graphicSpec.objects.canvas.properties.background, "white");
  assert.equal(bars.type, "rect");
  assert.equal(bars.items.length, 30);
  assert.deepEqual(
    bars.items.map(item => item.properties),
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
  assert.deepEqual(
    [...new Set(program.trace.children.map(node => node.op))].sort(),
    ["createGraphics", "editGraphics"]
  );
  assert.equal(program.semanticSpec.datasets.length, 0);
  assert.equal(program.semanticSpec.layers.length, 0);
});

test("draws grid before bars and centers title on plot bounds", () => {
  const program = createHorizontalGroupedBarPrimitives(loadJobs());
  const plot = program.graphicSpec.objects["plot-main"];

  assert.equal(
    plot.children.indexOf("verticalGridLines") < plot.children.indexOf("bar"),
    true
  );
  assert.equal(program.graphicSpec.objects.chartTitle.properties.x, 351);
  assert.equal(program.graphicSpec.objects.chartSubtitle.properties.x, 351);
  assert.deepEqual(
    program.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties.text),
    ["men", "women"]
  );
  assert.deepEqual(
    program.graphicSpec.objects.yAxisLabels.items.map(item => item.properties.text),
    [
      "1850", "1860", "1870", "1880", "1900", "1910", "1920", "1930",
      "1940", "1950", "1960", "1970", "1980", "1990", "2000"
    ]
  );
});
