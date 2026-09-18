import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const DETAILS = Object.freeze({
  lineCap: "round",
  lineJoin: "bevel",
  miterLimit: 4
});
const RECT_DETAILS = Object.freeze({
  cornerRadius: 6, cornerRadiusTopRight: 0, cornerRadiusBottomLeft: 0, ...DETAILS
});
const rows = Object.freeze([
  Object.freeze({
    x: 0, y: 1, value: 1, category: "A", group: "G1",
    before: 0, after: 2, a: 1, b: 3
  }),
  Object.freeze({
    x: 1, y: 2, value: 2, category: "B", group: "G1",
    before: 1, after: 3, a: 2, b: 2
  }),
  Object.freeze({
    x: 2, y: 3, value: 3, category: "A", group: "G2",
    before: 2, after: 4, a: 3, b: 1
  }),
  Object.freeze({
    x: 3, y: 4, value: 4, category: "B", group: "G2",
    before: 3, after: 5, a: 4, b: 0
  })
]);

function base(values = rows) {
  return chart()
    .createCanvas({ width: 700, height: 500, margin: 100 })
    .createData({ id: "source", values });
}

function assertDetails(properties, label) {
  assert.equal(properties.lineCap, DETAILS.lineCap, `${label} lineCap`);
  assert.equal(properties.lineJoin, DETAILS.lineJoin, `${label} lineJoin`);
  assert.equal(properties.miterLimit, DETAILS.miterLimit, `${label} miterLimit`);
}

function assertStyledMark(program, id, { rounded = false } = {}) {
  const config = program.markConfigs[id]?.barAppearance ?? program.markConfigs[id];
  assert.ok(config, `${id} config`);
  assertDetails(config, `${id} config`);
  const graphic = program.graphicSpec.objects[id];
  assert.ok(graphic?.items?.length > 0, `${id} concrete items`);
  for (const item of graphic.items) assertDetails(item.properties, `${id} item`);
  if (rounded) {
    assert.equal(graphic.type, "collection", `${id} rounded owner`);
    assert.equal(graphic.items.every(item =>
      item.type === "path" && item.properties.commands.length === 10
    ), true, `${id} rounded paths`);
    assert.equal(config.cornerRadius, RECT_DETAILS.cornerRadius);
    assert.equal(config.cornerRadiusTopRight, 0);
    assert.equal(config.cornerRadiusBottomLeft, 0);
    for (const item of graphic.items) {
      const c = item.properties.commands;
      assert.equal(c[2].y, c[0].y);
      assert.equal(c[6].y, c[4].y);
    }
  }
}

test("forwards shape details through every Cartesian facade family", () => {
  const cases = [
    ["scatterPlot", base().createScatterPlot({
      x: "x", y: "y", point: { stroke: "black", ...DETAILS }, guides: false
    })],
    ["linePlot", base().createLinePlot({
      x: "x", y: "y", line: DETAILS, guides: false
    })],
    ["barPlot", base().createBarPlot({
      x: "category", y: "value", bar: RECT_DETAILS, guides: false
    }), true],
    ["histogram", base().createHistogram({
      field: "value", bar: RECT_DETAILS, guides: false
    }), true],
    ["heatmap", base().createHeatmap({
      x: "category", y: "group", color: "value",
      rect: RECT_DETAILS, guides: false
    }), true],
    ["areaPlot", base().createAreaPlot({
      x: "x", y: "y", area: { stroke: "black", ...DETAILS }, guides: false
    })],
    ["densityPlot", base().createDensityPlot({
      field: "value", bandwidth: 1, extent: [0, 5],
      area: { stroke: "black", ...DETAILS }, guides: false
    })],
    ["ecdfPlot", base().createECDFPlot({
      field: "value", line: DETAILS, guides: false
    })],
    ["horizonPlot", base().createHorizonPlot({
      x: "x", y: "y", area: { stroke: "black", ...DETAILS }, guides: false
    })],
    ["parallelCoordinates", base().createParallelCoordinates({
      dimensions: ["a", "b"], line: DETAILS, guides: false
    })],
    ["rugPlot", base().createRugPlot({
      x: "x", edge: "bottom", tick: DETAILS, guides: false
    })],
    ["stripPlot", base().createStripPlot({
      x: "x", y: "category", point: { stroke: "black", ...DETAILS },
      guides: false
    })],
    ["violinPlot", base().createViolinPlot({
      x: "category", y: "value",
      density: { bandwidth: 1, extent: [0, 5] },
      area: { stroke: "black", ...DETAILS }, guides: false
    })]
  ];

  for (const [id, program, rounded = false] of cases) {
    assertStyledMark(program, id, { rounded });
  }
});

