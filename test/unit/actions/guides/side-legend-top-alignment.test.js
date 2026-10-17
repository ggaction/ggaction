import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { unionConcreteGraphicBounds } from "../../../../src/grammar/schemas/graphicBounds.js";
import { resolveSingleSideLegendPlacement } from "../../../../src/layout/legendLane.js";

const families = ["color", "series", "gradient", "interval", "size", "opacity", "strokeWidth"];
function base(kind, factory = chart, top = 200) {
  let p = factory().createCanvas({ width: 1200, height: 1100,
    margin: { left: 400, right: 400, top, bottom: 200 } })
    .createData({ values: [{ x: 0, y: 0, m: 1, g: "A" }, { x: 10, y: 10, m: 10, g: "B" }] });
  p = kind === "strokeWidth" ? p.createLineMark() : p.createPointMark();
  p = p.encodeX({ field: "x" }).encodeY({ field: "y" });
  if (kind === "strokeWidth") return p.encodeGroup({ field: "g" }).encodeStrokeWidth({ field: "m" });
  if (kind === "color") return p.encodeColor({ field: "g" });
  if (kind === "series") return p.encodeShape({ field: "g" });
  if (["gradient", "interval"].includes(kind)) return p.encodeColor({ field: "m", fieldType: "quantitative",
    ...(kind === "interval" ? { scale: { type: "quantize", range: ["red", "blue"] } } : {}) });
  return p[kind === "size" ? "encodeSize" : "encodeOpacity"]({ field: "m" });
}
function bounds(p) {
  return unionConcreteGraphicBounds(p.graphicSpec, Object.keys(p.graphicSpec.objects)
    .filter(id => id.includes("Legend") || id.startsWith("colorGradient")));
}
function aligned(p, top = 200) {
  assert.ok(Math.abs(bounds(p).top - top) < 1e-8, JSON.stringify(bounds(p)));
}

test("single side legends align their complete occupied top in Full and Basic", () => {
  for (const factory of [chart, basicChart]) for (const kind of families) {
    if (factory === basicChart && ["opacity", "strokeWidth"].includes(kind)) continue;
    const source = base(kind, factory), before = JSON.stringify(source);
    for (const position of ["left", "right"]) for (const border of [false, true]) {
      const options = { position, border }, p = source.createLegend(options);
      aligned(p);
      if (factory === chart) {
        aligned(p.editLegend({ title: false }));
        aligned(p.editLegend({ titleStyle: { fontSize: 50 } }));
        const resized = p.editCanvas({ margin: { top: 0 } });
        aligned(resized, 0);
        assert.deepEqual(resized.graphicSpec, source.editCanvas({ margin: { top: 0 } }).createLegend(options).graphicSpec);
        assert.deepEqual(p.removeLegend().createLegend(options).graphicSpec, p.graphicSpec);
        assert.deepEqual(p.rematerializeSideLegendLane().graphicSpec, p.graphicSpec);
      }
    }
    assert.equal(JSON.stringify(source), before);
  }
});

test("multiple side blocks keep ordering and gaps while the complete stack starts at the plot", () => {
  const source = base("color").encodeSize({ field: "m" }).encodeOpacity({ field: "m" });
  for (const position of ["left", "right"]) for (const border of [false, true]) {
    const options = { channels: ["color"], position, border };
    const one = source.createLegend(options);
    const many = one.createLegend({ channels: ["size"], position, count: 3 })
      .createLegend({ channels: ["opacity"], position, count: 3 });
    aligned(many);
    assert.deepEqual(many.rematerializeSideLegendLane().graphicSpec, many.graphicSpec);
    const titleY = ["colorLegendTitle", "sizeLegendTitle", "opacityLegendTitle"]
      .map(id => many.graphicSpec.objects[id].properties.y);
    assert.ok(titleY[0] < titleY[1] && titleY[1] < titleY[2]);
    const removed = many.removeLegend({ channels: ["size", "opacity"] });
    assert.deepEqual(removed.graphicSpec, one.graphicSpec);
    assert.deepEqual(many.editCanvas({ margin: { top: 0 } }).graphicSpec,
      source.editCanvas({ margin: { top: 0 } }).createLegend(options)
        .createLegend({ channels: ["size"], position, count: 3 })
        .createLegend({ channels: ["opacity"], position, count: 3 }).graphicSpec);
  }
});

test("chart titles do not set the side legend anchor and final overflow is atomic", () => {
  const source = base("color");
  const p = source.createTitle({ text: "Chart heading" }).createLegend();
  aligned(p);
  assert.deepEqual(p.graphicSpec, source.createLegend().createTitle({ text: "Chart heading" }).graphicSpec);
  const before = JSON.stringify(p);
  assert.throws(() => p.editCanvas({ height: 250, margin: { bottom: 20 } }), /margin|Canvas|space/);
  assert.equal(JSON.stringify(p), before);
  assert.throws(() => resolveSingleSideLegendPlacement({ side: "top" }), /left or right/);
});
