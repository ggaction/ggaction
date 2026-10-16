import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { resolveConcreteGraphicBounds } from "../../../../src/grammar/schemas/graphicBounds.js";
import { resolveFacetProgramLayout } from "../../../../src/materialization/facets.js";
import { prepareSharedFacetLegend } from "../../../../src/materialization/facetGuides/preparation.js";

function source(gradient = false) {
  const p = chart().createCanvas({ width: 500, height: 400,
    margin: { left: 150, right: 200, top: 100, bottom: 100 } })
    .createData({ values: [
      { x: 1, y: 2, panel: "A", row: "One", color: "u", value: 10 },
      { x: 2, y: 3, panel: "B", row: "One", color: "v", value: 20 },
      { x: 3, y: 4, panel: "A", row: "Two", color: "u", value: 30 },
      { x: 4, y: 5, panel: "B", row: "Two", color: "v", value: 40 }
    ] }).createScatterPlot({ x: "x", y: "y", guides: false })
    ;
  if (gradient === "size") return p.encodeSize({ field: "value" });
  if (gradient === "opacity") return p.encodeOpacity({ field: "value" });
  return p.encodeColor(gradient ? { field: "value", fieldType: "quantitative" } : { field: "color" });
}
function geometry(program) {
  const prepared = prepareSharedFacetLegend(program);
  const { plot, layout } = resolveFacetProgramLayout(program, prepared);
  return { plot, layout, legend: resolveConcreteGraphicBounds(program.graphicSpec, `${program.compositionSpec.id}-shared-legend`) };
}
function assertContained(program) {
  const { layout, legend } = geometry(program);
  assert.ok(legend.left >= 0 && legend.top >= 0);
  assert.ok(legend.right <= layout.width && legend.bottom <= layout.height);
  for (const child of layout.children) {
    assert.ok(child.x >= 0 && child.y >= 0);
    assert.ok(child.x + child.width <= layout.width);
    assert.ok(child.y + child.height <= layout.height);
  }
}

test("promoted outside guides use plot-union offsets while retaining child Canvas dimensions", () => {
  for (const gradient of [false, true, "size", "opacity"]) for (const position of ["left", "right", "top", "bottom"]) {
    const unit = source(gradient).editCanvas({ width: 1400, height: 800, margin: { top: 300, bottom: 300 } })
      .createLegend({ position, offset: 30 });
    const saved = serializeProgram(unit);
    const p = unit.facet({ field: "panel", spacing: "plot", gap: 40, guides: { legend: "shared" } });
    const { plot, legend } = geometry(p);
    const distance = position === "left" ? plot.x - legend.right
      : position === "right" ? legend.left - plot.x - plot.width
      : position === "top" ? plot.y - legend.bottom : legend.top - plot.y - plot.height;
    assert.equal(distance, 30, `${gradient}:${position}`);
    if (["left", "right"].includes(position)) assert.equal(legend.top, plot.y);
    assertContained(p);
    for (const child of Object.values(p.children)) {
      assert.equal(child.graphicSpec.objects.canvas.properties.width, 1400);
      assert.equal(child.graphicSpec.objects.canvas.properties.height, 800);
      assert.deepEqual(child.materializationConfigs.canvas.margin, unit.materializationConfigs.canvas.margin);
    }
    assert.equal(serializeProgram(unit), saved);
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
  }
});

test("inferred offsets clear actual retained axes and headers and replay after layout edits", () => {
  const unit = source().createXAxis({ title: { text: "Bottom axis" } })
    .createLegend({ position: "bottom" });
  const p = unit.facetGrid({ rows: { field: "row" }, columns: { field: "panel" },
    guides: { axes: "outer", legend: "shared" } }).editFacetHeaders({ role: "column", side: "bottom" });
  for (const current of [p, p.editCompositionLayout({ gap: 40, padding: 12 }),
    p.editFacetGuides({ axes: "each" }), p.editFacetScales({ x: "independent" }),
    p.createTitle({ text: "Overview", subtitle: "Details" })]) {
    assertContained(current);
    const { plot, legend } = geometry(current);
    assert.ok(legend.top > plot.y + plot.height + 8);
    assert.deepEqual(current.editFacetGuides({ legend: false }).editFacetGuides({ legend: "shared" }).graphicSpec,
      current.graphicSpec);
  }
});

test("grouped shared blocks retain plot anchoring and explicit collisions reject atomically", () => {
  const unit = source().encodeSize({ field: "value" })
    .createLegend({ channels: ["color", "size"], position: "right", blockLayout: "column", offset: 17 });
  const p = unit.facet({ field: "panel", guides: { legend: "shared" } });
  const { plot, legend } = geometry(p);
  assert.equal(legend.left - plot.x - plot.width, 17);
  assert.equal(legend.top, plot.y);
  assertContained(p);
  const colliding = source().createLegend({ position: "top", offset: 0 });
  const before = serializeProgram(colliding);
  assert.throws(() => colliding.facet({ field: "panel", columns: 1, spacing: "plot", gap: 40, guides: { legend: "shared" } }), /overlaps retained/);
  assert.equal(serializeProgram(colliding), before);
});


test("free and in-plot groups preserve their existing explicit plot anchors", () => {
  for (const placement of [{ position: "top-left", offset: 10 }, { at: { x: 5, y: 7 } }]) {
    const unit = source().editCanvas({ width: 800, height: 600 })
      .encodeSize({ field: "value" }).createLegend({ ...placement, channels: ["color", "size"], blockLayout: "row" });
    const p = unit.facet({ field: "panel", guides: { legend: "shared" } });
    for (const current of [p, p.editCompositionLayout({ gap: 30, padding: 12 })]) {
      const { plot, legend } = geometry(current);
      assert.equal(legend.left, plot.x + (placement.at?.x ?? 10));
      assert.equal(legend.top, plot.y + (placement.at?.y ?? 10));
      assertContained(current);
    }
  }
});
