import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/core/ChartProgram.js";

const rows = [
  { year: "2020-01-01", value: 2, origin: "A", category: "X" },
  { year: "2021-01-01", value: 10, origin: "A", category: "X" },
  { year: "2020-01-01", value: 6, origin: "B", category: "Y" },
  { year: "2021-01-01", value: 14, origin: "B", category: "Y" }
];

function createSeriesLine({ color = true, dash = true } = {}) {
  let program = chart()
    .createCanvas({
      width: 400,
      height: 200,
      margin: { top: 20, right: 120, bottom: 20, left: 20 }
    })
    .createData({ id: "data", values: rows })
    .createLineMark({ id: "trends" })
    .encodeX({ field: "year", fieldType: "temporal" })
    .encodeY({ field: "value", aggregate: "mean" });

  if (color) program = program.encodeColor({ field: "origin" });
  if (dash) program = program.encodeStrokeDash({ field: "origin" });
  return program;
}

function createBottomSeriesLine() {
  return chart()
    .createCanvas({
      width: 500,
      height: 340,
      margin: { top: 30, right: 30, bottom: 140, left: 40 }
    })
    .createData({ id: "data", values: rows })
    .createLineMark({ id: "trends" })
    .encodeX({ field: "year", fieldType: "temporal" })
    .encodeY({ field: "value", aggregate: "mean" })
    .encodeColor({ field: "origin" })
    .encodeStrokeDash({ field: "origin" });
}

function createTopPointSeries() {
  return chart()
    .createCanvas({
      width: 500,
      height: 300,
      margin: { top: 130, right: 30, bottom: 40, left: 40 }
    })
    .createData({
      id: "data",
      values: rows.map((row, index) => ({ ...row, x: index }))
    })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "value" })
    .encodeColor({ field: "origin" })
    .encodeShape({ field: "origin" });
}

test("creates a combined series legend from color and strokeDash", () => {
  const before = createSeriesLine();
  const program = before.createLegend();

  assert.deepEqual(program.semanticSpec.guides.legend.series, {
    channels: ["color", "strokeDash"],
    scales: ["color", "strokeDash"],
    title: "origin"
  });
  assert.deepEqual(program.graphicSpec.objects.seriesLegendSymbols.children.map(
    child => child.properties
  ), [
    {
      x1: 310,
      y1: 72,
      x2: 342,
      y2: 72,
      stroke: "#4c78a8",
      strokeWidth: 2,
      strokeDash: []
    },
    {
      x1: 310,
      y1: 100,
      x2: 342,
      y2: 100,
      stroke: "#f58518",
      strokeWidth: 2,
      strokeDash: [8, 4]
    }
  ]);
  assert.deepEqual(program.graphicSpec.objects.seriesLegendLabels.children.map(
    child => child.properties.text
  ), ["A", "B"]);
  assert.equal(
    program.graphicSpec.objects.seriesLegendTitle.properties.text,
    "origin"
  );
  assert.equal(program.graphicSpec.objects.seriesLegendBackground, undefined);
  assert.equal(before.semanticSpec.guides.legend, undefined);
});

test("records semantic and component actions beneath createLegend", () => {
  const program = createSeriesLine().createLegend();
  const node = program.trace.children.at(-1);

  assert.equal(node.op, "createLegend");
  assert.deepEqual(node.children.map(child => child.op), [
    "createCategoricalLegend"
  ]);
  const categorical = node.children[0];
  assert.deepEqual(categorical.children.map(child => child.op), [
    "editSemantic",
    "editSemantic",
    "editSemantic",
    "createLegendSymbols",
    "createLegendLabels",
    "createLegendTitle"
  ]);
  assert.deepEqual(categorical.children[3].children.map(child => child.op), [
    "createLegendSymbolLines"
  ]);
  assert.deepEqual(
    categorical.children[3].children[0].children.map(child => child.op),
    ["createGraphics", "editLegendSymbolLines"]
  );
});

