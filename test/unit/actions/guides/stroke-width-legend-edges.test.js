import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";

const edges = ["right", "left", "top", "bottom"];
function base(create = chart, type = "linear") {
  return create().createCanvas({ width: 1000, height: 800, margin: { left: 250, right: 250, top: 250, bottom: 250 } })
    .createData({ values: [{ x: 1, y: 1, g: "A", m: 1 }, { x: 2, y: 2, g: "A", m: 1 },
      { x: 1, y: 2, g: "B", m: 10 }, { x: 2, y: 1, g: "B", m: 10 }] })
    .createLineMark().encodeX({ field: "x" }).encodeY({ field: "y" }).encodeGroup({ field: "g" })
    .encodeStrokeWidth({ field: "m", scale: { type, domain: [1, 10], range: [2, 10] } });
}
const samples = p => p.graphicSpec.objects.strokeWidthLegendSymbols.items.map(item => item.properties);

test("Full places every quantitative stroke-width scale at each edge", () => {
  for (const type of ["linear", "log", "pow", "sqrt", "symlog"]) {
    const source = base(chart, type);
    for (const position of edges) {
      const p = source.createLegend({ position, count: 3, border: true, title: "Width" });
      assert.equal(p.guideConfigs.legend.strokeWidth.position, position);
      assert.equal(p.graphicSpec.objects.strokeWidthLegendTitle.properties.text, "Width");
      assert.equal(samples(p)[0].strokeWidth, 2);
      assert.equal(samples(p)[2].strokeWidth, 10);
      assert.ok(samples(p)[1].strokeWidth >= 2 && samples(p)[1].strokeWidth <= 10);
      assert.deepEqual(samples(p).map(item => item.strokeWidth), samples(source.createLegend({ count: 3 })).map(item => item.strokeWidth));
    }
  }
});

test("stroke-width edge edits, content replacement and removal converge with creation and Canvas replay", () => {
  for (const from of edges) for (const position of edges) {
    const original = base().createLegend({ position: from, border: true });
    const actual = original.editLegendLayout({ position });
    assert.deepEqual(actual.graphicSpec, base().createLegend({ position, border: true }).graphicSpec);
    assert.deepEqual(actual.editCanvas({ width: 1100 }).graphicSpec,
      original.editCanvas({ width: 1100 }).editLegend({ position }).graphicSpec);
    assert.deepEqual(actual.editLegend({ channels: ["strokeWidth"], position }).graphicSpec, actual.graphicSpec);
    assert.deepEqual(actual.removeLegend().createLegend({ position, border: true }).graphicSpec, actual.graphicSpec);
    const noBorder = actual.editLegend({ border: false });
    assert.equal(noBorder.graphicSpec.objects.strokeWidthLegendBackground, undefined);
    assert.deepEqual(noBorder.editLegend({ border: true }).graphicSpec, actual.graphicSpec);
  }
});

test("stroke-width grids measure thick samples and preserve styled hidden titles on replay", () => {
  for (const position of ["top", "bottom"]) for (const align of ["left", "center", "right"]) {
    for (const direction of ["horizontal", "vertical"]) {
      const options = { position, align, direction, columns: 2, count: 3, titlePosition: "left", border: true,
        labels: { color: "purple", fontSize: 14, offset: 18 }, titleStyle: { fontSize: 16 } };
      const p = base().createLegend(options).editScale({ id: "strokeWidth", range: [5, 60] });
      const rows = [...new Set(samples(p).map(item => item.y1))];
      assert.equal(rows.length, 2);
      assert.ok(Math.abs(rows[1] - rows[0]) >= 60);
      const hidden = p.editLegend({ title: false });
      assert.equal(hidden.graphicSpec.objects.strokeWidthLegendTitle, undefined);
      assert.deepEqual(hidden.editScale({ id: "strokeWidth", range: [2, 10] }).graphicSpec,
        base().createLegend(options).editLegend({ title: false }).graphicSpec);
      assert.deepEqual(hidden.editLegend({ title: "auto" }).graphicSpec, p.graphicSpec);
    }
  }
});

