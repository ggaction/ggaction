import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { resolveConcreteGraphicBounds, unionConcreteGraphicBounds } from "../../../../src/grammar/schemas/graphicBounds.js";

const edges = ["right", "left", "top", "bottom"];
function base(create = chart) {
  return create().createCanvas({ width: 1200, height: 1000, margin: 300 })
    .createData({ values: [{ x: 1, y: 1, m: 0, g: "A" }, { x: 2, y: 2, m: 5, g: "B" }, { x: 3, y: 1, m: 10, g: "C" }] })
    .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeColor({ field: "g" }).encodeShape({ field: "g" })
    .encodeSize({ field: "m", scale: { range: [4 * Math.PI, 36 * Math.PI] } });
}
const options = { count: 3, offset: 40, itemGap: 20, border: true, labels: { color: "purple" } };
const bounds = (p, ids) => unionConcreteGraphicBounds(p.graphicSpec, ids);
const occupied = (p, prefix) => bounds(p, Object.keys(p.graphicSpec.objects).filter(id => id.startsWith(prefix)));
const contains = (a, b) => a.left <= b.left + 1e-9 && a.right >= b.right - 1e-9 && a.top <= b.top + 1e-9 && a.bottom >= b.bottom - 1e-9;
const disjoint = (a, b) => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test("Full and Basic create color, shape and combined recipes with size on all edges", () => {
  for (const create of [chart, basicChart]) for (const position of edges) {
    for (const channels of [["color", "size"], ["shape", "size"], ["color", "shape", "size"]]) {
      const p = base(create).createLegend({ ...options, position, channels });
      const prefix = channels.includes("shape") ? "seriesLegend" : "colorLegend";
      const b = resolveConcreteGraphicBounds(p.graphicSpec, `${prefix}Background`);
      assert.ok(contains(b, occupied(p, "sizeLegend")));
      const c = bounds(p, Object.keys(p.graphicSpec.objects).filter(id => id.startsWith(prefix) && !id.endsWith("Background")));
      assert.ok(disjoint(c, occupied(p, "sizeLegend")));
      assert.deepEqual(p.graphicSpec.objects.sizeLegendSymbols.items.map(item => item.properties.radius), [2, Math.sqrt(20), 6]);
      if (["top", "bottom"].includes(position)) near(position === "top" ? 300 - b.bottom : b.top - 700, 40);
    }
  }
});

test("combined edge edits, whole-content replacement and Canvas replay converge", () => {
  for (const from of edges) for (const position of edges) {
    const start = base().createLegend({ ...options, position: from });
    const p = start.editLegendLayout({ position });
    assert.deepEqual(p.graphicSpec, base().createLegend({ ...options, position }).graphicSpec);
    assert.deepEqual(p.editLegend({ channels: ["color", "shape", "size"] }).graphicSpec, p.graphicSpec);
    assert.deepEqual(p.editCanvas({ width: 1400 }).graphicSpec, start.editCanvas({ width: 1400 }).editLegendLayout({ position }).graphicSpec);
    assert.deepEqual(p.removeLegend().createLegend({ ...options, position }).graphicSpec, p.graphicSpec);
    assert.deepEqual(p.editLegend({ border: false }).editLegend({ border: true }).graphicSpec, p.graphicSpec);
  }
});

test("combined horizontal align, grid, inline titles and hidden categorical titles retain geometry", () => {
  for (const position of ["top", "bottom"]) for (const align of ["left", "center", "right"]) {
    for (const direction of ["horizontal", "vertical"]) for (const titlePosition of ["top", "left"]) {
      const p = base().createLegend({ ...options, position, align, direction, columns: 2, titlePosition });
      const b = resolveConcreteGraphicBounds(p.graphicSpec, "seriesLegendBackground");
      near(align === "left" ? b.left : align === "right" ? b.right : (b.left + b.right) / 2,
        align === "left" ? 300 : align === "right" ? 900 : 600);
      const samples = p.graphicSpec.objects.sizeLegendSymbols.items.map(item => item.properties);
      assert.equal(new Set(samples.map(item => item.y)).size, 2);
      assert.equal(direction === "horizontal" ? samples[0].y === samples[1].y : samples[0].x === samples[1].x, true);
      const hidden = p.editLegend({ title: false });
      assert.equal(hidden.graphicSpec.objects.seriesLegendTitle, undefined);
      assert.ok(hidden.graphicSpec.objects.sizeLegendTitle);
      assert.deepEqual(hidden.editLegend({ title: "auto" }).graphicSpec, p.graphicSpec);
      assert.deepEqual(hidden.filterMarks({ field: "g", op: "neq", value: "A" }).editCanvas({ width: 1400 }).graphicSpec,
        hidden.editCanvas({ width: 1400 }).filterMarks({ field: "g", op: "neq", value: "A" }).graphicSpec);
    }
  }
});

