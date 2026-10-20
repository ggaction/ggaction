import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { resolveConcreteGraphicBounds } from "../../../../src/grammar/schemas/graphicBounds.js";
import { resolveTextBounds, textBoundsIntersect } from "../../../../src/core/textMetrics.js";
import { resolveFacetProgramLayout } from "../../../../src/materialization/facets.js";
import { retainedFacetGuideIds } from "../../../../src/materialization/facetHeaders.js";
import { namespaceGraphicId } from "../../../../src/materialization/compositionSnapshot.js";
import { resolveGraphicBounds } from "../../../../src/layout/canvas.js";

const rows = ["1931", "1932"].flatMap(year =>
  ["Manchuria", "Glabron", "Svansota", "Wisconsin"].map((variety, i) => ({
    year, variety, yield: 10 + i, alternate: 20 + i
  })));

function rose(fontSize = 18) {
  return chart().createCanvas({ plot: { width: 200, height: 200 }, margin: 160 })
    .createData({ id: "data", values: rows })
    .createRosePlot({ id: "plot", category: "variety", value: "yield", guides: false })
    .createThetaAxis({ ticksAndLabels: { labels: { fontSize } }, title: false });
}

function assertHeaderClearance(program) {
  const headers = program.graphicSpec.objects["facet-headers"].items.map(item =>
    resolveTextBounds(item.properties, program.materializationConfigs.textMetrics));
  for (const child of program.compositionSpec.children) {
    for (const id of retainedFacetGuideIds(program, child)) {
      const bounds = resolveConcreteGraphicBounds(program.graphicSpec,
        namespaceGraphicId(`facet-${child}`, id), program.materializationConfigs.textMetrics);
      if (bounds) for (const header of headers) assert.equal(textBoundsIntersect(header, bounds), false, id);
    }
  }
}

test("plot-spaced Rose headers clear outward theta text and preserve explicit plot gap", () => {
  const base = rose(), snapshot = serializeProgram(base);
  const p = base.facet({ field: "year", spacing: "plot", gap: 200, guides: { legend: false } });
  assertHeaderClearance(p);
  const { layout } = resolveFacetProgramLayout(p);
  const [a, b] = layout.children, pa = resolveGraphicBounds(p.children[a.id]), pb = resolveGraphicBounds(p.children[b.id]);
  assert.equal(b.x + pb.x - a.x - pa.x - pa.width, 200);
  assert.equal(pa.width, 200);
  const header = resolveTextBounds(p.graphicSpec.objects["facet-headers"].items[0].properties);
  const labels = resolveConcreteGraphicBounds(p.graphicSpec,
    namespaceGraphicId(`facet-${a.id}`, "thetaAxisLabels"));
  assert.ok(labels.top - header.bottom >= 10 - 1e-9);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
  assert.equal(serializeProgram(base), snapshot);
});

test("role headers on every edge clear guide ink without changing the child Canvas", () => {
  const base = rose();
  for (const side of ["top", "bottom", "left", "right"]) {
    const p = base.facet({ field: "year", spacing: "plot", gap: 400,
      guides: { legend: false }, headers: { column: { side } } });
    assertHeaderClearance(p);
    for (const child of Object.values(p.children)) {
      assert.deepEqual(child.graphicSpec.objects.canvas.properties, base.graphicSpec.objects.canvas.properties);
    }
  }
});

test("source label edits recalculate header lanes and reject insufficient internal gaps", () => {
  const small = rose(8).facet({ field: "year", spacing: "plot", gap: 200, guides: { legend: false } });
  const bigger = small.editFacetSource({ action: { method: "editThetaAxisLabels", options: { fontSize: 18 } } });
  assertHeaderClearance(bigger);
  assert.ok(bigger.graphicSpec.objects.canvas.properties.height > small.graphicSpec.objects.canvas.properties.height);
  const direct = rose(18).facet({ field: "year", spacing: "plot", gap: 200, guides: { legend: false } });
  assert.deepEqual(bigger.graphicSpec, direct.graphicSpec);
  assert.throws(() => rose().facet({ field: "year", columns: 1, spacing: "plot", gap: 30,
    guides: { legend: false } }), /too small for the facet headers/);
});

test("parallel and Cartesian top guides share the same header clearance policy", () => {
  const base = chart().createCanvas({ plot: { width: 200, height: 200 }, margin: 100 })
    .createData({ values: rows });
  const parallel = base.createParallelCoordinates({ id: "plot", dimensions: ["yield", "alternate"] });
  const cartesian = base.createScatterPlot({ x: "yield", y: "alternate", guides: false })
    .createXAxis({ position: "top" });
  for (const source of [parallel, cartesian]) {
    assertHeaderClearance(source.facet({ field: "year", spacing: "plot", gap: 200, guides: { legend: false } }));
  }
});
