import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { resolveConcreteGraphicBounds } from "../../../../src/grammar/schemas/graphicBounds.js";

const edges = ["left", "right", "top", "bottom"];
const kinds = ["color", "line", "shape", "gradient", "interval", "size", "width", "opacity", "combined"];
const rows = [0, 1, 2, 3].map(i => ({ x: i, y: i, g: i < 2 ? "A" : "B", h: i < 2 ? "C" : "D", m: i < 2 ? 0 : 10, n: i < 2 ? 2 : 20 }));
function encoding(kind, revised = false) {
  const category = revised ? "h" : "g", quantity = revised ? "n" : "m";
  if (kind === "line") return ["encodeStrokeDash", { field: category }];
  if (kind === "shape") return ["encodeShape", { field: category }];
  if (kind === "size") return ["encodeSize", { field: quantity, scale: { range: [4 * Math.PI, 36 * Math.PI] } }];
  if (kind === "width") return ["encodeStrokeWidth", { field: quantity, scale: { range: [2, 10] } }];
  if (kind === "opacity") return ["encodeOpacity", { field: quantity }];
  if (kind === "gradient") return ["encodeColor", { field: quantity, fieldType: "quantitative" }];
  if (kind === "interval") return ["encodeColor", { field: quantity, fieldType: "quantitative", scale: { type: "quantize", range: ["red", "blue"] } }];
  return ["encodeColor", { field: category }];
}
function source(kind, factory = chart, revised = false) {
  let p = factory().createCanvas({ width: 3200, height: 2400, margin: 700 }).createData({ values: rows });
  p = ["line", "width"].includes(kind) ? p.createLineMark({ id: "marks" }).encodeGroup({ field: "g" }) : p.createPointMark({ id: "marks" });
  p = p.encodeX({ field: "x" }).encodeY({ field: "y" });
  const [method, options] = encoding(kind, revised);
  p = p[method](options);
  return kind === "combined" ? p.encodeSize({ field: "m", scale: { range: [4 * Math.PI, 36 * Math.PI] } }) : p;
}
function layout(kind, position) {
  return { position, offset: 40, ...(kind === "gradient" ? {} : { itemGap: 28 }), ...(["gradient", "opacity"].includes(kind) ? {} : {
    direction: ["left", "right"].includes(position) ? "vertical" : "horizontal",
    ...(["interval", "size", "width"].includes(kind) ? { columns: 1 } : {}), titlePosition: "top"
  }) };
}
function options(kind, position, border) {
  return { ...layout(kind, position), border,
    ...(["size", "width", "opacity", "gradient", "combined"].includes(kind) ? { count: 3 } : {}),
    ...(kind === "combined" ? { channels: ["color", "size"] } : {}) };
}
function scaleEdit(kind) {
  if (kind === "line") return { id: "strokeDash", range: [[2, 2], [8, 4]] };
  if (kind === "shape") return { id: "shape", range: ["square", "circle"] };
  if (["size", "width", "opacity"].includes(kind)) return {
    id: { size: "size", width: "strokeWidth", opacity: "opacity" }[kind],
    range: kind === "size" ? [9 * Math.PI, 100 * Math.PI] : kind === "width" ? [1, 15] : [0.1, 0.9]
  };
  return { id: "color", range: ["purple", "orange"] };
}
function assertEquivalent(actual, expected) {
  assert.deepEqual(actual.graphicSpec, expected.graphicSpec);
  assert.deepEqual(actual.semanticSpec, expected.semanticSpec);
  assert.deepEqual(actual.resolvedScales, expected.resolvedScales);
}
function assertFit(p) {
  for (const id of Object.keys(p.graphicSpec.objects).filter(id => id.includes("Legend"))) {
    const bounds = resolveConcreteGraphicBounds(p.graphicSpec, id);
    assert.ok(bounds.left >= 0 && bounds.right <= 3200 && bounds.top >= 0 && bounds.bottom <= 2400, id);
  }
}
for (const kind of kinds) test(`${kind} legends converge across every edge and lifecycle operation`, () => {
  const base = source(kind);
  for (const position of edges) for (const border of [false, true]) {
    const opts = options(kind, position, border), p = base.createLegend(opts), before = JSON.stringify(p);
    assertFit(p);
    assertEquivalent(p.removeLegend().createLegend(opts), p);
    assertEquivalent(p.editLegendLabels({ fontSize: 18 }), base.createLegend({ ...opts, labels: { fontSize: 18 } }));
    assertEquivalent(p.editLegendTitle({ title: false }).editLegendTitle({ title: "auto" }), p);
    assertEquivalent(p.editCanvas({ width: 3400 }), base.editCanvas({ width: 3400 }).createLegend(opts));
    assertEquivalent(p.editScale(scaleEdit(kind)), base.editScale(scaleEdit(kind)).createLegend(opts));
    const [method, encoded] = encoding(kind, true);
    assertEquivalent(p[method](encoded), source(kind, chart, true).createLegend(opts));
    for (const edge of edges) {
      assertEquivalent(p.editLegendLayout(layout(kind, edge)), base.createLegend(options(kind, edge, border)));
    }
    assert.equal(JSON.stringify(p), before);
  }
});

test("Basic supports the same created legend graphics for every exposed encoding family and edge", () => {
  // Basic has no opacity/stroke-width encoding or lifecycle editors.
  for (const kind of kinds.filter(kind => !["width", "opacity"].includes(kind))) {
    for (const position of edges) for (const border of [false, true]) {
      const opts = options(kind, position, border);
      assertEquivalent(source(kind, basicChart).createLegend(opts), source(kind).createLegend(opts));
    }
  }
});
