import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

function base() {
  return chart().createCanvas({ width: 1200, height: 1000, margin: 300 })
    .createData({ id: "data", values: [{ x: 1, y: 2, g: "A", n: 1 }, { x: 2, y: 3, g: "B", n: 2 }] })
    .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeColor({ field: "g" }).encodeSize({ field: "n" });
}
const labels = { fontSize: 10, fontFamily: "serif", fontWeight: 700, color: "#123456" };
const titleStyle = { fontSize: 11, fontFamily: "monospace", fontWeight: 800, color: "#2468ac" };
function textAppearance(p, id) {
  const object = p.graphicSpec.objects[id];
  const props = object.items?.[0]?.properties ?? object.properties;
  return Object.fromEntries(["fontSize", "fontFamily", "fontWeight", "fill"].map(key => [key, props[key]]));
}
function assertAppearance(p, label = labels, title = titleStyle) {
  for (const kind of ["color", "size"]) {
    for (const [role, expected] of [["Labels", label], ["Title", title]]) {
      assert.deepEqual(textAppearance(p, kind + "Legend" + role), {
        fontSize: expected.fontSize, fontFamily: expected.fontFamily,
        fontWeight: expected.fontWeight, fill: expected.color
      });
    }
  }
}
function symbols(p) {
  return Object.fromEntries(["color", "size"].map(kind => [kind,
    p.graphicSpec.objects[kind + "LegendSymbols"].items.map(item =>
      Object.fromEntries(Object.entries(item.properties).filter(([key]) => !["x", "y"].includes(key))))]));
}

test("group opt-in preserves inherited typography and sample paint on every anchor", () => {
  const p = base().createLegend({ channels: ["color", "size"], labels, titleStyle })
    .editLegendBlock({ target: "points", channel: "size", symbol: { fill: "#aabbcc", opacity: 0.4 } });
  const snapshot = JSON.stringify(p), expectedSymbols = symbols(p);
  assertAppearance(p);
  for (const position of ["top-left", "top-right", "bottom-left", "bottom-right", "left", "right", "top", "bottom"]) {
    const q = p.editLegendLayout({ position, blockLayout: "row" });
    assertAppearance(q);
    assert.deepEqual(symbols(q), expectedSymbols);
  }
  assertAppearance(p.editLegendLayout({ at: { x: 12, y: 14 } }));
  assert.equal(JSON.stringify(p), snapshot);
});

test("group creation and later appearance edits keep the categorical-size owner", () => {
  const p = base().createLegend({ channels: ["color", "size"], position: "top-left", labels, titleStyle });
  assertAppearance(p);
  const q = p.editLegendLabels({ color: "#987654", fontWeight: 500 })
    .editLegendTitle({ color: "#abcdef", fontWeight: 600 });
  assertAppearance(q, { ...labels, color: "#987654", fontWeight: 500 },
    { ...titleStyle, color: "#abcdef", fontWeight: 600 });
  assertAppearance(p);
});

test("grouped inherited appearance survives Canvas, scale, data and persistence replay", () => {
  const p = base().createLegend({ channels: ["color", "size"], labels, titleStyle })
    .editLegendLayout({ position: "top-left", blockLayout: "row" });
  const q = p.editCanvas({ width: 1250, height: 1050 })
    .editSizeScale({ range: [4 * Math.PI, 16 * Math.PI] })
    .reviseData({ source: "data", id: "revised", values: [{ x: 1, y: 3, g: "A", n: 1 }, { x: 2, y: 2, g: "B", n: 2 }] });
  assertAppearance(q);
  const restored = deserializeProgram(serializeProgram(q));
  assertAppearance(restored);
  assertAppearance(restored.editCanvas({ width: 1300 }));
});

test("grouping does not replace retained standalone size typography", () => {
  const p = base().createLegend({ channels: ["size"], labels: { fontSize: 15 }, titleStyle: { fontSize: 17 } })
    .createLegend({ channels: ["color", "size"], labels, titleStyle })
    .editLegendLayout({ position: "top-left", blockLayout: "row" });
  assert.equal(p.guideConfigs.legend.size.inheritAppearance, false);
  assert.equal(textAppearance(p, "sizeLegendLabels").fontSize, 15);
  assert.equal(textAppearance(p, "sizeLegendTitle").fontSize, 17);
  assert.equal(textAppearance(p, "colorLegendLabels").fontSize, 10);
});
