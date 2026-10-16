import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

const rows = [{ x: 1, y: 2, g: "A", n: 1 }, { x: 2, y: 3, g: "B", n: 2 }];
function base() {
  return chart().createCanvas({ width: 1200, height: 1000, margin: 300 })
    .createData({ id: "rows", values: rows }).createPointMark({ id: "points" })
    .encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeColor({ field: "g" }).encodeSize({ field: "n" });
}
const color = { channels: ["color"], position: "bottom", layout: "legacy-bottom",
  labels: { fontSize: 10, color: "#123456" }, titleStyle: { fontSize: 11, fontWeight: 700 } };
const size = { channels: ["size"], position: "right",
  labels: { fontSize: 15, color: "#654321" }, titleStyle: { fontSize: 17, fontWeight: 500 } };
const props = (p, id) => p.graphicSpec.objects[id].items?.[0]?.properties ?? p.graphicSpec.objects[id].properties;
function verify(p, plotRight = 900) {
  assert.equal(p.guideConfigs.legend.color.layout, "legacy-bottom");
  assert.equal(p.guideConfigs.legend.color.position, "bottom");
  assert.equal(p.guideConfigs.legend.size.position, "right");
  assert.equal(p.guideConfigs.legend.size.inheritPosition, false);
  assert.equal(props(p, "colorLegendLabels").fontSize, 10);
  assert.equal(props(p, "colorLegendLabels").fill, "#123456");
  assert.equal(props(p, "sizeLegendLabels").fontSize, 15);
  assert.equal(props(p, "sizeLegendLabels").fill, "#654321");
  assert.equal(props(p, "sizeLegendTitle").fontSize, 17);
  assert.equal(props(p, "sizeLegendTitle").fontWeight, 500);
  assert.ok(props(p, "sizeLegendSymbols").x > plotRight);
}

test("standalone side size legend keeps placement and typography beside a legacy bottom color legend", () => {
  const p = base().createLegend(color), snapshot = serializeProgram(p);
  const q = p.createLegend(size);
  verify(q);
  assert.equal(serializeProgram(p), snapshot);
  assert.deepEqual(props(q, "colorLegendLabels"), props(p, "colorLegendLabels"));
});

test("independent legacy color and side size creation orders have identical concrete output", () => {
  const a = base().createLegend(color).createLegend(size);
  const b = base().createLegend(size).createLegend(color);
  verify(a); verify(b);
  for (const id of ["colorLegendSymbols", "colorLegendLabels", "colorLegendTitle", "sizeLegendSymbols", "sizeLegendLabels", "sizeLegendTitle"]) {
    assert.deepEqual(a.graphicSpec.objects[id], b.graphicSpec.objects[id]);
  }
});

test("independent side size placement survives Canvas, scale and persistence replay", () => {
  const p = base().createLegend(color).createLegend(size);
  const q = p.editCanvas({ width: 1250 }).editSizeScale({ range: [Math.PI * 4, Math.PI * 16] });
  verify(q, 950);
  const r = deserializeProgram(serializeProgram(q));
  assert.deepEqual(r.graphicSpec, q.graphicSpec);
  verify(r.editCanvas({ width: 1300 }), 1000);
});

test("combined placement still rejects inheriting an incompatible legacy bottom layout atomically", () => {
  const p = base().createLegend(color), snapshot = serializeProgram(p);
  assert.throws(() => p.createLegend({ channels: ["size"] }), /layout "edge"/);
  assert.equal(serializeProgram(p), snapshot);
});
