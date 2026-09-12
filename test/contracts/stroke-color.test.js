import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { chart, render } from "../../src/index.js";
import { resolveStoredSelection } from
  "../../src/materialization/selection/state.js";
import { renderToPDF } from "../../src/renderers/pdf.js";
import { renderToPNG } from "../../src/renderers/png.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import {
  createMockCanvasContext,
  findCanvasCalls
} from "../support/canvas.js";

const canvas = Object.freeze({
  width: 900,
  height: 520,
  margin: Object.freeze({ top: 80, right: 260, bottom: 80, left: 80 })
});

function pointBase(values = [
  { x: 0, y: 0, fillGroup: "A", strokeGroup: "U", measure: 0, facet: "one" },
  { x: 1, y: 1, fillGroup: "A", strokeGroup: "V", measure: 5, facet: "one" },
  { x: 2, y: 2, fillGroup: "B", strokeGroup: "U", measure: 10, facet: "two" },
  { x: 3, y: 3, fillGroup: "B", strokeGroup: "V", measure: 7, facet: "two" }
]) {
  return chart()
    .createCanvas(canvas)
    .createData({ id: "rows", values })
    .createPointMark({ id: "points" })
    .encodeX({ target: "points", field: "x" })
    .encodeY({ target: "points", field: "y" });
}

function strokes(program, id) {
  return program.graphicSpec.objects[id].items.map(item => item.properties.stroke);
}

test("keeps point fill and stroke as independent categorical channels and legends", () => {
  const before = pointBase();
  const fillOptions = Object.freeze({ field: "fillGroup" });
  const strokeOptions = Object.freeze({ field: "strokeGroup" });
  const encoded = before
    .encodeColor(fillOptions)
    .encodeStroke(strokeOptions)
    .createLegend({ target: "points", channels: ["color"] })
    .createLegend({ target: "points", channels: ["stroke"] });

  assert.deepEqual(encoded.semanticSpec.layers[0].encoding.stroke, {
    field: "strokeGroup",
    fieldType: "nominal",
    scale: "stroke"
  });
  assert.deepEqual(
    encoded.graphicSpec.objects.points.items.map(item => [
      item.properties.fill,
      item.properties.stroke
    ]),
    [
      ["#4c78a8", "#4c78a8"],
      ["#4c78a8", "#f58518"],
      ["#f58518", "#4c78a8"],
      ["#f58518", "#f58518"]
    ]
  );
  assert.deepEqual(Object.keys(encoded.guideConfigs.legend), ["color", "stroke"]);
  assert.deepEqual(encoded.semanticSpec.guides.legend.stroke, {
    scale: "stroke",
    title: "strokeGroup"
  });
  assert.deepEqual(
    encoded.graphicSpec.objects.strokeLegendSymbolPoints.items.map(item => [
      item.properties.fill,
      item.properties.stroke,
      item.properties.strokeWidth
    ]),
    [
      ["#4c78a8", "#4c78a8", 1],
      ["#4c78a8", "#f58518", 1]
    ]
  );
  assert.equal(before.semanticSpec.layers[0].encoding.stroke, undefined);
  assert.deepEqual(fillOptions, { field: "fillGroup" });
  assert.deepEqual(strokeOptions, { field: "strokeGroup" });

  const selected = encoded.selectMarks({
    id: "outline-u",
    target: "points",
    channel: "stroke",
    op: "eq",
    value: "U"
  });
  assert.deepEqual(resolveStoredSelection(selected, "outline-u").keys, [
    "points/point/0",
    "points/point/2"
  ]);
  const highlighted = selected.highlightMarks({
    selection: "outline-u",
    stroke: "#00ff00",
    dimOthers: { opacity: 0.25 }
  });
  assert.deepEqual(
    highlighted.graphicSpec.objects.strokeLegendSymbolPoints.items.map(item => [
      item.properties.stroke,
      item.properties.opacity
    ]),
    [["#00ff00", undefined], ["#f58518", 0.25]]
  );
  assert.deepEqual(
    highlighted.graphicSpec.objects.colorLegendSymbols.items.map(
      item => item.properties.opacity
    ),
    [undefined, undefined]
  );
});

