import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { chart as basicChart } from "../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { resolveConcreteGraphicBounds } from "../../../src/grammar/schemas/graphicBounds.js";

const rows = Array.from({ length: 107 }, (_, i) => ({ x: i, y: i % 7, group: `item-${i}` }));
const base = (factory = chart) => factory().createCanvas({ width: 600, height: 600, margin: 60 })
  .createData({ id: "rows", values: rows }).createScatterPlot({ x: "x", y: "y", color: "group", guides: false });
const options = { position: "top-left", overflow: { maxItems: 29 }, title: false,
  itemGap: 12, border: { background: "white" } };
const labels = p => p.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties.text);

test("bounded categorical legends preserve all data and anchor inside each plot corner", () => {
  for (const factory of [chart, basicChart]) {
    const source = base(factory);
    for (const position of ["top-left", "top-right", "bottom-left", "bottom-right"]) {
      const p = source.createLegend({ ...options, position });
      assert.deepEqual(labels(p), [...rows.slice(0, 29).map(row => row.group), "…78 entries"]);
      assert.equal(p.graphicSpec.objects.colorLegendSymbols.items.length, 29);
      assert.equal(p.guideConfigs.legend.color.domain.length, 107);
      assert.deepEqual(p.semanticSpec.datasets, source.semanticSpec.datasets);
      assert.deepEqual(p.resolvedScales, source.resolvedScales);
      const bounds = resolveConcreteGraphicBounds(p.graphicSpec, "colorLegendBackground");
      assert.ok(bounds.left >= 60 && bounds.right <= 540 && bounds.top >= 60 && bounds.bottom <= 540);
      assert.ok(Math.abs((position.endsWith("left") ? bounds.left - 60 : 540 - bounds.right) - 8) < 1e-6);
      assert.ok(Math.abs((position.startsWith("top") ? bounds.top - 60 : 540 - bounds.bottom) - 8) < 1e-6);
      assert.match(renderToSVG(p), /…78 entries/);
      assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
    }
  }
});

test("legend edits, data revisions and resize recompute visible items without losing the domain", () => {
  const p = base().createLegend(options);
  const stored = serializeProgram(p);
  const edited = p.editLegend({ position: "bottom-right", overflow: { maxItems: 5 } });
  assert.equal(labels(edited).at(-1), "…102 entries");
  assert.equal(edited.graphicSpec.objects.colorLegendSymbols.items.length, 5);
  assert.equal(edited.guideConfigs.legend.color.domain.length, 107);
  const resized = edited.editCanvas({ width: 700 });
  assert.equal(labels(resized).at(-1), "…102 entries");
  const bounds = resolveConcreteGraphicBounds(resized.graphicSpec, "colorLegendBackground");
  assert.equal(bounds.right, 632);
  const revised = p.reviseData({ source: "rows", id: "revised", values: rows.slice(0, 8) });
  assert.equal(labels(revised).length, 8);
  assert.equal(revised.graphicSpec.objects.colorLegendSymbols.items.length, 8);
  assert.deepEqual(labels(revised.editLegend({ overflow: false })), labels(revised));
  assert.equal(revised.removeLegend().graphicSpec.objects.colorLegendLabels, undefined);
  assert.equal(serializeProgram(p), stored);
});

test("invalid overflow and genuinely oversized plot legends fail atomically", () => {
  const source = base();
  const stored = serializeProgram(source);
  for (const overflow of [null, {}, { maxItems: 0 }, { maxItems: 1.5 },
    { maxItems: 2, summary: "unknown" }, { maxItems: 2, extra: true }]) {
    assert.throws(() => source.createLegend({ ...options, overflow }));
  }
  assert.throws(() => source.createLegend({ ...options, overflow: false }), /does not fit/);
  assert.equal(serializeProgram(source), stored);
});

test("single-point line groups retain nominal numeric labels and correct hidden counts", () => {
  const values = rows.map((row, group) => ({ ...row, group }));
  const p = chart().createCanvas({ width: 600, height: 600, margin: 60 }).createData({ values })
    .createLinePlot({ x: "x", y: "y", groupBy: "group", color: { field: "group", fieldType: "nominal" }, guides: false })
    .createLegend(options);
  const actual = p.graphicSpec.objects.seriesLegendLabels.items.map(item => item.properties.text);
  assert.deepEqual(actual, [...Array.from({ length: 29 }, (_, i) => String(i)), "…78 entries"]);
  assert.equal(p.graphicSpec.objects.seriesLegendSymbols.items.length, 29);
  assert.equal(p.guideConfigs.legend.series.domain.length, 107);
  const reversed = p.editLegend({ order: { values: values.map(row => row.group).reverse() }, overflow: { maxItems: 3 } });
  assert.deepEqual(reversed.graphicSpec.objects.seriesLegendLabels.items.map(item => item.properties.text),
    ["106", "105", "104", "…104 entries"]);
});

test("raw singleton lines keep positions but paint no synthetic segments", async () => {
  const { renderToPNGBuffer } = await import("../../../src/renderers/png.js");
  const source = chart().createCanvas({ width: 200, height: 160, margin: 30 })
    .createData({ values: [{ x: 1, y: 2, group: "A" }, { x: 3, y: 4, group: "B" }] });
  const p = source.createLinePlot({ x: "x", y: "y", groupBy: "group", guides: false });
  assert.equal(p.graphicSpec.objects.linePlot.items.length, 2);
  for (const item of p.graphicSpec.objects.linePlot.items) {
    assert.equal(item.properties.commands.length, 1);
    assert.equal(item.properties.commands[0].op, "M");
  }
  assert.deepEqual((await renderToPNGBuffer(p)).buffer, (await renderToPNGBuffer(source)).buffer);
});
