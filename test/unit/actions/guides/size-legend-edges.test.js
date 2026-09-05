import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { resolveConcreteGraphicBounds } from "../../../../src/grammar/schemas/graphicBounds.js";

const edges = ["right", "left", "top", "bottom"];
function base(create = chart) {
  return create().createCanvas({ width: 1000, height: 800, margin: 250 })
    .createData({ values: [{ x: 1, y: 1, m: 0, g: "A" }, { x: 2, y: 2, m: 5, g: "B" }, { x: 3, y: 1, m: 10, g: "B" }] })
    .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeSize({ field: "m", scale: { range: [4 * Math.PI, 36 * Math.PI] } });
}
const samples = p => p.graphicSpec.objects.sizeLegendSymbols.items.map(item => item.properties);

test("Full and Basic create size content with four-edge layout and sampled areas", () => {
  for (const create of [chart, basicChart]) for (const position of edges) {
    const p = base(create).createLegend({ channels: ["size"], position, layout: "edge", count: 3,
      title: "Mass", border: true, labels: { color: "purple" } });
    assert.equal(p.guideConfigs.legend.size.position, position);
    assert.deepEqual(samples(p).map(item => item.radius), [2, Math.sqrt(20), 6]);
    assert.equal(p.graphicSpec.objects.sizeLegendTitle.properties.text, "Mass");
    assert.equal(p.graphicSpec.objects.sizeLegendLabels.items[0].properties.fill, "purple");
  }
});

test("size edge edits and content replacement converge with direct creation and Canvas replay", () => {
  for (const from of edges) for (const position of edges) {
    const original = base().createLegend({ position: from, border: true });
    const actual = original.editLegendLayout({ position });
    assert.deepEqual(actual.graphicSpec, base().createLegend({ position, border: true }).graphicSpec);
    assert.deepEqual(actual.editCanvas({ width: 1100 }).graphicSpec,
      original.editCanvas({ width: 1100 }).editLegend({ position }).graphicSpec);
    assert.deepEqual(actual.editLegend({ channels: ["size"], position }).graphicSpec, actual.graphicSpec);
    assert.deepEqual(actual.removeLegend().createLegend({ position, border: true }).graphicSpec, actual.graphicSpec);
    const noBorder = actual.editLegend({ border: false });
    assert.equal(noBorder.graphicSpec.objects.sizeLegendBackground, undefined);
    assert.deepEqual(noBorder.editLegend({ border: true }).graphicSpec, actual.graphicSpec);
  }
});

test("size grids preserve styles and title visibility through scale and filter replay", () => {
  for (const position of ["top", "bottom"]) for (const align of ["left", "center", "right"]) {
    for (const direction of ["horizontal", "vertical"]) {
      const p = base().createLegend({ position, align, direction, columns: 2, count: 3, titlePosition: "left",
        border: true, labels: { offset: 18 }, titleStyle: { fontSize: 16 } });
      const scaled = p.editScale({ id: "size", range: [25 * Math.PI, 900 * Math.PI] });
      const rows = [...new Set(samples(scaled).map(item => item.y))];
      assert.equal(rows.length, 2);
      assert.ok(Math.abs(rows[1] - rows[0]) >= 60);
      const hidden = scaled.editLegend({ title: false });
      assert.equal(hidden.graphicSpec.objects.sizeLegendTitle, undefined);
      const filter = { field: "g", op: "eq", value: "B" };
      assert.deepEqual(hidden.filterMarks(filter).editCanvas({ width: 1200 }).graphicSpec,
        hidden.editCanvas({ width: 1200 }).filterMarks(filter).graphicSpec);
      assert.deepEqual(hidden.editLegend({ title: "auto" }).graphicSpec, scaled.graphicSpec);
    }
  }
});

test("large circles reserve real sample width, title separation and label gaps", () => {
  for (const position of edges) {
    const p = base().editScale({ id: "size", range: [400 * Math.PI, 1600 * Math.PI] })
      .createLegend({ position, count: 2, border: true });
    for (const [index, item] of samples(p).entries()) {
      const label = p.graphicSpec.objects.sizeLegendLabels.items[index].properties;
      assert.ok(label.x - item.x - item.radius >= 12);
    }
    if (["left", "right"].includes(position)) {
      assert.equal(samples(p)[1].y - samples(p)[0].y, 80);
      const title = p.graphicSpec.objects.sizeLegendTitle.properties;
      assert.ok(samples(p)[0].y - samples(p)[0].radius - title.y - title.fontSize / 2 >= 12);
    }
  }
});

