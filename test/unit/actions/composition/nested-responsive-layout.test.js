import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { chart, hconcat, prepareFontResource, prepareTextMetrics } from "../../../../src/index.js";
import { createNestedResponsive, createNestedResponsiveSource, nestedRows } from "../../../../examples/nested-responsive/program.js";
import { resolveGraphicBounds } from "../../../../src/layout/canvas.js";
import { resolveFacetProgramLayout } from "../../../../src/materialization/facets.js";
import { namespaceGraphicId } from "../../../../src/materialization/compositionSnapshot.js";
import { resolveConcreteGraphicBounds } from "../../../../src/grammar/schemas/graphicBounds.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { getErrorDetails } from "../../../../src/diagnostics.js";
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
function checkFacet(facet, domain) {
  const { layout } = resolveFacetProgramLayout(facet), columns = new Map(), footers = [];
  for (const placement of layout.children) {
    const child = facet.children[placement.id], plot = resolveGraphicBounds(child);
    assert.deepEqual(child.resolvedScales.y.domain, domain);
    assert.equal(child.semanticSpec.scales.find(scale => scale.id === "y").domain, "auto");
    assert.equal(child.graphicSpec.objects.canvas.properties.width, 340);
    assert.equal(child.graphicSpec.objects.canvas.properties.height, 300);
    assert.deepEqual(child.materializationConfigs.canvas.margin, { top: 20, right: 20, bottom: 20, left: 20 });
    assert.equal(child.context.facetMaterialization, undefined);
    const x = placement.x + plot.x;
    if (columns.has(placement.column)) close(x, columns.get(placement.column));
    else columns.set(placement.column, x);
    const lineId = namespaceGraphicId(`${facet.compositionSpec.id}-${placement.id}`, "xAxisLine");
    if (facet.graphicSpec.objects[lineId]) footers.push(resolveConcreteGraphicBounds(facet.graphicSpec, lineId).top);
  }
  const headers = facet.graphicSpec.objects["facet-headers"].items;
  close(headers[0].properties.x, headers[2].properties.x);
  close(headers[0].properties.x, headers[4].properties.x);
  close(headers[1].properties.x, headers[3].properties.x);
  assert.equal(layout.rows, 3);
  assert.equal(footers.length, 2); close(footers[0], footers[1]);
  assert.deepEqual(deserializeProgram(serializeProgram(facet)).graphicSpec, facet.graphicSpec);
}

test("three-row responsive facets preserve the shared domain, aligned plots and common retained footer", () => {
  const nested = createNestedResponsive();
  checkFacet(nested.children.panels, [0, 20]);
  const plots = Object.values(nested.children.panels.children).map(resolveGraphicBounds);
  for (const plot of plots) assert.deepEqual(plot, plots[0]);
  const bars = Object.values(nested.children.panels.children).map(child => child.graphicSpec.objects.bars.items);
  // The first panel's largest value is 4, so its bar is one fifth of the
  // common height, rather than incorrectly filling a cell-local 0..4 scale.
  close(Math.max(...bars[0].map(item => item.properties.height)), plots[0].height / 5);
  close(Math.max(...bars[4].map(item => item.properties.height)), plots[4].height);
});

test("shared responsive domains remain exact across large label widths and independent policy edits", () => {
  const values = nestedRows.map((row, i) => ({ ...row, value: (i % 4 + 1) * 10 ** Math.floor(i / 4) }));
  const source = createNestedResponsiveSource().reviseData({ source: "rows", id: "wide", values });
  const facet = source.facet({ field: "panel", columns: 2, spacing: "content", gap: 32, guides: { axes: "outer" } });
  checkFacet(facet, [0, 40000]);
  const independent = facet.editFacetScales({ y: "independent" });
  assert.deepEqual(Object.values(independent.children).map(child => child.resolvedScales.y.domain), [[0,4],[0,40],[0,400],[0,4000],[0,40000]]);
  assert.deepEqual(independent.editFacetScales({ y: "shared" }).graphicSpec, facet.graphicSpec);
});

test("scoped source resize, data and font-size changes refresh every ancestor and preserve unrelated views", () => {
  const base = createNestedResponsive(), saved = serializeProgram(base), path = { childPath: ["panels"], facetSource: true };
  const resized = base.editCanvas({ target: path, width: 420 });
  for (const child of Object.values(resized.children.panels.children)) assert.equal(child.graphicSpec.objects.canvas.properties.width, 420);
  const changed = base.reviseData({ target: { childPath: ["panels"] }, source: "rows", id: "revised", values: nestedRows.map(row => ({ ...row, value: row.value * 2 })) });
  checkFacet(changed.children.panels, [0, 40]);
  const font = base.editXAxisLabels({ target: path, fontSize: 15 });
  for (const result of [resized, changed, font]) {
    assert.equal(result.children.overview, base.children.overview);
    assert.notDeepEqual(result.graphicSpec, base.graphicSpec);
    assert.deepEqual(deserializeProgram(serializeProgram(result)).graphicSpec, result.graphicSpec);
    const fresh = hconcat({ id: "report", programs: Object.entries(result.children).map(([id, program]) => ({ id, program })), gap: 32, align: "start" });
    assert.deepEqual(result.graphicSpec, fresh.graphicSpec);
  }
  assert.equal(serializeProgram(base), saved);
});

