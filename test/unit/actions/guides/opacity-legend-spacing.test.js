import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { resolveConcreteGraphicBounds } from "../../../../src/grammar/schemas/graphicBounds.js";

const styles = [{}, { symbol: { radius: 40 } }, { symbol: { stroke: "black", strokeWidth: 40 } },
  { labels: { fontSize: 80 } }, { titleStyle: { fontSize: 80 } },
  { symbol: { radius: 30, stroke: "black", strokeWidth: 20 }, labels: { fontSize: 50 }, titleStyle: { fontSize: 60 } }];
function base() {
  return chart().createCanvas({ width: 2400, height: 2000, margin: 500 })
    .createData({ values: [{ x: 0, y: 0, m: 0, g: "A" }, { x: 10, y: 10, m: 10, g: "B" }] })
    .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeOpacity({ field: "m" });
}
function geometry(p) {
  const bounds = id => resolveConcreteGraphicBounds(p.graphicSpec, id);
  const symbols = p.graphicSpec.objects.opacityLegendSymbols.items.map(item => bounds(item.id));
  const labels = p.graphicSpec.objects.opacityLegendLabels.items.map(item => bounds(item.id));
  const title = p.graphicSpec.objects.opacityLegendTitle === undefined ? undefined : bounds("opacityLegendTitle");
  const items = symbols.map((s, i) => ({ left: Math.min(s.left, labels[i].left), right: Math.max(s.right, labels[i].right),
    top: Math.min(s.top, labels[i].top), bottom: Math.max(s.bottom, labels[i].bottom) }));
  return { symbols, labels, title, items };
}
function overlaps(a, b) { return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top; }
function assertSpacing(p, single = true) {
  const { symbols, labels, title, items } = geometry(p), c = p.guideConfigs.legend.opacity;
  for (let i = 0; i < items.length; i += 1) {
    assert.ok(!overlaps(symbols[i], labels[i]), "sample overlaps its label");
    if (title) assert.ok(!overlaps(title, items[i]), "title overlaps item");
    for (let j = 0; j < i; j += 1) assert.ok(!overlaps(items[i], items[j]), "neighbouring items overlap");
    if (single) {
      const gap = c.position === "right" ? labels[i].left - symbols[i].right
        : c.position === "left" ? symbols[i].left - labels[i].right
          : c.titlePosition === "left" ? labels[i].left - symbols[i].right : labels[i].top - symbols[i].bottom;
      assert.ok(Math.abs(gap - c.labels.offset) < 1e-8, `${gap} != ${c.labels.offset}`);
    }
  }
}

test("opacity samples use occupied stroke extents and typography across every edge arrangement", () => {
  const source = base();
  let cases = 0;
  for (const style of styles) for (const position of ["left", "right", "top", "bottom"]) {
    for (const titlePosition of ["top", ...(["top", "bottom"].includes(position) ? ["left"] : [])]) for (const border of [false, true]) {
      const options = { channels: ["opacity"], position, titlePosition, count: 3, offset: 40, border, ...style };
      const p = source.createLegend(options);
      assertSpacing(p);
      const hidden = p.editLegendTitle({ title: false });
      assertSpacing(hidden);
      assert.deepEqual(hidden.editLegendTitle({ fontSize: 1000 }).graphicSpec, hidden.graphicSpec);
      assert.deepEqual(hidden.editLegendTitle({ title: "auto" }).graphicSpec, p.graphicSpec);
      assert.deepEqual(p.editCanvas({ width: 2500 }).graphicSpec,
        source.editCanvas({ width: 2500 }).createLegend(options).graphicSpec);
      assert.deepEqual(p.editScale({ id: "opacity", range: [0.3, 0.9] }).graphicSpec,
        source.editScale({ id: "opacity", range: [0.3, 0.9] }).createLegend(options).graphicSpec);
      assert.deepEqual(p.removeLegend().createLegend(options).graphicSpec, p.graphicSpec);
      cases += 1;
    }
  }
  assert.equal(cases, 72);
});

test("opacity style, count, content and filtering edits converge on fresh layout", () => {
  const source = base().encodeColor({ field: "m", fieldType: "quantitative" });
  for (const position of ["left", "right", "top", "bottom"]) {
    const options = { channels: ["opacity"], position, count: 3, offset: 40, ...styles.at(-1) };
    const expected = source.createLegend(options);
    const p = source.createLegend({ channels: ["opacity"], position, offset: 40 })
      .editLegendSymbols({ symbol: options.symbol, count: 3 }).editLegendLabels(options.labels)
      .editLegendTitle(options.titleStyle);
    assert.deepEqual(p.graphicSpec, expected.graphicSpec);
    assert.deepEqual(source.createLegend({ channels: ["color"] }).editLegend(options).graphicSpec, expected.graphicSpec);
    const count = p.editLegendSymbols({ count: 5 });
    assertSpacing(count);
    assert.deepEqual(count.graphicSpec, source.createLegend({ ...options, count: 5 }).graphicSpec);
    const filter = { target: "points", field: "m", op: "gte", value: 5 };
    assert.deepEqual(p.filterMarks(filter).graphicSpec, source.filterMarks(filter).createLegend(options).graphicSpec);
  }
});

test("large opacity content remains separated in shared lanes and preserves authoring order", () => {
  const source = base().encodeColor({ field: "g" });
  for (const position of ["left", "right", "top", "bottom"]) {
    const color = { channels: ["color"], position, offset: 40 };
    const opacity = { channels: ["opacity"], position, offset: 40, count: 3, border: true, ...styles.at(-1) };
    const p = source.createLegend(color).createLegend(opacity);
    assertSpacing(p, false);
    assert.deepEqual(p.graphicSpec, source.createLegend(opacity).createLegend(color).graphicSpec);
    assert.deepEqual(p.removeLegend({ channels: ["color"] }).graphicSpec, source.createLegend(opacity).graphicSpec);
  }
});

test("oversized opacity content rejects final overflow without changing earlier state", () => {
  const source = base();
  for (const position of ["left", "right", "top", "bottom"]) {
    const p = source.createLegend({ channels: ["opacity"], position, count: 3 });
    for (const patch of [{ symbol: { radius: 1500 } }, { labels: { fontSize: 1500 } },
      { titleStyle: { fontSize: 1500 } }, { symbol: { stroke: "black", strokeWidth: 3000 } }]) {
      const before = JSON.stringify(p);
      assert.throws(() => p.editLegend(patch), /margin|Canvas/);
      assert.equal(JSON.stringify(p), before);
    }
  }
});