test("stroke-width overflow and invalid options reject immutably", () => {
  const source = base();
  const p = source.createLegend({ border: true });
  const before = JSON.stringify(p);
  const sourceBefore = JSON.stringify(source);
  for (const patch of [{ layout: null }, { layout: "legacy-bottom" }, { position: "bad" }, { direction: "bad" },
    { align: "bad" }, { direction: "horizontal" }, { columns: 2 }, { columns: 0 }, { titlePosition: "left" },
    { offset: -1 }, { itemGap: 0 }, { symbol: "line" }, { gradient: {} }, { order: "scale" },
    { border: { padding: -1 } }, { titleStyle: { offset: 10 } }, { title: "W".repeat(100) }]) {
    assert.throws(() => p.editLegend(patch), JSON.stringify(patch));
    assert.throws(() => source.createLegend(patch), JSON.stringify(patch));
    assert.equal(JSON.stringify(p), before);
    assert.equal(JSON.stringify(source), sourceBefore);
  }
  assert.throws(() => p.editCanvas({ width: 600, margin: { right: 20 } }), /margin space/);
  assert.throws(() => p.editScale({ id: "strokeWidth", range: [1, 500] }), /margin space/);
  const large = source.editCanvas({ width: 2000, margin: { right: 1200 } }).createLegend({ title: "W".repeat(60) });
  const hidden = large.editLegend({ title: false }).editCanvas({ width: 1000, margin: { right: 250 } });
  assert.equal(hidden.guideConfigs.legend.strokeWidth.title, "W".repeat(60));
  assert.throws(() => hidden.editLegend({ title: "W".repeat(60) }), /margin space/);
  assert.equal(JSON.stringify(p), before);
});

test("stroke-width and opacity blocks share all edge lanes in either creation order", () => {
  for (const position of edges) {
    const source = base().encodeOpacity({ field: "m" });
    const width = { channels: ["strokeWidth"], position, count: 2, border: true };
    const opacity = { channels: ["opacity"], position, count: 2, border: true };
    const a = source.createLegend(width).createLegend(opacity);
    const b = source.createLegend(opacity).createLegend(width);
    for (const id of ["strokeWidthLegendSymbols", "strokeWidthLegendLabels", "strokeWidthLegendTitle", "strokeWidthLegendBackground", "opacityLegendBackground"]) {
      assert.deepEqual(a.graphicSpec.objects[id], b.graphicSpec.objects[id]);
    }
    assert.deepEqual(a.removeLegend({ channels: ["opacity"] }).graphicSpec, source.createLegend(width).graphicSpec);
  }
});

test("thick side samples keep a visible gap below the title", () => {
  for (const position of ["left", "right"]) {
    const p = base().editScale({ id: "strokeWidth", range: [60, 60] }).createLegend({ position, count: 3 });
    const title = p.graphicSpec.objects.strokeWidthLegendTitle.properties;
    assert.equal(samples(p)[0].y1 - 30 - (title.y + title.fontSize / 2), 12);
    assert.equal(samples(p)[1].y1 - samples(p)[0].y1, 60);
    assert.deepEqual(p.editLegend({ title: false }).graphicSpec,
      base().createLegend({ position, count: 3 }).editLegend({ title: false })
        .editScale({ id: "strokeWidth", range: [60, 60] }).graphicSpec);
  }
});

test("large side labels keep their occupied box below a large title", () => {
  const p = base().editCanvas({ width: 1600, height: 1000, margin: { right: 600 } })
    .createLegend({ count: 2, labels: { fontSize: 64 }, titleStyle: { fontSize: 48 } });
  const title = p.graphicSpec.objects.strokeWidthLegendTitle.properties;
  const label = p.graphicSpec.objects.strokeWidthLegendLabels.items[0].properties;
  assert.equal(label.y - 32 - (title.y + 24), 12);
  assert.equal(label.y, 338);
});