test("forwards shape details through every Polar facade family", () => {
  const radarRows = [
    { dimension: "speed", value: 0.4, series: "A" },
    { dimension: "quality", value: 0.8, series: "A" },
    { dimension: "cost", value: 0.6, series: "A" },
    { dimension: "speed", value: 0.7, series: "B" },
    { dimension: "quality", value: 0.5, series: "B" },
    { dimension: "cost", value: 0.9, series: "B" }
  ];
  const cases = [
    ["piePlot", base().createPiePlot({
      category: "category", value: "value", aggregate: "sum",
      arc: DETAILS, guides: false
    })],
    ["rosePlot", base().createRosePlot({
      category: "category", value: "value", aggregate: "sum",
      arc: DETAILS, guides: false
    })],
    ["radialBarPlot", base().createRadialBarPlot({
      category: "category", value: "value", aggregate: "sum",
      arc: DETAILS, guides: false
    })],
    ["polarScatterPlot", base().createPolarScatterPlot({
      theta: "x", radius: "y", point: { stroke: "black", ...DETAILS },
      guides: false
    })],
    ["polarLinePlot", base().createPolarLinePlot({
      theta: "x", radius: "y", line: DETAILS, guides: false
    })],
    ["radarPlot", base(radarRows).createRadarPlot({
      category: "dimension", value: "value", groupBy: "series",
      color: "series", order: ["speed", "quality", "cost"],
      line: DETAILS, guides: false
    })]
  ];

  for (const [id, program] of cases) assertStyledMark(program, id);
});