test("responsive full grids keep empty cells, measured headers and shared scale ranges", () => {
  const source = createNestedResponsiveSource().reviseData({ source: "rows", id: "gridRows", values: nestedRows.map((row, i) => ({ ...row, row: i < 8 ? "north" : "south" })) });
  const grid = source.facetGrid({ rows: { field: "row" }, columns: { field: "panel" }, combinations: "full" });
  assert.equal(Object.keys(grid.children).length, 10);
  assert.equal(grid.compositionSpec.facet.grid.cells.filter(cell => cell.empty).length, 5);
  for (const child of Object.values(grid.children)) {
    assert.deepEqual(child.resolvedScales.y.domain, [0,20]);
    assert.equal(child.context.facetMaterialization, undefined);
    assert.deepEqual(child.resolvedScales.y.range, [resolveGraphicBounds(child).y + resolveGraphicBounds(child).height, resolveGraphicBounds(child).y]);
  }
  const themed = grid.applyTheme({ theme: "dark", scope: "descendants" });
  for (const cell of grid.compositionSpec.facet.grid.cells.filter(cell => cell.empty)) {
    assert.equal(themed.children[cell.id].graphicSpec.objects.bars.items.length, 0);
    assert.deepEqual(themed.children[cell.id].resolvedScales.y.domain, [0,20]);
    assert.equal(themed.children[cell.id].context.facetMaterialization, undefined);
  }
  assert.deepEqual(deserializeProgram(serializeProgram(grid)).graphicSpec, grid.graphicSpec);
});

test("insufficient scoped resize leaves all programs, traces and transient scale authority unchanged", () => {
  const base = createNestedResponsive(), saved = serializeProgram(base), trace = base.trace;
  assert.throws(() => base.editCanvas({ target: { childPath: ["panels"], facetSource: true }, width: 100 }),
    error => getErrorDetails(error)?.reason === "layout-unsatisfied");
  assert.equal(serializeProgram(base), saved); assert.equal(base.trace, trace);
  assert.equal(base.context.facetMaterialization, undefined);
  assert.deepEqual(base.editFacetGuides({ target: { childPath: ["panels"] }, axes: "outer" }).graphicSpec, base.graphicSpec);
});

test("prepared fonts remeasure the retained source, headers and ancestors without stale layout authority", async () => {
  const bytes = new Uint8Array(readFileSync(new URL("../../../fixtures/fonts/metric-fixture.ttf", import.meta.url)));
  const expectedHash = createHash("sha256").update(bytes).digest("hex");
  const host = { requestToken: "current", load: () => ({ bytes, mimeType: "font/ttf" }),
    decode: value => Object.fromEntries(["contentHash", "family", "style", "weight", "metricsProviderVersion"].map(key => [key, value[key]])),
    measure: async ({ asset, queries }) => ({ contentHash: asset.contentHash, metricsProviderVersion: asset.metricsProviderVersion,
      widths: queries.map(query => [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(query.text)].length * query.fontSize / 2) }) };
  let program = createNestedResponsive();
  const before = serializeProgram(program), fonts = [];
  for (const weight of [400, 600, 700]) {
    const id = `font${weight}`; fonts.push(id);
    const prepared = await prepareFontResource(program, { kind: "create", id, uri: "fixture:font", mimeType: "font/ttf",
      expectedHash, family: "sans-serif", style: "normal", weight, metricsProviderVersion: "nested-metrics@1" }, host);
    program = program.createFontResource({ prepared, requestToken: "current" });
  }
  const { load: _load, ...metricHost } = host;
  const prepared = await prepareTextMetrics(program, { id: "exact", fonts }, metricHost);
  const measured = program.applyTextMetrics({ prepared, requestToken: "current" });
  assert.notEqual(serializeProgram(measured), before);
  for (const child of Object.values(measured.children.panels.children)) {
    assert.equal(child.materializationConfigs.textMetrics.schemaVersion, 2);
    assert.equal(child.context.facetMaterialization, undefined);
    assert.deepEqual(child.resolvedScales.y.domain, [0, 20]);
    assert.ok(child.graphicSpec.objects.xAxisLabels.items.every(item => item.properties.font.contentHash === expectedHash));
  }
  const headers = measured.children.panels.graphicSpec.objects["facet-headers"].items;
  assert.ok(headers.every(item => item.properties.font.contentHash === expectedHash));
  const widened = measured.editCanvas({ target: { childPath: ["panels"], facetSource: true }, width: 420 });
  assert.deepEqual(deserializeProgram(serializeProgram(widened)).graphicSpec, widened.graphicSpec);
  const removed = measured.removeTextMetrics();
  checkFacet(removed.children.panels, [0, 20]);
  const saved = serializeProgram(measured);
  assert.throws(() => measured.editFacetHeaders({ target: { childPath: ["panels"] }, labelMap: [{ value: "Region 1", label: "Unmeasured name" }] }),
    error => error.assetCode === "metrics-required");
  assert.equal(serializeProgram(measured), saved);
});


test("descendant themes and category order preserve resolved facet domains through responsive reflow", () => {
  const base = createNestedResponsive();
  const themed = base.applyTheme({ theme: { base: "dark", tokens: { fontSize: 14 } }, scope: "descendants" });
  checkFacet(themed.children.panels, [0, 20]);
  assert.deepEqual(themed.removeTheme().graphicSpec, base.graphicSpec);
  const ordered = createNestedResponsiveSource().orderCategories({ target: "bars", channel: "x",
    by: { field: "value", aggregate: "sum" }, direction: "descending" })
    .facet({ field: "panel", columns: 2, spacing: "content", guides: { axes: "outer" } });
  const expected = ["Category 4 long caption", "Category 3 long caption", "Category 2 long caption", "Category 1 long caption"];
  for (const child of Object.values(ordered.children)) assert.deepEqual(child.resolvedScales.x.domain, expected);
  for (const child of Object.values(ordered.applyTheme({ theme: "dark", scope: "descendants" }).children)) assert.deepEqual(child.resolvedScales.x.domain, expected);
});