test("size bounds and incompatible options reject immutably while hidden titles keep stored content", () => {
  const source = base();
  const p = source.createLegend({ border: true });
  const before = JSON.stringify(p);
  for (const patch of [{ layout: null }, { layout: "legacy-bottom" }, { position: "bad" }, { direction: "bad" },
    { align: "bad" }, { direction: "horizontal" }, { columns: 2 }, { columns: 0 }, { titlePosition: "left" },
    { offset: -1 }, { itemGap: 0 }, { inheritAppearance: true }, { symbol: "point" }, { gradient: {} }, { order: "scale" },
    { border: { padding: -1 } }, { titleStyle: { offset: 10 } }, { title: "W".repeat(100) }]) {
    assert.throws(() => p.editLegend(patch), JSON.stringify(patch));
    assert.throws(() => source.createLegend(patch), JSON.stringify(patch));
    assert.equal(JSON.stringify(p), before);
  }
  assert.throws(() => p.editCanvas({ width: 600, margin: { right: 20 } }), /margin space/);
  assert.throws(() => p.editScale({ id: "size", range: [1, 1e8] }), /margin space/);
  const large = source.editCanvas({ width: 2000, margin: { right: 1200 } }).createLegend({ title: "W".repeat(60) });
  const hidden = large.editLegend({ title: false }).editCanvas({ width: 1000, margin: { right: 250 } });
  assert.equal(hidden.guideConfigs.legend.size.title, "W".repeat(60));
  assert.throws(() => hidden.editLegend({ title: "W".repeat(60) }), /margin space/);
});

test("combined side lanes retain nested size borders and accommodate large circles and requested label offsets", () => {
  for (const position of ["left", "right"]) {
    const source = base().editCanvas({ width: 1200, height: 1000, margin: 300 })
      .editScale({ id: "size", range: [400 * Math.PI, 1600 * Math.PI] }).encodeColor({ field: "g" });
    const requested = source.createLegend({ channels: ["color", "size"], count: 2, position, labels: { offset: 45 } });
    const requestedLast = samples(requested).at(-1);
    assert.ok(requested.graphicSpec.objects.sizeLegendLabels.items.at(-1).properties.x - requestedLast.x - requestedLast.radius >= 45);
    assert.equal(requested.editLegendLabels({ color: "red" }).guideConfigs.legend.size.labels.offset, 45);
    const size = source.createLegend({ channels: ["size"], count: 2, position, border: { padding: 5 } });
    const combined = size.createLegend({ channels: ["color", "size"], position, border: true });
    const outer = resolveConcreteGraphicBounds(combined.graphicSpec, "colorLegendBackground");
    const inner = resolveConcreteGraphicBounds(combined.graphicSpec, "sizeLegendBackground");
    assert.ok(outer.left <= inner.left && outer.right >= inner.right && outer.top <= inner.top && outer.bottom >= inner.bottom);
    for (const [index, item] of samples(combined).entries()) {
      assert.ok(combined.graphicSpec.objects.sizeLegendLabels.items[index].properties.x - item.x - item.radius >= 12);
    }
    const wider = combined.editLegend({ labels: { offset: 45 } });
    assert.ok(wider.graphicSpec.objects.sizeLegendLabels.items[0].properties.x - samples(wider)[0].x >
      combined.graphicSpec.objects.sizeLegendLabels.items[0].properties.x - samples(combined)[0].x);
    assert.deepEqual(combined.removeLegend({ channels: ["color"] }).graphicSpec, size.graphicSpec);
    assert.deepEqual(combined.editCanvas({ width: 1400 }).editLegend({ channels: ["color", "size"] }).graphicSpec,
      combined.editLegend({ channels: ["color", "size"] }).editCanvas({ width: 1400 }).graphicSpec);
  }
});
