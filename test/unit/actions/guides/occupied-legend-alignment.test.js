import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { unionConcreteGraphicBounds } from "../../../../src/grammar/schemas/graphicBounds.js";
import { resolveSingleHorizontalLegendPlacement } from "../../../../src/layout/legendLane.js";

const kinds = ["color", "series", "gradient", "interval", "size", "opacity", "strokeWidth"];
function base(kind, factory = chart) {
  let p = factory().createCanvas({ width: 1200, height: 1000, margin: 300 })
    .createData({ values: [{ x: 0, y: 0, m: 0, g: "A" }, { x: 10, y: 10, m: 10, g: "B" },
      { x: 5, y: 4, m: 0, g: "A" }, { x: 6, y: 3, m: 10, g: "B" }] });
  p = kind === "strokeWidth" ? p.createLineMark() : p.createPointMark();
  p = p.encodeX({ field: "x" }).encodeY({ field: "y" });
  if (kind === "strokeWidth") return p.encodeGroup({ field: "g" }).encodeStrokeWidth({ field: "m" });
  if (kind === "color") return p.encodeColor({ field: "g" });
  if (kind === "series") return p.encodeShape({ field: "g" });
  if (kind === "gradient" || kind === "interval") return p.encodeColor({ field: "m", fieldType: "quantitative",
    ...(kind === "interval" ? { scale: { type: "quantize", range: ["red", "blue"] } } : {}) });
  return p[kind === "size" ? "encodeSize" : "encodeOpacity"]({ field: "m" });
}
function bounds(p) {
  return unionConcreteGraphicBounds(p.graphicSpec, Object.keys(p.graphicSpec.objects)
    .filter(id => id.includes("Legend") || id.startsWith("colorGradient")));
}
function near(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`); }
function assertAligned(p, { position, align, offset }, left = 300, right = 900) {
  const b = bounds(p);
  near(align === "left" ? b.left : align === "right" ? b.right : (b.left + b.right) / 2,
    align === "left" ? left : align === "right" ? right : (left + right) / 2);
  near(position === "top" ? 300 - b.bottom : b.top - 700, offset);
}

test("all horizontal legend families align actual text, samples, strokes and borders", () => {
  let cases = 0;
  for (const factory of [chart, basicChart]) for (const kind of kinds) {
    if (factory === basicChart && ["opacity", "strokeWidth"].includes(kind)) continue;
    const source = base(kind, factory);
    for (const position of ["top", "bottom"]) for (const align of ["left", "center", "right"]) for (const border of [false, true]) {
      const options = { position, align, border, offset: 40, ...(["color", "series"].includes(kind) ? { itemGap: 24 } : {}) };
      const p = source.createLegend(options);
      assertAligned(p, options);
      if (factory === chart) {
        const hidden = p.editLegend({ title: false });
        assertAligned(hidden, options);
        assert.deepEqual(hidden.editLegend({ title: "auto" }).graphicSpec, p.graphicSpec);
        const opposite = position === "top" ? "bottom" : "top";
        assert.deepEqual(p.editLegend({ position: opposite }).graphicSpec,
          source.createLegend({ ...options, position: opposite }).graphicSpec);
        assert.deepEqual(p.editCanvas({ width: 1240 }).graphicSpec,
          source.editCanvas({ width: 1240 }).createLegend(options).graphicSpec);
        assert.deepEqual(p.editScale({ id: "x", domain: [-10, 20] }).graphicSpec,
          source.editScale({ id: "x", domain: [-10, 20] }).createLegend(options).graphicSpec);
        assert.deepEqual(p.removeLegend().createLegend(options).graphicSpec, p.graphicSpec);
      }
      cases += 1;
    }
  }
  assert.equal(cases, 144);
});

test("final alignment fits Canvas edges even when intrinsic coordinates overflow", () => {
  for (const kind of kinds) for (const align of ["left", "right"]) {
    const source = base(kind).editCanvas({ margin: { left: 0, right: 0 } });
    const options = { position: "top", align, border: true, offset: 0 };
    const p = source.createLegend(options);
    assertAligned(p, options, 0, 1200);
    assert.ok(bounds(p).left >= -1e-8 && bounds(p).right <= 1200 + 1e-8);
    const before = JSON.stringify(p);
    assert.throws(() => p.editLegend({ offset: 1000 }), /margin|Canvas/);
    assert.equal(JSON.stringify(p), before);
  }
});

test("legacy-bottom anchors remain fixed beside an independent horizontal legend", () => {
  const source = base("color").encodeOpacity({ field: "m" });
  const categorical = { channels: ["color"], position: "bottom", layout: "legacy-bottom" };
  const opacity = { channels: ["opacity"], position: "bottom", offset: 80 };
  const legacy = source.createLegend(categorical);
  const p = legacy.createLegend(opacity);
  for (const id of ["colorLegendTitle", "colorLegendLabels", "colorLegendSymbols"]) {
    assert.deepEqual(p.graphicSpec.objects[id], legacy.graphicSpec.objects[id]);
  }
  assert.deepEqual(p.graphicSpec, source.createLegend(opacity).createLegend(categorical).graphicSpec);
  assert.deepEqual(p.removeLegend({ channels: ["opacity"] }).graphicSpec, legacy.graphicSpec);
});

test("single horizontal layout validates its scope and preserves exact occupied bounds", () => {
  assert.throws(() => resolveSingleHorizontalLegendPlacement({ config: { position: "left" } }), /horizontal edge/);
  const result = resolveSingleHorizontalLegendPlacement({ plot: { x: 100, y: 100, width: 400, height: 200 },
    canvas: { width: 600, height: 500 }, config: { position: "bottom", align: "right", offset: 20 },
    bounds: { left: -20, right: 80, top: -20, bottom: 20 } });
  assert.deepEqual(result, { dx: 420, dy: 340, occupied: { left: 400, right: 500, top: 320, bottom: 360 } });
});
