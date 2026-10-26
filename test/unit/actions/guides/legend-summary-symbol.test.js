import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

const domain = Array.from({ length: 44 }, (_, index) => `Group ${index}`);
const colors = domain.map((_, index) => `#${(100000 + index * 1000).toString(16).padStart(6, "0")}`);
const rows = Array.from({ length: 906 }, (_, index) => ({
  x: Math.floor(index / 44), y: index % 7 + 1, group: domain[index % 44]
}));
const legend = { channels: ["stroke"], overflow: { maxItems: 29, summarySymbol: "first-hidden" },
  itemGap: 12, labels: { fontSize: 10 }, titleStyle: { fontSize: 11 },
  symbol: { layers: [{ type: "line", length: 5, lineWidth: 1.5, opacity: 0.7 }] } };
function source(create = chart) {
  return create().createCanvas({ width: 700, height: 700,
    margin: { left: 50, right: 300, top: 50, bottom: 50 } })
    .createData({ id: "data", values: rows })
    .createLinePlot({ id: "paths", x: "x", y: "y", groupBy: "group", guides: false })
    .encodeStroke({ field: "group", fieldType: "nominal", scale: { domain, range: colors } });
}
const symbols = program => program.graphicSpec.objects.strokeLegendSymbolLines.items;
const labels = program => program.graphicSpec.objects.strokeLegendLabels.items.map(item => item.properties.text);

test("explicit summary sample paints the first hidden category while preserving every source row and path", () => {
  for (const create of [chart]) {
    const seed = source(create), before = serializeProgram(seed);
    const normal = seed.createLegend({ ...legend, overflow: { maxItems: 29 } });
    const p = seed.createGuides({ axes: false, grid: false, legend });
    assert.equal(symbols(normal).length, 29);
    assert.equal(symbols(p).length, 30);
    assert.deepEqual(labels(p), [...domain.slice(0, 29), "…15 entries"]);
    assert.deepEqual(labels(p), labels(normal));
    assert.deepEqual(p.resolvedScales.stroke.domain, domain);
    assert.deepEqual(p.semanticSpec.datasets[0].values, rows);
    assert.equal(p.graphicSpec.objects.paths.items.length, 44);
    assert.equal(p.graphicSpec.objects.paths.items.reduce((n, item) => n + item.properties.commands.filter(c => ["M", "L"].includes(c.op)).length, 0), 906);
    assert.deepEqual(p.graphicSpec.objects.paths, seed.graphicSpec.objects.paths);
    const sample = symbols(p)[29].properties;
    assert.equal(sample.stroke, colors[29]);
    assert.equal(sample.x2 - sample.x1, 5);
    assert.equal(sample.strokeWidth, 1.5);
    assert.equal(sample.opacity, 0.7);
    const label = p.graphicSpec.objects.strokeLegendLabels.items[29].properties;
    assert.equal(label.textBaseline, "top");
    assert.equal(sample.y1, label.y + 5);
    assert.equal(serializeProgram(seed), before);
  }
});

test("summary sample renders the same pixels as an independent added line primitive", async () => {
  const { renderToPNGBuffer } = await import("../../../../src/renderers/png.js");
  const seed = source();
  const normal = seed.createLegend({ ...legend, overflow: { maxItems: 29 } });
  const previous = symbols(normal).at(-1);
  const expected = normal.editGraphics({ target: "strokeLegendSymbolLines", property: "items", value: [
    ...symbols(normal).map(item => ({ type: "line", properties: item.properties })), { type: "line", properties: {
      ...previous.properties, stroke: colors[29],
      y1: previous.properties.y1 + 12, y2: previous.properties.y2 + 12
    } }
  ] });
  const actual = seed.createLegend(legend);
  assert.deepEqual(actual.graphicSpec, expected.graphicSpec);
  assert.deepEqual(await renderToPNGBuffer(actual), await renderToPNGBuffer(expected));
  assert.notDeepEqual(await renderToPNGBuffer(actual), await renderToPNGBuffer(normal));
});

test("Basic line authoring supports the same summary policy through categorical color", () => {
  const p = basicChart().createCanvas({ width: 700, height: 700, margin: { right: 300 } })
    .createData({ values: rows })
    .createLinePlot({ x: "x", y: "y", groupBy: "group", guides: false,
      color: { field: "group", scale: { domain, range: colors } } })
    .createGuides({ axes: false, grid: false, legend: { ...legend, channels: ["color"] } });
  assert.equal(p.graphicSpec.objects.seriesLegendSymbols.items.length, 30);
  assert.equal(p.graphicSpec.objects.seriesLegendSymbols.items[29].properties.stroke, colors[29]);
  assert.equal(p.graphicSpec.objects.seriesLegendLabels.items[29].properties.text, "…15 entries");
});

test("summary samples follow final legend order, scale edits, resize and persistence", () => {
  const p = source().createLegend(legend), snapshot = serializeProgram(p);
  const ordered = p.editLegend({ order: { values: [...domain].reverse() } });
  assert.deepEqual(labels(ordered), [...domain].reverse().slice(0, 29).concat("…15 entries"));
  assert.equal(symbols(ordered)[29].properties.stroke, colors[14]);
  const recolored = ordered.editStrokeScale({ target: "paths", range: [...colors].reverse() });
  assert.equal(symbols(recolored)[29].properties.stroke, colors[29]);
  const resized = recolored.editCanvas({ height: 760 });
  assert.deepEqual(deserializeProgram(serializeProgram(resized)).graphicSpec, resized.graphicSpec);
  assert.deepEqual(resized.rematerializeLegend().graphicSpec, resized.graphicSpec);
  assert.equal(symbols(resized).length, 30);
  assert.equal(serializeProgram(p), snapshot);
});

test("overflow reset and zero hidden entries remove the summary sample and converge with direct creation", () => {
  const seed = source(), p = seed.createLegend(legend);
  for (const overflow of [false, { maxItems: 44, summarySymbol: "first-hidden" },
    { maxItems: 50, summarySymbol: "first-hidden" }, { maxItems: 29 }]) {
    const edited = p.editLegend({ overflow });
    assert.deepEqual(edited.graphicSpec, seed.createLegend({ ...legend, overflow }).graphicSpec);
    assert.equal(symbols(edited).length, overflow === false || overflow.maxItems >= 44 ? 44 : 29);
  }
});

test("invalid summary policies, nonline recipes and persisted tampering fail atomically", () => {
  const seed = source(), before = serializeProgram(seed);
  for (const summarySymbol of [true, false, null, "last-visible", ""]) {
    assert.throws(() => seed.createLegend({ ...legend, overflow: { maxItems: 29, summarySymbol } }), /summarySymbol/);
  }
  assert.throws(() => seed.createLegend({ ...legend, symbol: { layers: [{ type: "point" }] } }), /line/);
  const point = chart().createCanvas({ width: 800, height: 700, margin: 200 })
    .createData({ values: domain.map((g, i) => ({ x: i, y: i, g })) })
    .createScatterPlot({ x: "x", y: "y", guides: false }).encodeSize({ field: "g", fieldType: "nominal" });
  assert.throws(() => point.createLegend({ channels: ["size"], overflow: legend.overflow }), /summarySymbol/);
  const p = seed.createLegend(legend), config = structuredClone(p.materializationConfigs);
  config.guides.legend.stroke.overflow.summarySymbol = "invalid";
  assert.throws(() => serializeProgram(p._clone({ materializationConfigs: config })), /summarySymbol/);
  assert.equal(serializeProgram(seed), before);
});