test("forwards details through composite owners and all generated children", () => {
  const lollipop = base().createLollipopPlot({
    category: "category",
    value: "value",
    point: { stroke: "black", ...DETAILS },
    stem: DETAILS,
    guides: false
  });
  for (const id of ["lollipopPlot", "lollipopPlotStem"]) {
    assertStyledMark(lollipop, id);
  }

  const interval = base().createIntervalPlot({
    x: "category",
    y: { field: "value", center: "mean", extent: "stdev" },
    point: { stroke: "black", ...DETAILS },
    errorBar: DETAILS,
    guides: false
  });
  for (const id of [
    "intervalPlot",
    "intervalPlotInterval",
    "intervalPlotIntervalLowerCap",
    "intervalPlotIntervalUpperCap"
  ]) assertStyledMark(interval, id);

  const regression = base().createRegressionPlot({
    x: "x",
    y: "y",
    point: { stroke: "black", ...DETAILS },
    line: DETAILS,
    band: { stroke: "black", ...DETAILS },
    guides: false
  });
  for (const id of [
    "regressionPlot",
    "regressionPlotRegressionLines",
    "regressionPlotRegressionBands"
  ]) assertStyledMark(regression, id);

  const errorBar = base().createErrorBar({
    x: { field: "category", fieldType: "nominal" },
    y: { field: "value", center: "mean", extent: "stdev" },
    ...DETAILS
  });
  for (const id of ["errorBar", "errorBarLowerCap", "errorBarUpperCap"]) {
    assertStyledMark(errorBar, id);
  }

  const errorBand = base([
    { x: 0, y: 1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 1, y: 4 }
  ]).createErrorBand({
    x: { field: "x" },
    y: { field: "y", center: "mean", extent: "stdev" },
    ...DETAILS,
    boundaries: { stroke: "black", ...DETAILS }
  });
  for (const id of [
    "errorBand",
    "errorBandLowerBoundary",
    "errorBandUpperBoundary"
  ]) assertStyledMark(errorBand, id);

  const referenced = base()
    .createPointMark({ id: "sourcePoints" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .createReferenceLine({ id: "threshold", y: 2, ...DETAILS })
    .createReferenceBand({ id: "range", y: [1, 3], ...RECT_DETAILS });
  assertStyledMark(referenced, "threshold");
  assertStyledMark(referenced, "range", { rounded: true });

  const boxRows = [
    { category: "A", value: 1 },
    { category: "A", value: 2 },
    { category: "A", value: 3 },
    { category: "A", value: 100 },
    { category: "B", value: 2 },
    { category: "B", value: 3 },
    { category: "B", value: 4 }
  ];
  const box = base(boxRows).createBoxPlot({
    x: { field: "category", fieldType: "nominal" },
    y: { field: "value" },
    box: RECT_DETAILS,
    median: DETAILS,
    outlier: DETAILS,
    guides: false
  });
  assertStyledMark(box, "boxPlot", { rounded: true });
  assertStyledMark(box, "boxPlotMedian");
  assertStyledMark(box, "boxPlotOutliers");

  const gradient = base().createGradientPlot({
    x: { field: "category", fieldType: "nominal" },
    y: { field: "value" },
    density: { bandwidth: 1, extent: [0, 5] },
    center: DETAILS,
    guides: false
  });
  assertStyledMark(gradient, "gradientPlotCenter");
});

test("replays composite style edits across generated children and representation resets", () => {
  const boxRows = [
    { category: "A", value: 1 },
    { category: "A", value: 2 },
    { category: "A", value: 3 },
    { category: "A", value: 100 },
    { category: "B", value: 2 },
    { category: "B", value: 3 },
    { category: "B", value: 4 }
  ];
  const box = base(boxRows)
    .createBoxPlot({
      x: { field: "category", fieldType: "nominal" },
      y: { field: "value" },
      box: RECT_DETAILS,
      median: DETAILS,
      outlier: DETAILS,
      guides: false
    })
    .editBoxPlot({
      box: { cornerRadius: 0, lineCap: "square" },
      median: { lineCap: "square" },
      outlier: { lineCap: "square" }
    });
  assert.equal(box.graphicSpec.objects.boxPlot.type, "rect");
  for (const id of ["boxPlot", "boxPlotMedian", "boxPlotOutliers"]) {
    const config = box.markConfigs[id]?.barAppearance ?? box.markConfigs[id];
    assert.equal(config.lineCap, "square", `${id} edited config`);
    assert.equal(
      box.graphicSpec.objects[id].items[0].properties.lineCap,
      "square",
      `${id} edited item`
    );
  }

  const errorBar = base()
    .createErrorBar({
      x: { field: "category", fieldType: "nominal" },
      y: { field: "value", center: "mean", extent: "stdev" },
      ...DETAILS
    })
    .editErrorBar({ lineCap: "square" });
  for (const id of ["errorBar", "errorBarLowerCap", "errorBarUpperCap"]) {
    assert.equal(errorBar.markConfigs[id].lineCap, "square", `${id} edit`);
    assert.equal(errorBar.graphicSpec.objects[id].items[0].properties.lineCap, "square");
  }

  const errorBandRows = [
    { x: 0, y: 1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 1, y: 4 }
  ];
  const errorBand = base(errorBandRows)
    .createErrorBand({
      x: { field: "x" },
      y: { field: "y", center: "mean", extent: "stdev" },
      ...DETAILS,
      boundaries: { stroke: "black", ...DETAILS }
    })
    .editErrorBand({
      lineCap: "square",
      boundaries: { lineCap: "square" }
    });
  for (const id of [
    "errorBand",
    "errorBandLowerBoundary",
    "errorBandUpperBoundary"
  ]) {
    assert.equal(errorBand.markConfigs[id].lineCap, "square", `${id} edit`);
    assert.equal(errorBand.graphicSpec.objects[id].items[0].properties.lineCap, "square");
  }

  const regression = base()
    .createPointMark({ id: "observed" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .createRegression({
      target: "observed",
      line: DETAILS,
      band: { stroke: "black", ...DETAILS }
    })
    .editRegression({
      target: "observed",
      line: { lineCap: "square" },
      band: { lineCap: "square" }
    });
  for (const id of ["observedRegressionLines", "observedRegressionBands"]) {
    assert.equal(regression.markConfigs[id].lineCap, "square", `${id} edit`);
    assert.equal(regression.graphicSpec.objects[id].items[0].properties.lineCap, "square");
  }

  const gradient = base()
    .createGradientPlot({
      x: { field: "category", fieldType: "nominal" },
      y: { field: "value" },
      density: { bandwidth: 1, extent: [0, 5] },
      center: DETAILS,
      guides: false
    })
    .editGradientPlot({ center: { lineCap: "square" } });
  assert.equal(
    gradient.markConfigs.gradientPlot.gradientPlot.center.lineCap,
    "square"
  );
  assert.equal(gradient.markConfigs.gradientPlotCenter.lineCap, "square");
  assert.equal(
    gradient.graphicSpec.objects.gradientPlotCenter.items[0].properties.lineCap,
    "square"
  );
});
