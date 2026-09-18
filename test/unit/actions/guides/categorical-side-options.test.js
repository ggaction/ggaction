import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";

function source(factory, kind) {
  let p = factory().createCanvas({ width: 1800, height: 1400, margin: 450 })
    .createData({ values: [{ x: 0, y: 0, g: "A" }, { x: 1, y: 1, g: "A" },
      { x: 2, y: 2, g: "B" }, { x: 3, y: 3, g: "B" }] });
  p = kind === "line" ? p.createLineMark().encodeGroup({ field: "g" }) : p.createPointMark();
  p = p.encodeX({ field: "x" }).encodeY({ field: "y" });
  return kind === "shape" ? p.encodeShape({ field: "g" }) : p.encodeColor({ field: "g" });
}

test("categorical sides default to vertical one-column top-title options in Full and Basic", () => {
  for (const factory of [chart, basicChart]) for (const kind of ["color", "line", "shape"]) {
    const base = source(factory, kind), key = kind === "color" ? "color" : "series";
    for (const position of ["left", "right"]) {
      const p = base.createLegend({ position });
      assert.equal(p.guideConfigs.legend[key].direction, "vertical");
      const multi = base.createLegend({ position, columns: 3 });
      const labelOwner = key === "color" ? "colorLegendLabels" : "seriesLegendLabels";
      assert.equal(new Set(multi.graphicSpec.objects[labelOwner].items.map(item => item.properties.x)).size, 2);
      const options = { position, direction: "vertical", columns: 1, titlePosition: "top" };
      assert.deepEqual(base.createLegend(options).graphicSpec, p.graphicSpec);
      const guides = base.createGuides({ axes: false, grid: false, legend: options });
      assert.deepEqual(guides.graphicSpec, p.graphicSpec);
      for (const patch of [{ direction: "horizontal" }, { titlePosition: "left" }]) {
        const before = JSON.stringify(base);
        assert.throws(() => base.createLegend({ position, ...patch }), /Side legends require/);
        assert.equal(JSON.stringify(base), before);
        if (factory === chart) {
          const snapshot = JSON.stringify(p);
          assert.throws(() => p.editLegendLayout(patch), /Side legends require/);
          assert.equal(JSON.stringify(p), snapshot);
        }
      }
    }
  }
});

test("categorical grids move to either side with explicit compatible options", () => {
  for (const kind of ["color", "line", "shape"]) for (const from of ["top", "bottom"]) {
    const base = source(chart, kind);
    const p = base.createLegend({ position: from, columns: 2, titlePosition: "left", itemGap: 24 });
    for (const position of ["left", "right"]) {
      const patch = { position, columns: 2, titlePosition: "top" };
      const moved = p.editLegendLayout(patch);
      assert.deepEqual(moved.graphicSpec, base.createLegend({ ...patch, itemGap: 24 }).graphicSpec);
      assert.deepEqual(moved.editCanvas({ width: 1900 }).graphicSpec,
        base.editCanvas({ width: 1900 }).createLegend({ ...patch, itemGap: 24 }).graphicSpec);
    }
  }
});

function manyCategories(factory = chart) {
  return factory().createCanvas({ width: 1000, height: 900, margin: { top: 60, bottom: 60, left: 350, right: 350 } })
    .createData({ values: Array.from({ length: 21 }, (_, i) => ({
      x: i, y: i % 5, year: String(1980 + i), amount: i + 1
    })) }).createPointMark({ id: "points" })
    .encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeColor({ field: "year" });
}

function assertGrid(program, position) {
  const labels = program.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties);
  const symbols = program.graphicSpec.objects.colorLegendSymbols.items.map(item => item.properties);
  assert.equal(labels.length, 21);
  assert.deepEqual(labels.map(item => item.text), Array.from({ length: 21 }, (_, i) => String(1980 + i)));
  assert.equal(new Set(labels.map(item => item.x)).size, 3);
  assert.equal(new Set(labels.map(item => item.y)).size, 7);
  for (let i = 0; i < 21; i++) {
    assert.equal(labels[i].x, labels[Math.floor(i / 7) * 7].x);
    assert.equal(labels[i].y, labels[i % 7].y);
    assert.ok(labels[i].x > symbols[i].x + symbols[i].width);
    assert.ok(position === "left" ? labels[i].x < 350 : symbols[i].x > 650);
    if (i < 14) assert.ok(symbols[i + 7].x > labels[i].x + 20);
  }
}

test("categorical side grids fill columns and retain order in Full and Basic", () => {
  for (const factory of [chart, basicChart]) for (const position of ["left", "right"]) {
    const base = manyCategories(factory);
    const p = base.createLegend({ position, columns: 3, border: true });
    assertGrid(p, position);
    assert.equal(p.guideConfigs.legend.color.columns, 3);
    for (const columns of [0, -1, 1.5, NaN, Infinity]) {
      assert.throws(() => base.createLegend({ position, columns }), /positive integer/);
    }
    if (factory === chart) {
      assert.deepEqual(base.createLegend({ position, border: true }).editLegendLayout({ columns: 3 }).graphicSpec, p.graphicSpec);
      const resized = p.editCanvas({ height: 950 });
      assert.deepEqual(resized.graphicSpec,
        base.editCanvas({ height: 950 }).createLegend({ position, columns: 3, border: true }).graphicSpec);
      assertGrid(resized, position);
    }
  }
});

test("side grids remain intact beside an independently created size legend", () => {
  for (const position of ["left", "right"]) {
    const base = manyCategories().encodeSize({ field: "amount" });
    const categorical = base.createLegend({ channels: ["color"], position, columns: 3, border: true });
    const combined = categorical.createLegend({ channels: ["size"], position, count: 3 });
    const labels = combined.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties);
    const original = categorical.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties);
    const symbols = combined.graphicSpec.objects.colorLegendSymbols.items.map(item => item.properties);
    const originalSymbols = categorical.graphicSpec.objects.colorLegendSymbols.items.map(item => item.properties);
    const dx = labels[0].x - original[0].x;
    for (let i = 0; i < labels.length; i++) {
      assert.equal(labels[i].x - original[i].x, dx);
      assert.equal(symbols[i].x - originalSymbols[i].x, dx);
    }
    assert.ok(combined.graphicSpec.objects.sizeLegendLabels.items[0].properties.y > labels.at(-1).y);
    const reversed = base.createLegend({ channels: ["size"], position, count: 3 })
      .createLegend({ channels: ["color"], position, columns: 3, border: true });
    assert.deepEqual(reversed.graphicSpec, combined.graphicSpec);
  }
});

test("side grids report insufficient width without changing the source", () => {
  const base = manyCategories().editCanvas({ margin: { top: 60, bottom: 60, left: 40, right: 40 } });
  const snapshot = JSON.stringify(base);
  for (const position of ["left", "right"]) {
    assert.throws(() => base.createLegend({ position, columns: 3 }), /Canvas|margin|space/);
  }
  assert.equal(JSON.stringify(base), snapshot);
});
