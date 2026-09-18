import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";

const values = [{ x: 1, y: 2, group: "A", amount: 1 }, { x: 2, y: 3, group: "B", amount: 4 },
  { x: 3, y: 4, group: "A", amount: 1 }, { x: 4, y: 5, group: "B", amount: 4 }];
function source(kind, factory = chart) {
  const base = factory().createCanvas({ width: 1200, height: 1000, margin: 300 }).createData({ values });
  if (kind === "strokeWidth") return base.createLinePlot({ x: "x", y: "y", groupBy: "group", guides: false }).encodeStrokeWidth({ field: "amount" });
  const p = base.createScatterPlot({ x: "x", y: "y", guides: false,
    ...(kind.startsWith("stroke") ? { stroke: { field: kind === "stroke" ? "group" : "amount",
      fieldType: kind === "stroke" ? "nominal" : "quantitative",
      ...(kind === "strokeInterval" ? { scale: { type: "quantize", range: ["red", "blue"] } } : {}) } } : {})
  });
  if (kind.startsWith("stroke")) return p;
  if (kind === "opacity") return p.encodeOpacity({ field: "amount" });
  if (kind === "size") return p.encodeSize({ field: "amount" });
  if (kind === "series") return p.encodeShape({ field: "group" });
  const colored = p.encodeColor({ field: kind === "color" || kind === "combined" ? "group" : "amount",
    fieldType: kind === "color" || kind === "combined" ? "nominal" : "quantitative",
    ...(kind === "interval" ? { scale: { type: "quantize", range: ["red", "blue"] } } : {}) });
  return kind === "combined" ? colored.encodeSize({ field: "amount" }) : colored;
}
const kinds = ["color", "series", "size", "combined", "gradient", "interval", "stroke", "strokeGradient", "strokeInterval", "opacity", "strokeWidth"];

test("initially hidden titles match subsequent hiding for every legend family and edge", () => {
  for (const kind of kinds) for (const position of ["top", "right", "bottom", "left"]) {
    const base = source(kind);
    const visible = base.createLegend({ position, border: true });
    const expected = visible.editLegend({ title: false });
    const hidden = base.createLegend({ position, border: true, title: false });
    assert.deepEqual(hidden.semanticSpec, expected.semanticSpec, `${kind}/${position} semantics`);
    assert.deepEqual(hidden.graphicSpec, expected.graphicSpec, `${kind}/${position} graphics`);
    assert.deepEqual(hidden.guideConfigs, expected.guideConfigs, `${kind}/${position} config`);
    assert.deepEqual(hidden.editLegend({ title: "auto" }).graphicSpec, visible.graphicSpec, `${kind}/${position} restore`);
    assert.deepEqual(deserializeProgram(serializeProgram(hidden)).graphicSpec, hidden.graphicSpec);
    assert.equal(hidden.trace.children.at(-1).op, "createLegend");
  }
});

test("Basic legends and facade guide reuse accept initial title suppression", () => {
  for (const kind of kinds.filter(kind => !["opacity", "strokeWidth"].includes(kind))) {
    const full = source(kind).createLegend({ title: false });
    const basic = source(kind, basicChart).createLegend({ title: false });
    assert.deepEqual(basic.graphicSpec, full.graphicSpec, kind);
    assert.deepEqual(deserializeProgram(serializeProgram(basic)).graphicSpec, basic.graphicSpec);
  }
  for (const factory of [chart, basicChart]) {
    const base = factory().createCanvas({ width: 1200, height: 1000, margin: 300 }).createData({ values });
    const options = { x: "x", y: "y", color: "group", guides: { legend: { title: false } } };
    const first = base.createScatterPlot(options);
    const second = first.createScatterPlot({ ...options, id: "second" });
    assert.equal(second.guideConfigs.legend.color.titleVisible, false);
    assert.throws(() => first.createScatterPlot({ ...options, id: "conflict", guides: { legend: { title: "group" } } }), /conflict|Conflicting/);
    assert.match(renderToSVG(second), /<svg/);
  }
});

test("initial title suppression avoids layout failure from an unused long field title", () => {
  const field = "A long descriptive field title ".repeat(10);
  const base = chart().createCanvas({ width: 500, height: 400, margin: 100 })
    .createData({ values: [{ x: 1, y: 1, [field]: "A" }, { x: 2, y: 2, [field]: "B" }] })
    .createScatterPlot({ x: "x", y: "y", color: field, guides: false });
  assert.throws(() => base.createLegend(), /margin|Canvas/);
  const hidden = base.createLegend({ title: false });
  assert.equal(hidden.guideConfigs.legend.color.title, field);
  assert.equal(hidden.guideConfigs.legend.color.titleVisible, false);
  assert.match(renderToSVG(hidden), /<svg/);
});

test("invalid initial legend titles fail atomically and hidden titles survive faceting", () => {
  for (const kind of kinds) {
    const base = source(kind);
    const before = serializeProgram(base);
    for (const title of [true, null, "", 0]) assert.throws(() => base.createLegend({ title }), /title/i, kind);
    assert.equal(serializeProgram(base), before);
  }
  const faceted = source("color").createLegend({ title: false }).facet({ field: "group", guides: { legend: "shared" } });
  assert.match(renderToSVG(faceted), /<svg/);
  assert.deepEqual(faceted.editCompositionLayout({ gap: 20 }).guideConfigs, faceted.guideConfigs);
});


test("initial title suppression preserves inline and legacy legend layouts", () => {
  for (const kind of ["color", "series", "size", "combined", "interval", "opacity", "strokeWidth"]) {
    const base = source(kind);
    const options = { position: "bottom", titlePosition: "left", border: true };
    assert.deepEqual(base.createLegend({ ...options, title: false }).graphicSpec,
      base.createLegend(options).editLegend({ title: false }).graphicSpec, kind);
  }
  for (const kind of ["color", "series"]) {
    const base = source(kind);
    const options = { position: "bottom", layout: "legacy-bottom", border: true };
    assert.deepEqual(base.createLegend({ ...options, title: false }).graphicSpec,
      base.createLegend(options).editLegend({ title: false }).graphicSpec, kind);
  }
});
