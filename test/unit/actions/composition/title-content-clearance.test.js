import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { unionConcreteGraphicBounds } from "../../../../src/grammar/schemas/graphicBounds.js";

const rows = Array.from({ length: 12 }, (_, i) => ({ x: i + 1, y: i % 4 + 1,
  z: i * 2, panel: i % 2 ? "A" : "B", group: i % 3 ? "One" : "Two" }));
function unit(type = "parallel") {
  const p = chart().createCanvas({ plot: { width: 320, height: 240 }, margin: 140 })
    .createData({ id: "data", values: rows });
  return type === "parallel" ? p.createParallelCoordinates({ id: "plot", dimensions: ["x", "y", "z"] })
    : p.createScatterPlot({ id: "plot", x: "x", y: "y" });
}
const title = { text: "Observations", titleStyle: { fontSize: 23 }, align: "center" };
const bounds = (p, ids) => unionConcreteGraphicBounds(p.graphicSpec, ids, p.materializationConfigs.textMetrics);
function assertGap(p, ids, gap = 16) {
  const text = bounds(p, ["chartTitle", "chartSubtitle"].filter(id => p.graphicSpec.objects[id]));
  const content = bounds(p, ids);
  const distance = content.top - text.bottom;
  assert.ok(gap === null ? distance >= -1e-8 && distance <= 16 + 1e-8 : Math.abs(distance - gap) < 1e-8,
    JSON.stringify({ text, content, gap }));
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
}

for (const type of ["parallel", "scatter"]) for (const spacing of ["canvas", "plot"]) {
  test(`${type} facet title follows header ink rather than empty child margins (${spacing})`, () => {
    const source = unit(type).facet({ field: "panel", columns: 2, spacing, gap: 80,
      guides: { axes: "each", legend: false } });
    const saved = serializeProgram(source);
    const p = source.createTitle(title);
    const gap = spacing === "canvas" ? null : 16; // Keep an already compact reserved lane.
    assertGap(p, ["facet-headers"], gap);
    for (const next of [p.editTitle({ subtitle: "Twelve observations", subtitleStyle: { fontSize: 17 } }),
      p.editTitle({ titleStyle: { fontSize: 32 } }), p.editFacetHeaders({ fontSize: 20 }),
      p.editFacetSource({ action: { method: "editCanvas", options: { margin: { top: 200 } } } })]) {
      assertGap(next, ["facet-headers"], gap);
    }
    assert.deepEqual(p.children, source.children, "title placement must preserve child plots and margins");
    assert.equal(serializeProgram(source), saved);
    assert.deepEqual(p.removeTitle().graphicSpec, source.graphicSpec);
  });
}

test("top shared legends and bottom headers use the final retained graphics", () => {
  const source = unit().encodeColor({ target: "plot", field: "group", fieldType: "nominal" });
  const p = source.facet({ field: "panel", columns: 2, spacing: "plot", gap: 80,
    guides: { axes: "each", legend: { target: "plot", channels: ["color"], position: "top" } } }).createTitle(title);
  const legends = Object.keys(p.graphicSpec.objects).filter(id => /Legend|Gradient/.test(id));
  assertGap(p, [...legends, "facet-headers"]);
  const noHeaders = unit().facet({ field: "panel", columns: 2, spacing: "plot", gap: 80,
    guides: { axes: "each", legend: false }, headers: { column: { side: "bottom" } } }).createTitle(title);
  assertGap(noHeaders, Object.keys(noHeaders.graphicSpec.objects).filter(id => id.endsWith("parallelAxisTitles")));
});

test("concat title uses retained axis text and keeps its child snapshots", () => {
  const source = hconcat({ programs: [unit(), unit("scatter")] });
  const p = source.createTitle({ ...title, subtitle: "Two views" });
  assertGap(p, Object.keys(p.graphicSpec.objects).filter(id => id.endsWith("parallelAxisTitles")));
  assert.deepEqual(p.children, source.children);
  assert.deepEqual(p.editTitle({ alongOffset: 5 }).editTitle({ alongOffset: 0 }).graphicSpec, p.graphicSpec);
});
