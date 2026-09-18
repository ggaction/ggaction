import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { readRectItemGeometry } from "../../../../src/grammar/roundedRect.js";

const style = { cornerRadius: 16, cornerRadiusTopRight: 0, cornerRadiusBottomLeft: 0 };
function base() {
  return chart().createCanvas({ width: 500, height: 300, margin: 70 })
    .createData({ values: [
      { group: "A", category: "X", value: 2, lo: 1, hi: 3 },
      { group: "B", category: "Y", value: 4, lo: 2, hi: 5 }
    ] });
}
function assertDiagonal(item) {
  assert.equal(item.type, "path");
  const c = item.properties.commands;
  const g = readRectItemGeometry(item);
  assert.ok(g.width > 0 && g.height > 0);
  const r = Math.min(16, g.width / 2, g.height / 2);
  assert.equal(c[0].x, g.x + r);
  assert.equal(c[2].y, g.y);
  assert.equal(c[2].y2, g.y);
  assert.equal(c[4].x, g.x + g.width - r);
  assert.equal(c[6].y, g.y + g.height);
  assert.equal(c[6].y2, g.y + g.height);
}

test("preserves diagonal corners in categorical and ranged rects and bars", () => {
  const programs = [
    base().createRectMark({ id: "mark", ...style })
      .encodeX({ field: "category", fieldType: "nominal" })
      .encodeY({ field: "group", fieldType: "nominal" }),
    base().createRectMark({ id: "mark", ...style })
      .encodeXRange({ lower: "lo", upper: "hi" })
      .encodeYRange({ lower: "lo", upper: "hi" }),
    base().createBarPlot({ id: "mark", x: "category", y: "value", bar: style, guides: false }),
    base().createBarPlot({ id: "mark", x: "category", y: { lower: "lo", upper: "hi" },
      bar: style, guides: false })
  ];
  for (const original of programs) {
    const snapshot = serializeProgram(original);
    const selected = original.selectMarks({ id: "largest", target: "mark", field: "value", op: "max" })
      .highlightMarks({ selection: "largest", color: "red" });
    const labeled = original.createMarkLabels({ source: "mark", field: "category" });
    for (const p of [original, original.editCanvas({ width: 600 }),
      deserializeProgram(snapshot), selected, labeled]) {
      for (const item of p.graphicSpec.objects.mark.items) assertDiagonal(item);
      assert.match(renderToSVG(p), /<path/u);
    }
    assert.equal(serializeProgram(original), snapshot);
  }
});

test("retains corner geometry across facets and composition", () => {
  const source = base().createRectMark({ id: "mark", ...style })
      .encodeX({ field: "category", fieldType: "nominal" })
      .encodeY({ field: "group", fieldType: "nominal" });
  const panels = source.facet({ field: "group", columns: 2 });
  assert.equal(Object.keys(panels.children).length, 2);
  for (const child of Object.values(panels.children)) {
    assert.equal(child.graphicSpec.objects.mark.items.length, 1);
    assertDiagonal(child.graphicSpec.objects.mark.items[0]);
  }
  const composed = hconcat({ programs: [{ id: "first", program: source }, { id: "second", program: panels }] });
  assert.match(renderToSVG(composed), /<path/u);
  assert.deepEqual(deserializeProgram(serializeProgram(composed)).graphicSpec, composed.graphicSpec);
});

test("supports corner-only authoring, legends, edits and return to square geometry", () => {
  for (const family of ["Bar", "Rect"]) {
    let p = base()[`create${family}Mark`]({ id: "mark", cornerRadiusTopLeft: 8 })
      .encodeX({ field: "category", fieldType: "nominal" })
      .encodeY(family === "Bar" ? { field: "value" } : { field: "group", fieldType: "nominal" })
      .encodeColor({ field: "category" }).createLegend({ channels: ["color"] });
    const ids = p.graphicSpec.objects.mark.items.map(item => item.id);
    for (const owner of ["mark", "colorLegendSymbols"]) {
      assert.equal(p.graphicSpec.objects[owner].type, "collection");
      const item = p.graphicSpec.objects[owner].items[0];
      const g = readRectItemGeometry(item), c = item.properties.commands;
      assert.ok(c[0].x > g.x);
      assert.equal(c[2].y, g.y);
      assert.equal(c[4].x, g.x + g.width);
      assert.equal(c[6].y, g.y + g.height);
    }
    p = p[`edit${family}Mark`]({ target: "mark", cornerRadiusTopLeft: 0 });
    assert.equal(p.graphicSpec.objects.mark.type, "rect");
    assert.equal(p.graphicSpec.objects.colorLegendSymbols.type, "rect");
    assert.deepEqual(p.graphicSpec.objects.mark.items.map(item => item.id), ids);
    const frozen = serializeProgram(p);
    assert.throws(() => p[`edit${family}Mark`]({ cornerRadiusBottomRight: -1 }), RangeError);
    assert.equal(serializeProgram(p), frozen);
  }
});
