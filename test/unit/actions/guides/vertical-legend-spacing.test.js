import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

function source(kind) {
  let p = chart().createCanvas({ width: 1000, height: 900, margin: 250 })
    .createData({ values: [{ x: 0, y: 1, value: 0, category: "A" },
      { x: 1, y: 2, value: 5, category: "B" }, { x: 2, y: 3, value: 10, category: "C" }] });
  p = kind === "strokeWidth" ? p.createLineMark() : p.createPointMark();
  p = p.encodeX({ field: "x" }).encodeY({ field: "y" });
  if (kind === "color") return p.encodeColor({ field: "category" });
  if (kind === "series") return p.encodeShape({ field: "category" });
  if (kind === "interval") return p.encodeColor({ field: "value", fieldType: "quantitative",
    scale: { type: "quantize", range: ["red", "green", "blue"] } });
  if (kind === "strokeWidth") return p.encodeGroup({ field: "category" }).encodeStrokeWidth({ field: "value", scale: { range: [1, 4] } });
  return p[kind === "size" ? "encodeSize" : "encodeOpacity"]({ field: "value",
    ...(kind === "size" ? { scale: { range: [4, 100] } } : {}) });
}

const kinds = ["color", "series", "interval", "size", "opacity", "strokeWidth"];
function config(p, kind) { return p.guideConfigs.legend[kind]; }
function ys(p, kind) { return p.graphicSpec.objects[`${kind === "interval" ? "color" : kind}LegendLabels`].items.map(item => item.properties.y); }

test("vertical item legends share a compact default without changing horizontal spacing", () => {
  for (const kind of kinds) {
    const base = source(kind);
    for (const position of ["right", "left"]) {
      const p = base.createLegend({ position });
      assert.equal(config(p, kind).itemGap, 18, `${kind}/${position}`);
      const y = ys(p, kind);
      for (let i = 1; i < y.length; i++) assert.ok(Math.abs(y[i] - y[i - 1] - 18) < 1e-8);
      assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
      assert.deepEqual(p.editCanvas({ width: 1020 }).graphicSpec,
        base.editCanvas({ width: 1020 }).createLegend({ position }).graphicSpec);
    }
    for (const position of ["top", "bottom"]) {
      const expected = ["color", "series"].includes(kind) ? position === "top" ? 24 : 20
        : kind === "size" ? 40 : kind === "strokeWidth" ? 32 : 28;
      assert.equal(config(base.createLegend({ position }), kind).itemGap, expected);
    }
  }
});

test("large labels enlarge row pitch and explicit spacing remains authoritative", () => {
  for (const kind of kinds) {
    const base = source(kind);
    for (const options of [{ labels: { fontSize: 30 } }, { itemGap: 35 }]) {
      const p = base.createLegend(options), y = ys(p, kind);
      for (let i = 1; i < y.length; i++) assert.ok(y[i] - y[i - 1] >= (options.itemGap ?? 30) - 1e-8);
      assert.equal(config(p, kind).itemGap, options.itemGap ?? 18);
      assert.deepEqual(p.editLegendTitle({ fontSize: 14 }).guideConfigs.legend[kind].itemGap,
        options.itemGap ?? 18);
    }
  }
});

test("in-plot categorical legends use the same vertical spacing default", () => {
  for (const kind of ["color", "series"]) for (const position of ["top-left", "top-right", "bottom-left", "bottom-right"]) {
    assert.equal(config(source(kind).createLegend({ position }), kind).itemGap, 18);
  }
});