test("validates line stroke at final series grain before writing state", () => {
  const values = [
    { x: 0, y: 0, series: "A", outline: "U" },
    { x: 1, y: 1, series: "A", outline: "U" },
    { x: 0, y: 2, series: "B", outline: "V" },
    { x: 1, y: 3, series: "B", outline: "V" }
  ];
  const base = chart()
    .createCanvas(canvas)
    .createData({ id: "rows", values })
    .createLineMark({ id: "paths" })
    .encodeGroup({ field: "series" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
  const encoded = base.encodeStroke({ field: "outline" });

  assert.deepEqual(strokes(encoded, "paths"), ["#4c78a8", "#f58518"]);
  assert.deepEqual(
    resolveStoredSelection(encoded.selectMarks({
      id: "series-u",
      target: "paths",
      channel: "stroke",
      op: "eq",
      value: "U"
    }), "series-u").keys,
    ["paths/series/0"]
  );

  const mixed = chart()
    .createCanvas(canvas)
    .createData({ id: "rows", values: values.map((row, index) => ({
      ...row,
      outline: index === 1 ? "V" : row.outline
    })) })
    .createLineMark({ id: "paths" })
    .encodeGroup({ field: "series" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
  const snapshot = JSON.stringify(mixed);
  assert.throws(
    () => mixed.encodeStroke({ field: "outline" }),
    /one value within each series/
  );
  assert.equal(JSON.stringify(mixed), snapshot);
  assert.equal(mixed.trace.children.at(-1).op, "encodeY");
});

test("uses one continuous stroke mapper and preserves stroke legend transitions", () => {
  const gradient = pointBase()
    .encodeStroke({
      field: "measure",
      fieldType: "quantitative",
      scale: { domain: [0, 10], range: ["#000000", "#ffffff"] }
    })
    .createLegend({ target: "points", channels: ["stroke"] });

  assert.deepEqual(strokes(gradient, "points"), [
    "#000000", "#808080", "#ffffff", "#b3b3b3"
  ]);
  assert.equal(gradient.guideConfigs.legend.strokeGradient.scale, "stroke");
  assert.equal(gradient.graphicSpec.objects.strokeGradientStrips.items.length, 60);

  const interval = gradient.editStrokeScale({
    target: "points",
    type: "quantize",
    domain: [0, 10],
    range: ["red", "blue"]
  });
  assert.deepEqual(Object.keys(interval.guideConfigs.legend), ["strokeInterval"]);
  assert.deepEqual(strokes(interval, "points"), ["red", "blue", "blue", "blue"]);
  assert.deepEqual(
    interval.graphicSpec.objects.strokeIntervalSymbols.items.map(item => [
      item.properties.stroke,
      item.properties.strokeWidth
    ]),
    [["red", 1], ["blue", 1]]
  );
  const restored = interval.editStrokeScale({
    target: "points",
    type: "sequential",
    domain: [0, 10],
    range: ["#000000", "#ffffff"]
  });
  assert.deepEqual(Object.keys(restored.guideConfigs.legend), ["strokeGradient"]);
  assert.deepEqual(strokes(restored, "points"), strokes(gradient, "points"));
});

test("reassigns categorical and quantitative stroke with the correct legend family", () => {
  const categorical = pointBase()
    .encodeStroke({ field: "strokeGroup" })
    .createLegend({ target: "points", channels: ["stroke"] });
  const categoricalSnapshot = JSON.stringify(categorical);
  const quantitative = categorical.encodeStroke({
    field: "measure",
    fieldType: "quantitative"
  });

  assert.equal(JSON.stringify(categorical), categoricalSnapshot);
  assert.equal(
    quantitative.semanticSpec.scales.find(scale => scale.id === "stroke").type,
    "sequential"
  );
  assert.deepEqual(Object.keys(quantitative.guideConfigs.legend), [
    "strokeGradient"
  ]);
  assert.equal(quantitative.semanticSpec.guides.legend.stroke.title, "measure");
  assert.equal(quantitative.graphicSpec.objects.strokeLegendSymbolPoints, undefined);
  assert.ok(quantitative.graphicSpec.objects.strokeGradientStrips);

  const restored = quantitative.encodeStroke({
    field: "strokeGroup",
    fieldType: "nominal"
  });
  assert.equal(
    restored.semanticSpec.scales.find(scale => scale.id === "stroke").type,
    "ordinal"
  );
  assert.deepEqual(Object.keys(restored.guideConfigs.legend), ["stroke"]);
  assert.equal(restored.semanticSpec.guides.legend.stroke.title, "strokeGroup");
  assert.equal(restored.graphicSpec.objects.strokeGradientStrips, undefined);
  assert.ok(restored.graphicSpec.objects.strokeLegendSymbolPoints);

  const custom = pointBase()
    .encodeStroke({ field: "strokeGroup" })
    .createLegend({
      target: "points",
      channels: ["stroke"],
      symbol: { layers: [{ type: "point", size: 9 }] }
    });
  const customSnapshot = JSON.stringify(custom);
  assert.throws(
    () => custom.encodeStroke({ field: "measure", fieldType: "quantitative" }),
    /cannot discard custom family settings/
  );
  assert.equal(JSON.stringify(custom), customSnapshot);
});

test("cleans field and constant ownership without disturbing fill", () => {
  const field = pointBase()
    .encodeColor({ field: "fillGroup" })
    .encodeStroke({ field: "strokeGroup" })
    .createLegend({ target: "points", channels: ["stroke"] });
  const constant = field.encodeStroke({ value: "#123456" });

  assert.equal(constant.semanticSpec.layers[0].encoding.stroke, undefined);
  assert.equal(constant.semanticSpec.guides.legend?.stroke, undefined);
  assert.equal(constant.guideConfigs.legend?.stroke, undefined);
  assert.equal(constant.graphicSpec.objects.strokeLegendSymbolPoints, undefined);
  assert.equal(constant.markConfigs.points.stroke, "#123456");
  assert.deepEqual(strokes(constant, "points"), [
    "#123456", "#123456", "#123456", "#123456"
  ]);
  assert.deepEqual(
    constant.graphicSpec.objects.points.items.map(item => item.properties.fill),
    field.graphicSpec.objects.points.items.map(item => item.properties.fill)
  );

  const restored = constant.encodeStroke({ field: "strokeGroup" });
  assert.equal(restored.markConfigs.points.stroke, undefined);
  assert.deepEqual(strokes(restored, "points"), strokes(field, "points"));
  assert.notEqual(restored.semanticSpec.layers[0].encoding.color, undefined);
  assert.deepEqual(strokes(field, "points"), [
    "#4c78a8", "#f58518", "#4c78a8", "#f58518"
  ]);
});

test("supports every approved stroke mark family and raw stroke selection values", () => {
  const cases = [
    ["points", pointBase().encodeStroke({ field: "strokeGroup" })],
    ["area", chart().createCanvas(canvas).createData({ values: [
      { x: 0, low: 0, high: 1, series: "A", outline: "U" },
      { x: 1, low: 1, high: 2, series: "A", outline: "U" },
      { x: 0, low: 1, high: 2, series: "B", outline: "V" },
      { x: 1, low: 2, high: 3, series: "B", outline: "V" }
    ] }).createAreaMark({ id: "area" }).encodeGroup({ field: "series" })
      .encodeX({ field: "x" }).encodeYRange({ lower: "low", upper: "high" })
      .encodeStroke({ field: "outline" })],
    ["bar", chart().createCanvas(canvas).createData({ values: [
      { category: "A", value: 1, outline: "U" },
      { category: "B", value: 2, outline: "V" }
    ] }).createBarMark({ id: "bar" })
      .encodeX({ field: "category", fieldType: "nominal" })
      .encodeY({ field: "value", aggregate: "sum" })
      .encodeStroke({ field: "outline" })],
    ["rect", chart().createCanvas(canvas).createData({ values: [
      { x: 0, x2: 1, y: 0, y2: 1, outline: "U" },
      { x: 1, x2: 2, y: 1, y2: 2, outline: "V" }
    ] }).createRectMark({ id: "rect" })
      .encodeX({ field: "x" }).encodeX2({ field: "x2" })
      .encodeY({ field: "y" }).encodeY2({ field: "y2" })
      .encodeStroke({ field: "outline" })],
    ["arc", chart().createCanvas(canvas).createData({ values: [
      { category: "A", outline: "U" },
      { category: "B", outline: "V" }
    ] }).createArcMark({ id: "arc" })
      .encodeTheta({ field: "category", fieldType: "nominal" })
      .encodeR({ aggregate: "count", mapping: "radius-length" })
      .encodeStroke({ field: "outline" })],
    ["rule", chart().createCanvas(canvas).createData({ values: [
      { x: 0, outline: "U" }, { x: 1, outline: "V" }
    ] }).createRuleMark({ id: "rule" })
      .encodeX({ field: "x", fieldType: "quantitative" })
      .encodeStroke({ field: "outline" })],
    ["tick", chart().createCanvas(canvas).createData({ values: [
      { x: 0, y: 0, outline: "U" }, { x: 1, y: 1, outline: "V" }
    ] }).createTickMark({ id: "tick" })
      .encodeX({ field: "x" }).encodeY({ field: "y" })
      .encodeStroke({ field: "outline" })]
  ];

  for (const [id, program] of cases) {
    assert.deepEqual(
      [...new Set(strokes(program, id))],
      ["#4c78a8", "#f58518"],
      id
    );
    const selected = program.selectMarks({
      id: `${id}-u`,
      target: id,
      channel: "stroke",
      op: "eq",
      value: "U"
    });
    assert.equal(
      resolveStoredSelection(selected, `${id}-u`).keys.length,
      id === "points" ? 2 : 1,
      id
    );
  }
});

test("preserves Rule constant trace compatibility and rejects invalid requests atomically", () => {
  const rule = chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ id: "rows", values: [{ x: 1 }] })
    .createRuleMark({ id: "rule" })
    .encodeX({ datum: 1 });
  const legacy = rule.encodeStroke({ value: "red" });
  const trace = legacy.trace.children.at(-1);

  assert.equal(trace.op, "encodeStroke");
  assert.deepEqual(trace.children.map(child => child.op), ["rematerializeRuleMark"]);
  assert.deepEqual(strokes(legacy, "rule"), ["red"]);

  const point = pointBase();
  const invalid = [
    { value: "red", field: "strokeGroup" },
    { value: "" },
    { field: "strokeGroup", fieldType: "nominal", temporalUnit: "year" },
    { field: "missing" }
  ];
  for (const options of invalid) {
    const before = JSON.stringify(point);
    assert.throws(() => point.encodeStroke(options));
    assert.equal(JSON.stringify(point), before);
  }
  const text = chart()
    .createCanvas(canvas)
    .createData({ values: [{ x: 0, y: 0, outline: "U" }] })
    .createTextMark({ id: "labels", text: "label" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
  assert.throws(
    () => text.encodeStroke({ field: "outline" }),
    /stroke-capable mark/
  );
  assert.throws(
    () => point.editStrokeScale({ target: "points", range: ["red", "blue"] }),
    /could not find/
  );
});

test("edits compatible shared color and stroke scales and rejects incompatible edits atomically", () => {
  const shared = pointBase()
    .encodeColor({ field: "fillGroup", scale: { id: "appearance" } })
    .encodeStroke({ field: "fillGroup", scale: { id: "appearance" } });

  assert.equal(shared.semanticSpec.layers[0].encoding.color.scale, "appearance");
  assert.equal(shared.semanticSpec.layers[0].encoding.stroke.scale, "appearance");
  const edited = shared.editStrokeScale({
    target: "points",
    range: ["#111111", "#eeeeee"]
  });
  assert.deepEqual(
    edited.graphicSpec.objects.points.items.map(item => [
      item.properties.fill,
      item.properties.stroke
    ]),
    [
      ["#111111", "#111111"],
      ["#111111", "#111111"],
      ["#eeeeee", "#eeeeee"],
      ["#eeeeee", "#eeeeee"]
    ]
  );

  const before = JSON.stringify(shared);
  assert.throws(
    () => shared.editStrokeScale({
      target: "points",
      type: "sequential",
      domain: [0, 10],
      range: ["#000000", "#ffffff"]
    }),
    /compatible|categorical|nominal|ordinal/i
  );
  assert.equal(JSON.stringify(shared), before);
});

test("transitions both legends on a shared continuous color and stroke scale", () => {
  const shared = chart()
    .createCanvas({
      width: 1000,
      height: 900,
      margin: { top: 80, right: 320, bottom: 80, left: 80 }
    })
    .createData({ values: [
      { x: 0, y: 0, measure: 0 },
      { x: 1, y: 1, measure: 5 },
      { x: 2, y: 2, measure: 10 }
    ] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({
      field: "measure",
      fieldType: "quantitative",
      scale: { id: "appearance", domain: [0, 10] }
    })
    .encodeStroke({
      field: "measure",
      fieldType: "quantitative",
      scale: { id: "appearance" }
    })
    .createLegend({ target: "points", channels: ["color"] })
    .createLegend({ target: "points", channels: ["stroke"] });

  const interval = shared.editStrokeScale({
    target: "points",
    type: "quantize",
    domain: [0, 10],
    range: ["#111111", "#eeeeee"]
  });
  assert.deepEqual(
    Object.keys(interval.guideConfigs.legend),
    ["interval", "strokeInterval"]
  );
  assert.equal(interval.graphicSpec.objects.colorGradientStrips, undefined);
  assert.equal(interval.graphicSpec.objects.strokeGradientStrips, undefined);

  const restored = interval.editColorScale({
    target: "points",
    type: "sequential",
    domain: [0, 10],
    range: ["#000000", "#ffffff"]
  });
  assert.deepEqual(
    Object.keys(restored.guideConfigs.legend),
    ["gradient", "strokeGradient"]
  );
  assert.equal(restored.graphicSpec.objects.colorLegendSymbols, undefined);
  assert.equal(restored.graphicSpec.objects.strokeIntervalSymbols, undefined);
});

test("preserves an explicit zero stroke width in stroke legends", () => {
  const categorical = chart()
    .createCanvas(canvas)
    .createData({ values: [
      { x: 0, y: 0, outline: "U" },
      { x: 1, y: 1, outline: "V" }
    ] })
    .createPointMark({ id: "points", stroke: "black", strokeWidth: 0 })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeStroke({ field: "outline" })
    .createLegend({ target: "points", channels: ["stroke"] });

  assert.deepEqual(
    categorical.graphicSpec.objects.strokeLegendSymbolPoints.items.map(
      item => item.properties.strokeWidth
    ),
    [0, 0]
  );

  const continuousBase = chart()
    .createCanvas(canvas)
    .createData({ values: [
      { x: 0, y: 0, measure: 0 },
      { x: 1, y: 1, measure: 10 }
    ] })
    .createPointMark({
      id: "points",
      fill: "#abcdef",
      stroke: "black",
      strokeWidth: 0
    })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
  const gradient = continuousBase
    .encodeStroke({
      field: "measure",
      fieldType: "quantitative",
      scale: { domain: [0, 10] }
    })
    .createLegend({ target: "points", channels: ["stroke"] });
  assert.equal(
    gradient.graphicSpec.objects.strokeGradientStrips.items.every(item =>
      item.properties.fill === "#abcdef" && item.properties.strokeWidth === 0
    ),
    true
  );

  const interval = continuousBase
    .encodeStroke({
      field: "measure",
      fieldType: "quantitative",
      scale: {
        type: "quantize",
        domain: [0, 10],
        range: ["red", "blue"]
      }
    })
    .createLegend({ target: "points", channels: ["stroke"] });
  assert.equal(
    interval.graphicSpec.objects.strokeIntervalSymbols.items.every(item =>
      item.properties.fill === "#abcdef" && item.properties.strokeWidth === 0
    ),
    true
  );
});

test("preserves field stroke through theme and Canvas replay", () => {
  const encoded = pointBase().encodeStroke({ field: "strokeGroup" });
  const expected = strokes(encoded, "points");
  const themed = encoded.applyTheme({ theme: "dark" });
  assert.deepEqual(strokes(themed, "points"), expected);
  assert.deepEqual(strokes(themed.editCanvas({ width: 940 }), "points"), expected);
  assert.deepEqual(strokes(themed.removeTheme(), "points"), expected);
});

test("replays stroke-channel highlights into marks and the stroke legend", () => {
  const guided = pointBase()
    .encodeStroke({ field: "strokeGroup" })
    .createLegend({ target: "points", channels: ["stroke"] });
  const highlighted = guided.highlightMarks({
    target: "points",
    select: { channel: "stroke", op: "eq", value: "U" },
    stroke: "#00ff00",
    strokeWidth: 4,
    dimOthers: { opacity: 0.2 }
  });

  assert.deepEqual(
    highlighted.graphicSpec.objects.points.items.map(item => [
      item.properties.stroke,
      item.properties.strokeWidth,
      item.properties.opacity
    ]),
    [
      ["#f58518", 1, 0.2],
      ["#f58518", 1, 0.2],
      ["#00ff00", 4, undefined],
      ["#00ff00", 4, undefined]
    ]
  );
  assert.deepEqual(
    highlighted.graphicSpec.objects.strokeLegendSymbolPoints.items.map(item => [
      item.properties.stroke,
      item.properties.strokeWidth,
      item.properties.opacity
    ]),
    [["#00ff00", 4, undefined], ["#f58518", 1, 0.2]]
  );

  const replayed = highlighted.editCanvas({ width: 940 });
  assert.deepEqual(
    replayed.graphicSpec.objects.strokeLegendSymbolPoints.items.map(item => [
      item.properties.fill,
      item.properties.stroke,
      item.properties.strokeWidth,
      item.properties.opacity
    ]),
    highlighted.graphicSpec.objects.strokeLegendSymbolPoints.items.map(item => [
      item.properties.fill,
      item.properties.stroke,
      item.properties.strokeWidth,
      item.properties.opacity
    ])
  );
});

test("removeEncoding removes stroke-owned state while preserving fill", () => {
  const encoded = pointBase()
    .encodeColor({ field: "fillGroup" })
    .encodeStroke({ field: "strokeGroup" })
    .createLegend({ target: "points", channels: ["stroke"] });
  const removed = encoded.removeEncoding({ target: "points", channel: "stroke" });

  assert.equal(removed.semanticSpec.layers[0].encoding.stroke, undefined);
  assert.equal(removed.semanticSpec.guides.legend?.stroke, undefined);
  assert.equal(removed.guideConfigs.legend?.stroke, undefined);
  assert.equal(removed.graphicSpec.objects.strokeLegendSymbolPoints, undefined);
  assert.equal(removed.semanticSpec.layers[0].encoding.color.scale, "color");
  assert.deepEqual(
    removed.graphicSpec.objects.points.items.map(item => item.properties.fill),
    encoded.graphicSpec.objects.points.items.map(item => item.properties.fill)
  );
  assert.notEqual(
    removed.semanticSpec.scales.find(scale => scale.id === "stroke"),
    undefined
  );
});

test("renders field stroke colors consistently through Canvas, SVG, PNG, and PDF", async () => {
  const program = chart()
    .createCanvas({ width: 120, height: 100, margin: 20 })
    .createData({ values: [
      { x: 0, y: 0, outline: "U" },
      { x: 1, y: 1, outline: "V" }
    ] })
    .createPointMark({ id: "points", stroke: "black", strokeWidth: 3 })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeStroke({
      field: "outline",
      scale: { domain: ["U", "V"], range: ["#ff0000", "#0000ff"] }
    });
  const context = createMockCanvasContext();
  render(program, context);
  assert.deepEqual(
    findCanvasCalls(context, "stroke").map(call => [
      call.strokeStyle,
      call.lineWidth
    ]),
    [["#ff0000", 3], ["#0000ff", 3]]
  );

  const svg = renderToSVG(program);
  assert.match(svg, /stroke="#ff0000" stroke-width="3"/);
  assert.match(svg, /stroke="#0000ff" stroke-width="3"/);

  const directory = await mkdtemp(join(tmpdir(), "ggaction-stroke-color-"));
  try {
    const pngPath = join(directory, "stroke.png");
    const pdfPath = join(directory, "stroke.pdf");
    const png = await renderToPNG(program, { output: pngPath, pixelRatio: 2 });
    const pdf = await renderToPDF(program, { output: pdfPath });
    const pngBytes = await readFile(pngPath);
    const pdfBytes = await readFile(pdfPath);

    assert.deepEqual(
      [...pngBytes.subarray(0, 8)],
      [137, 80, 78, 71, 13, 10, 26, 10]
    );
    assert.equal(png.width, 240);
    assert.equal(png.height, 200);
    assert.equal(pdf.bytes, pdfBytes.length);
    assert.match(pdfBytes.toString("latin1", 0, 8), /^%PDF-/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("promotes separate categorical and continuous stroke legends through facets", () => {
  const categorical = pointBase()
    .encodeColor({ field: "fillGroup" })
    .encodeStroke({ field: "strokeGroup" })
    .createLegend({ target: "points", channels: ["color"] })
    .createLegend({ target: "points", channels: ["stroke"] })
    .facet({ field: "facet", guides: { legend: "shared" } });
  const owner = categorical.graphicSpec.objects["facet-shared-legend"];
  assert.deepEqual(Object.keys(categorical.guideConfigs.legend), ["color", "stroke"]);
  assert.equal(owner.children.includes("colorLegendSymbols"), true);
  assert.equal(owner.children.includes("strokeLegendSymbolPoints"), true);

  const continuous = pointBase()
    .encodeStroke({ field: "measure", fieldType: "quantitative" })
    .createLegend({ target: "points", channels: ["stroke"] })
    .facet({ field: "facet", guides: { legend: "shared" } });
  assert.equal(continuous.guideConfigs.legend.strokeGradient.scale, "stroke");
  assert.equal(
    continuous.graphicSpec.objects["facet-shared-legend"].children.includes(
      "strokeGradientStrips"
    ),
    true
  );
});
