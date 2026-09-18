import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { resolveFacetProgramLayout } from "../../../../src/materialization/facets.js";
import { resolveGraphicBounds } from "../../../../src/layout/canvas.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";

function source() {
  return chart().createCanvas({ width: 200, height: 140,
    margin: { left: 80, right: 20, top: 20, bottom: 20 }
  }).createData({ values: [{ group: "A", x: 1, y: 1 }, { group: "B", x: 2, y: 2 }] })
    .createScatterPlot({ x: "x", y: "y", guides: false });
}
function plotGap(program) {
  const { layout } = resolveFacetProgramLayout(program);
  const [a, b] = layout.children;
  const ap = resolveGraphicBounds(program.children[a.id]);
  const bp = resolveGraphicBounds(program.children[b.id]);
  return (b.x + bp.x) - (a.x + ap.x + ap.width);
}

test("Plot spacing measures the gap between data regions and preserves outer margins", () => {
  const base = source();
  const before = serializeProgram(base);
  const regular = base.facet({ field: "group", gap: 5 });
  const result = base.facet({ field: "group", spacing: "plot", gap: 5 });
  assert.equal(plotGap(regular), 105);
  assert.equal(plotGap(result), 5);
  assert.equal(result.graphicSpec.objects.canvas.properties.width, 305);
  assert.equal(serializeProgram(base), before);
  assert.equal(plotGap(deserializeProgram(serializeProgram(result))), 5);
  assert.equal(plotGap(result.editCompositionLayout({ gap: 11 })), 11);
  assert.equal(plotGap(result.editCompositionLayout({ spacing: "canvas" })), 105);
});

test("Overlapping child Canvas extents cannot paint over adjacent plots", () => {
  const result = source().facet({ field: "group", spacing: "plot", gap: 5 });
  const canvases = Object.values(result.graphicSpec.objects).filter(object => object.type === "canvas");
  assert.equal(canvases.length, 3);
  assert.equal(canvases.filter(object => object.properties.background === "transparent").length, 2);
  const backgrounds = Object.entries(result.graphicSpec.objects).filter(([id]) => id.endsWith("_plot-background"));
  assert.equal(backgrounds.length, 2);
  for (const [, background] of backgrounds) {
    assert.deepEqual(background.properties, { x: 80, y: 20, width: 100, height: 100, fill: "white", stroke: "none", strokeWidth: 0 });
  }
  assert.match(renderToSVG(result), /fill="transparent"/);
});

test("Plot spacing refuses insufficient header gaps and invalid modes", () => {
  const base = source();
  assert.throws(() => base.facet({ field: "group", spacing: "plot", columns: 1, gap: 5 }), /too small for the facet headers/);
  const result = base.facet({ field: "group", spacing: "plot", columns: 1, gap: 30 });
  const { layout } = resolveFacetProgramLayout(result);
  const [a, b] = layout.children;
  const ap = resolveGraphicBounds(result.children[a.id]);
  const bp = resolveGraphicBounds(result.children[b.id]);
  assert.equal(b.y + bp.y - a.y - ap.y - ap.height, 30);
  assert.throws(() => base.facet({ field: "group", spacing: "invalid" }), /Unknown facet spacing/);
});

test("Outer guides free internal space while retained guides cannot overlap adjacent plots", () => {
  const base = chart().createCanvas({ plot: { width: 100, height: 100 } })
    .createData({ values: [{ group: "A", x: 1, y: 1000 }, { group: "B", x: 2, y: 2000 }] })
    .createScatterPlot({ x: "x", y: "y", guides: { axes: { x: false, y: {} } } });
  const result = base.facet({ field: "group", spacing: "plot", gap: 5, guides: { axes: "outer" } });
  assert.equal(plotGap(result), 5);
  assert.match(renderToSVG(result), /<svg/);
  assert.throws(() => base.facet({ field: "group", spacing: "plot", gap: 5, guides: { axes: "each" } }),
    /too small for the retained facet guides/);
});

test("Grid and repeated charts retain plot spacing through source and header edits", () => {
  const base = chart().createCanvas({ plot: { width: 100, height: 100 } })
    .createData({ values: [
      { r: "R1", c: "C1", x: 1, y: 1, z: 2 }, { r: "R1", c: "C2", x: 2, y: 2, z: 3 },
      { r: "R2", c: "C1", x: 1, y: 3, z: 4 }, { r: "R2", c: "C2", x: 2, y: 4, z: 5 }
    ] }).createScatterPlot({ x: "x", y: "y", guides: false });
  const grid = base.facetGrid({ rows: { field: "r" }, columns: { field: "c" }, spacing: "plot", gap: 30 })
    .editFacetHeaders({ role: "row", side: "left" });
  const repeated = base.repeatCharts({ channel: "y", fields: ["y", "z"], spacing: "plot", gap: 30 });
  for (const result of [grid, repeated]) {
    assert.equal(plotGap(result), 30);
    const replaced = result.editFacetSource({ program: base });
    assert.equal(replaced.compositionSpec.spacing, "plot");
    assert.equal(plotGap(replaced), 30);
    assert.match(renderToSVG(replaced), /<svg/);
  }
});