test("retained size appearance and inner border survive horizontal grouping and removal", () => {
  for (const position of ["top", "bottom"]) {
    const size = base().createLegend({ channels: ["size"], position: "left", count: 2, border: { padding: 5 }, labels: { offset: 45 }, title: "Mass" }).editLegend({ title: false });
    const p = size.createLegend({ channels: ["color", "shape", "size"], position, offset: 40, itemGap: 20, border: true });
    assert.equal(p.graphicSpec.objects.sizeLegendTitle, undefined);
    assert.deepEqual(p.editLegend({ title: false }).editLegend({ title: "auto" }).graphicSpec, p.graphicSpec);
    const scaled = p.editScale({ id: "size", range: [400 * Math.PI, 1600 * Math.PI] });
    assert.ok(contains(occupied(scaled, "seriesLegend"), occupied(scaled, "sizeLegend")));
    for (const [index, item] of scaled.graphicSpec.objects.sizeLegendSymbols.items.entries()) {
      assert.ok(scaled.graphicSpec.objects.sizeLegendLabels.items[index].properties.x - item.properties.x - item.properties.radius >= 45 - 1e-9);
    }
    assert.deepEqual(p.removeLegend({ channels: ["color", "shape"] }).graphicSpec, size.graphicSpec);
    assert.deepEqual(p.editLegend({ channels: ["color", "shape", "size"] }).graphicSpec, p.graphicSpec);
    assert.deepEqual(scaled.editCanvas({ width: 1400 }).graphicSpec,
      p.editCanvas({ width: 1400 }).editScale({ id: "size", range: [400 * Math.PI, 1600 * Math.PI] }).graphicSpec);
  }
});

test("combined groups wrap outward and move intact beside another legend", () => {
  for (const position of ["top", "bottom"]) {
    const src = base().encodeOpacity({ field: "m" });
    const p = src.createLegend({ ...options, position, channels: ["color", "size"] });
    const many = p.createLegend({ channels: ["opacity"], position, count: 3, offset: 40, border: true });
    assert.ok(disjoint(occupied(many, "colorLegend"), occupied(many, "opacityLegend")));
    assert.ok(contains(occupied(many, "colorLegend"), occupied(many, "sizeLegend")));
    assert.deepEqual(many.graphicSpec, src.createLegend({ channels: ["opacity"], position, count: 3, offset: 40, border: true })
      .createLegend({ ...options, position, channels: ["color", "size"] }).graphicSpec);
    assert.deepEqual(many.removeLegend({ channels: ["opacity"] }).graphicSpec, p.graphicSpec);
    const wrapped = base().editCanvas({ width: 800, margin: { left: 300, right: 300 } })
      .createLegend({ position, channels: ["color", "size"], count: 2, offset: 40, itemGap: 20, border: true });
    const c = bounds(wrapped, ["colorLegendSymbols", "colorLegendLabels", "colorLegendTitle"]);
    const s = occupied(wrapped, "sizeLegend");
    assert.ok(position === "top" ? s.bottom + 40 <= c.top : c.bottom + 40 <= s.top);
  }
});

test("combined invalid layouts, overflow and collisions fail without changing prior state", () => {
  const src = base();
  const p = src.createLegend({ ...options, position: "top" });
  const before = JSON.stringify(p);
  for (const patch of [{ position: "bottom", layout: "legacy-bottom" }, { count: 1 }, { offset: 1000 }, { columns: 0 }]) {
    assert.throws(() => src.createLegend({ ...options, ...patch }));
    assert.throws(() => p.editLegend(patch));
    assert.throws(() => p.editLegend({ channels: ["color", "shape", "size"], ...patch }));
    assert.equal(JSON.stringify(p), before);
  }
  assert.throws(() => p.editCanvas({ margin: { top: 30 } }), /margin|space/);
  assert.throws(() => p.editScale({ id: "size", range: [1, 1e8] }), /margin|space|width/);
  const withTitle = src.createTitle({ text: "Collision", align: "center", offset: 180 });
  assert.throws(() => withTitle.createLegend({ ...options, position: "top" }), /title|margin/);
});

test("combined title spacing includes labels taller than the samples", () => {
  for (const position of ["top", "bottom"]) {
    const src = base().editCanvas({ width: 1800, height: 1400, margin: 400 });
    const size = src.createLegend({ channels: ["size"], count: 2, labels: { fontSize: 60 } });
    const p = size.createLegend({ channels: ["color", "size"], position, offset: 40, border: true });
    const title = resolveConcreteGraphicBounds(p.graphicSpec, "sizeLegendTitle");
    const content = bounds(p, ["sizeLegendSymbols", "sizeLegendLabels"]);
    near(content.top - title.bottom, 12);
    assert.ok(contains(occupied(p, "colorLegend"), occupied(p, "sizeLegend")));
    assert.deepEqual(p.editLegend({ channels: ["color", "size"] }).graphicSpec, p.graphicSpec);
  }
});
