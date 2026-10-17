import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

function base() {
  return chart().createCanvas({ width: 1000, height: 900, margin: 250 })
    .createData({ values: [1, 2, 3, 4].map((n, i) => ({ x: n, y: n, g: "ABCD"[i], n })) })
    .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeColor({ field: "g" }).encodeSize({ field: "n", scale: { range: [Math.PI, 4 * Math.PI] } })
    .encodeOpacity({ field: "n" });
}
function assertPitch(p, kind, expected) {
  const y = p.graphicSpec.objects[kind + "LegendLabels"].items.map(item => item.properties.y);
  assert.equal(y.length, 4);
  for (let i = 1; i < y.length; i++) assert.ok(Math.abs(y[i] - y[i - 1] - expected) < 1e-9);
}

test("vertical categorical labels reserve a conservative line height while retaining the default pitch", () => {
  for (const position of ["right", "left", "top-left", "bottom-right"]) {
    const options = { channels: ["color"], position, symbol: { layers: [{ type: "point", size: 3, stroke: "transparent", strokeWidth: 0 }] } };
    assertPitch(base().createLegend({ ...options, labels: { fontSize: 12 } }), "color", 18);
    const p = base().createLegend({ ...options, labels: { fontSize: 16, fontFamily: "Helvetica Neue" } });
    assertPitch(p, "color", 19.2);
    assertPitch(p.editCanvas({ width: 1050, height: 950 }), "color", 19.2);
    assertPitch(deserializeProgram(serializeProgram(p)), "color", 19.2);
    assertPitch(p.editColorScale({ palette: "accent" }), "color", 19.2);
  }
});

test("explicit tight gaps grow for text lines and retain larger painted symbol minimums", () => {
  const p = base().createLegend({ channels: ["color"], itemGap: 1,
    labels: { fontSize: 16 }, symbol: { layers: [{ type: "point", size: 3, stroke: "transparent", strokeWidth: 0 }] } });
  assertPitch(p, "color", 19.2);
  const q = base().createLegend({ channels: ["color"], itemGap: 1,
    labels: { fontSize: 16 }, symbol: { layers: [{ type: "point", size: 10, stroke: "black", strokeWidth: 4 }] } });
  assertPitch(q, "color", 24);
});

test("size and opacity vertical items share the conservative label reserve", () => {
  for (const channel of ["size", "opacity"]) {
    const options = { channels: [channel], values: [1, 2, 3, 4],
      labels: { fontSize: 16, fontFamily: "Helvetica Neue" },
      ...(channel === "opacity" ? { symbol: { type: "point", radius: 3 } } : {}) };
    const p = base().createLegend(options);
    assertPitch(p, channel, 19.2);
    assertPitch(p.editLegendLayout({ position: "top-left", blockLayout: "column" }), channel, 19.2);
    assertPitch(p.editLegendLabels({ fontSize: 12 }), channel, 18);
  }
});

test("existing horizontal grids retain their row spacing", () => {
  const p = base().createLegend({ channels: ["color"], position: "top", columns: 2,
    labels: { fontSize: 16 }, symbol: { layers: [{ type: "point", size: 3, stroke: "transparent", strokeWidth: 0 }] } });
  const y = p.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties.y);
  assert.equal(y[0], y[1]);
  assert.equal(y[2], y[3]);
  assert.equal(y[2] - y[0], 40);
});
