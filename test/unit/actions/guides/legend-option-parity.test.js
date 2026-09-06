import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";

const kinds = ["color", "series", "gradient", "interval", "size", "opacity", "strokeWidth"];
function source(kind, factory = chart) {
  let p = factory().createCanvas({ width: 1200, height: 1000, margin: 300 })
    .createData({ values: [{ x: 0, y: 0, m: 0, g: "A" }, { x: 1, y: 1, m: 0, g: "A" },
      { x: 2, y: 2, m: 10, g: "B" }, { x: 3, y: 3, m: 10, g: "B" }] });
  p = kind === "strokeWidth" ? p.createLineMark() : p.createPointMark();
  p = p.encodeX({ field: "x" }).encodeY({ field: "y" });
  if (kind === "strokeWidth") return p.encodeGroup({ field: "g" }).encodeStrokeWidth({ field: "m" });
  if (kind === "color") return p.encodeColor({ field: "g" });
  if (kind === "series") return p.encodeShape({ field: "g" });
  if (kind === "gradient" || kind === "interval") return p.encodeColor({ field: "m", fieldType: "quantitative",
    ...(kind === "interval" ? { scale: { type: "quantize", range: ["red", "blue"] } } : {}) });
  return p[kind === "size" ? "encodeSize" : "encodeOpacity"]({ field: "m" });
}
function rejectsUnchanged(p, attempt, pattern) {
  const before = JSON.stringify(p);
  assert.throws(attempt, pattern);
  assert.equal(JSON.stringify(p), before);
}

test("all side legend families consistently reject non-center alignment", () => {
  for (const factory of [chart, basicChart]) for (const kind of kinds) {
    if (factory === basicChart && ["opacity", "strokeWidth"].includes(kind)) continue;
    const base = source(kind, factory);
    for (const position of ["left", "right"]) {
      const centered = base.createLegend({ position });
      assert.deepEqual(centered.graphicSpec, base.createLegend({ position, align: "center" }).graphicSpec);
      for (const align of ["left", "right"]) {
        rejectsUnchanged(base, () => base.createLegend({ position, align }), /alignment|align/);
        rejectsUnchanged(base, () => base.createGuides({ axes: false, grid: false, legend: { position, align } }), /alignment|align/);
        if (factory === chart) for (const method of ["editLegend", "editLegendLayout"]) {
          rejectsUnchanged(centered, () => centered[method]({ align }), /alignment|align/);
        }
      }
    }
  }
});

test("moving a continuous legend to a side preserves alignment intent until explicitly changed", () => {
  for (const kind of ["gradient", "opacity"]) for (const position of ["top", "bottom"]) {
    for (const align of ["left", "right"]) for (const side of ["left", "right"]) {
      const base = source(kind);
      const p = base.createLegend({ position, align, border: true });
      rejectsUnchanged(p, () => p.editLegendLayout({ position: side }), /center alignment/);
      const q = p.editLegendLayout({ position: side, align: "center" });
      assert.deepEqual(q.graphicSpec, base.createLegend({ position: side, align: "center", border: true }).graphicSpec);
      assert.deepEqual(q.editCanvas({ width: 1240 }).graphicSpec,
        base.editCanvas({ width: 1240 }).createLegend({ position: side, border: true }).graphicSpec);
    }
  }
});

test("title styles reject offset across families while label offsets remain supported", () => {
  for (const factory of [chart, basicChart]) for (const kind of kinds) {
    if (factory === basicChart && ["opacity", "strokeWidth"].includes(kind)) continue;
    const base = source(kind, factory);
    rejectsUnchanged(base, () => base.createLegend({ titleStyle: { offset: 100 } }), /titleStyle.*offset|offset.*titleStyle/);
    const p = base.createLegend({ labels: { offset: 20 } });
    assert.equal(Object.values(p.guideConfigs.legend)[0].labels.offset, 20);
    if (factory === chart) {
      rejectsUnchanged(p, () => p.editLegend({ titleStyle: { offset: 100 } }), /titleStyle.*offset|offset.*titleStyle/);
      assert.equal(Object.values(p.editLegend({ labels: { offset: 24 } }).guideConfigs.legend)[0].labels.offset, 24);
    }
  }
});

test("categorical legends accept only the no-op auto label format", () => {
  const base = source("color");
  const automatic = base.createLegend({ labels: { format: "auto" } });
  assert.deepEqual(automatic.graphicSpec, base.createLegend().graphicSpec);
  assert.equal(automatic.guideConfigs.legend.color.labels.format, undefined);
  assert.deepEqual(
    automatic.editLegend({ labels: { format: "auto" } }).graphicSpec,
    automatic.graphicSpec
  );
  rejectsUnchanged(
    base,
    () => base.createLegend({ labels: { format: ".1f" } }),
    /Categorical legend labels do not accept format/u
  );
});

test("gradient title-position creation and public editors accept the same supported top placement", () => {
  const base = source("gradient");
  for (const position of ["left", "right", "top", "bottom"]) {
    const p = base.createLegend({ position, titlePosition: "top", border: true });
    for (const method of ["editLegend", "editLegendLayout"]) {
      assert.deepEqual(p[method]({ titlePosition: "top" }).graphicSpec, p.graphicSpec);
      rejectsUnchanged(p, () => p[method]({ titlePosition: "left" }), /left titlePosition/);
    }
    const hidden = p.editLegendTitle({ title: false }).editLegendLayout({ titlePosition: "top" });
    assert.equal(hidden.graphicSpec.objects.colorGradientTitle, undefined);
    assert.deepEqual(hidden.editLegendTitle({ title: "auto" }).graphicSpec, p.graphicSpec);
    const interval = p.editScale({ id: "color", type: "quantize", domain: [0, 10], range: ["blue", "red"] });
    assert.equal(interval.guideConfigs.legend.interval.titlePosition, "top");
    const restored = interval.editScale({ id: "color", type: "sequential", domain: [0, 10], range: ["blue", "red"] });
    assert.equal(restored.guideConfigs.legend.gradient.titlePosition, "top");
    assert.deepEqual(restored.editLegendLayout({ titlePosition: "top" }).graphicSpec, restored.graphicSpec);
  }
});