test("supports composite line and point symbol recipes", () => {
  const program = createSeriesLine().createLegend({
    symbol: {
      layers: [
        { type: "line", length: 32, lineWidth: 2 },
        { type: "point", shape: "circle", size: 4 }
      ]
    }
  });
  const lines = program.graphicSpec.objects.seriesLegendSymbolLines.children;
  const points = program.graphicSpec.objects.seriesLegendSymbolPoints.children;

  assert.equal(lines.length, points.length);
  assert.deepEqual(
    points.map(child => child.properties.y),
    lines.map(child => child.properties.y1)
  );
  assert.deepEqual(
    points.map(child => child.properties.x),
    lines.map(child =>
      (child.properties.x1 + child.properties.x2) / 2
    )
  );
  const symbols = program.trace.children.at(-1).children[0].children.find(
    child => child.op === "createLegendSymbols"
  );
  assert.deepEqual(symbols.children.map(child => child.op), [
    "createLegendSymbolLines",
    "createLegendSymbolPoints"
  ]);
});

test("lays out bordered bottom composite symbols in a deterministic grid", () => {
  const program = createBottomSeriesLine().createLegend({
    position: "bottom",
    align: "right",
    direction: "horizontal",
    columns: 1,
    offset: 40,
    titlePosition: "top",
    labels: { offset: 10 },
    itemGap: 18,
    border: true,
    symbol: {
      layers: [
        { type: "line", length: 36, lineWidth: 3 },
        { type: "point", size: 5, strokeWidth: 1 }
      ]
    }
  });
  const lines = program.graphicSpec.objects.seriesLegendSymbolLines.children;
  const points = program.graphicSpec.objects.seriesLegendSymbolPoints.children;
  const labels = program.graphicSpec.objects.seriesLegendLabels.children;
  const background = program.graphicSpec.objects.seriesLegendBackground;

  assert.equal(lines[0].properties.y1 < lines[1].properties.y1, true);
  assert.deepEqual(
    points.map(child => [child.properties.x, child.properties.y]),
    lines.map(child => [
      (child.properties.x1 + child.properties.x2) / 2,
      child.properties.y1
    ])
  );
  assert.deepEqual(
    labels.map((child, index) => child.properties.x - lines[index].properties.x2),
    [10, 10]
  );
  assert.deepEqual(program.graphicSpec.order.slice(-5), [
    "seriesLegendBackground",
    "seriesLegendSymbolLines",
    "seriesLegendSymbolPoints",
    "seriesLegendLabels",
    "seriesLegendTitle"
  ]);
  assert.equal(background.properties.y + background.properties.height <= 340, true);
});

test("rematerializes bottom composite layout and fails atomically when cramped", () => {
  const before = createBottomSeriesLine().createLegend({
    position: "bottom",
    align: "right",
    columns: 2,
    border: true,
    symbol: {
      layers: [
        { type: "line" },
        { type: "point" }
      ]
    }
  });
  const after = before.editCanvas({ width: 560 });

  assert.notEqual(
    after.graphicSpec.objects.seriesLegendSymbolLines.children[0].properties.x1,
    before.graphicSpec.objects.seriesLegendSymbolLines.children[0].properties.x1
  );
  assert.equal(
    after.trace.children.at(-1).children.some(
      child => child.op === "rematerializeLegend"
    ),
    true
  );
  assert.throws(
    () => createBottomSeriesLine()
      .editCanvas({ margin: { top: 30, right: 30, bottom: 40, left: 40 } })
      .createLegend({ position: "bottom", border: true }),
    /bottom-margin space/
  );
  assert.equal(before.graphicSpec.objects.canvas.properties.width, 500);
});

test("keeps color and shape point composites compatible with top grids", () => {
  const before = createTopPointSeries().createLegend({
    position: "top",
    columns: 2,
    border: true
  });
  const symbols = before.graphicSpec.objects.seriesLegendSymbolPoints.children;

  assert.deepEqual(symbols.map(child => child.type), ["circle", "rect"]);
  assert.deepEqual(
    symbols.map(child => child.properties.fill),
    ["#4c78a8", "#f58518"]
  );
  const color = before.resolvedScales.color;
  const shape = before.resolvedScales.shape;
  const after = before
    ._withResolvedScale("color", { ...color, domain: ["B", "A"] })
    ._withResolvedScale("shape", { ...shape, domain: ["B", "A"] })
    .rematerializeLegend();

  assert.deepEqual(
    after.graphicSpec.objects.seriesLegendLabels.children.map(
      child => child.properties.text
    ),
    ["B", "A"]
  );
  assert.deepEqual(
    after.graphicSpec.objects.seriesLegendSymbolPoints.children.map(
      child => child.properties.fill
    ),
    ["#4c78a8", "#f58518"]
  );
});

