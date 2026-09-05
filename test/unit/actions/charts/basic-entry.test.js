import assert from "node:assert/strict";
import test from "node:test";

import { chart as basicChart } from "../../../../src/basic.js";
import { chart as fullChart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ x: 1, y: 2, category: "A", value: 3 }),
  Object.freeze({ x: 2, y: 4, category: "B", value: 5 })
]);

test("Basic omitted Canvas options preserve full-entry defaults and explicit invalid values", () => {
  for (const options of [undefined, {}, { width: 800 }, { margin: 0 }, { margin: { left: 50 } }]) {
    const basic = basicChart().createCanvas(options);
    const full = fullChart().createCanvas(options);
    assert.deepEqual(basic.graphicSpec, full.graphicSpec);
    assert.deepEqual(basic.materializationConfigs.canvas, full.materializationConfigs.canvas);
  }
  for (const factory of [basicChart, fullChart]) {
    assert.throws(() => factory().createCanvas({ margin: undefined }), /margin/);
    assert.throws(() => factory().createCanvas({ margin: null }), /margin/);
  }
});

function base(values = rows) {
  return basicChart()
    .createCanvas({
      width: 360,
      height: 260,
      margin: { top: 50, right: 110, bottom: 50, left: 50 }
    })
    .createData({ values });
}

function scatter(factory) {
  return factory()
    .createCanvas({
      width: 360,
      height: 260,
      margin: { top: 50, right: 110, bottom: 50, left: 50 }
    })
    .createData({ values: rows })
    .createScatterPlot({
      x: "x",
      y: "y",
      color: "category",
      point: { stroke: "#111111", strokeWidth: 1 }
    });
}

test("matches full-entry output while preserving the Basic trace composition", () => {
  const basic = scatter(basicChart);
  const full = scatter(fullChart);

  assert.deepEqual(basic.semanticSpec, full.semanticSpec);
  assert.deepEqual(basic.graphicSpec, full.graphicSpec);
  assert.deepEqual(
    basic.trace.children.map(entry => entry.op),
    ["createCanvas", "createData", "createScatterPlot"]
  );
  assert.deepEqual(
    basic.trace.children.at(-1).children.map(entry => entry.op),
    ["createPointMark", "encodeX", "encodeY", "encodeColor", "createGuides"]
  );
});

test("creates every chart facade exposed by the basic entry", () => {
  const scatter = base().createScatterPlot({
    x: "x",
    y: "y",
    point: { stroke: "#111111", strokeWidth: 1 }
  });
  const line = base().createLinePlot({
    x: "x",
    y: "y",
    line: { strokeWidth: 2 }
  });
  const bars = base().createBarPlot({
    x: { field: "category", fieldType: "ordinal" },
    y: { field: "value", aggregate: "mean" },
    bar: { opacity: 0.8 }
  });
  const histogram = base().createHistogram({ field: "value" });
  const heatmap = base().createHeatmap({
    x: { field: "category", fieldType: "ordinal" },
    y: { field: "x", fieldType: "ordinal" },
    color: { field: "value", fieldType: "quantitative" },
    rect: { stroke: "#ffffff", strokeWidth: 1 }
  });

  assert.equal(scatter.graphicSpec.objects.scatterPlot.items.length, 2);
  assert.equal(line.graphicSpec.objects.linePlot.items.length, 1);
  assert.equal(bars.graphicSpec.objects.barPlot.items.length, 2);
  assert.equal(histogram.graphicSpec.objects.histogram.items.length, 2);
  assert.equal(heatmap.graphicSpec.objects.heatmap.items.length, 2);
});

test("supports the binned heatmap path without full-entry actions", () => {
  const heatmap = base().createHeatmap({
    x: "x",
    y: "y",
    bin: { bins: 2, extent: { x: [1, 2], y: [2, 4] } },
    guides: false
  });

  assert.equal(heatmap.graphicSpec.objects.heatmap.items.length, 4);
  assert.equal(heatmap.createRegression, undefined);
  assert.equal(heatmap.encodeTheta, undefined);
  assert.equal(heatmap.facet, undefined);
});