test("supports single-channel series legends", () => {
  const color = createSeriesLine({ dash: false }).createLegend();
  const dash = createSeriesLine({ color: false }).createLegend();

  assert.deepEqual(color.semanticSpec.guides.legend.series.channels, ["color"]);
  assert.deepEqual(
    color.graphicSpec.objects.seriesLegendSymbols.children.map(
      child => child.properties.strokeDash
    ),
    [[], []]
  );
  assert.deepEqual(dash.semanticSpec.guides.legend.series.channels, ["strokeDash"]);
  assert.deepEqual(
    dash.graphicSpec.objects.seriesLegendSymbols.children.map(
      child => child.properties.stroke
    ),
    ["#4c78a8", "#4c78a8"]
  );
});

test("creates and renders an optional background before legend content", () => {
  const program = createSeriesLine().createLegend({
    border: {
      color: "#94a3b8",
      background: "white"
    }
  });

  assert.deepEqual(program.graphicSpec.objects.seriesLegendBackground, {
    type: "rect",
    properties: {
      x: 298,
      y: 28,
      width: 90,
      height: 84,
      fill: "white",
      stroke: "#94a3b8",
      strokeWidth: 1
    }
  });
  assert.deepEqual(program.graphicSpec.order.slice(-4), [
    "seriesLegendBackground",
    "seriesLegendSymbols",
    "seriesLegendLabels",
    "seriesLegendTitle"
  ]);
  assert.equal(
    program.trace.children.at(-1).children[0].children[3].op,
    "createLegendBackground"
  );
});

test("rematerializes legend and border layout after Canvas edits", () => {
  const before = createSeriesLine().createLegend({ border: true });
  const program = before.editCanvas({ width: 500 });

  assert.equal(
    program.graphicSpec.objects.seriesLegendSymbols.children[0].properties.x1,
    410
  );
  assert.equal(
    program.graphicSpec.objects.seriesLegendBackground.properties.x,
    398
  );
  assert.equal(
    program.graphicSpec.objects.seriesLegendBackground.properties.width,
    90
  );
  assert.equal(
    program.trace.children.at(-1).children.filter(
      child => child.op === "rematerializeLegend"
    ).length,
    1
  );
  assert.equal(
    before.graphicSpec.objects.seriesLegendSymbols.children[0].properties.x1,
    310
  );
});

test("reads the latest shared scale domain when rematerializing", () => {
  const before = createSeriesLine().createLegend();
  const color = before.resolvedScales.color;
  const strokeDash = before.resolvedScales.strokeDash;
  const program = before
    ._withResolvedScale("color", { ...color, domain: ["B", "A"] })
    ._withResolvedScale("strokeDash", {
      ...strokeDash,
      domain: ["B", "A"]
    })
    .rematerializeLegend();

  assert.deepEqual(
    program.graphicSpec.objects.seriesLegendLabels.children.map(
      child => child.properties.text
    ),
    ["B", "A"]
  );
  assert.deepEqual(program.guideConfigs.legend.series.domain, ["B", "A"]);
  assert.deepEqual(before.guideConfigs.legend.series.domain, ["A", "B"]);
});

test("validates combined fields, domains, targets, and appearance options", () => {
  const differentDomains = createSeriesLine({ dash: false })
    .encodeStrokeDash({
      field: "origin",
      scale: { domain: ["B", "A"] }
    });

  assert.throws(
    () => createSeriesLine({ dash: false })
      .encodeStrokeDash({ field: "category" }),
    /must match color field/
  );
  assert.throws(
    () => differentDomains.createLegend(),
    /identical ordered domains/
  );
  assert.throws(
    () => createSeriesLine().createLegend({ channels: [] }),
    /non-empty unique/
  );
  assert.throws(
    () => createSeriesLine().createLegend({ position: "left" }),
    /Unsupported legend position/
  );
  assert.throws(
    () => createSeriesLine().createLegend({ border: { padding: -1 } }),
    /padding must be a non-negative/
  );
  assert.throws(
    () => createSeriesLine().createLegend({ target: "missing" }),
    /Unknown categorical legend target/
  );
  assert.throws(
    () => createSeriesLine().createLegend().createLegend(),
    /missing legend/
  );
  assert.throws(
    () => createSeriesLine().createLegend().encodeColor({ field: "category" }),
    /must match strokeDash field/
  );
});
