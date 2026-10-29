import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { chart, hconcat, prepareFontResource, prepareTextMetrics } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { inspectProgram } from "../../../../src/inspection.js";
import { unionConcreteGraphicBounds } from "../../../../src/grammar/schemas/graphicBounds.js";

const rows = [{ x: 1, y: 1, g: "A" }, { x: 2, y: 2, g: "B" }];
const source = () => chart().createCanvas({ width: 600, height: 500, margin: 20, responsive: {} })
  .createData({ id: "data", values: rows });
const points = () => source().createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" });
function assertMeasured(program) {
  const graphic = program.graphicSpec;
  const ids = graphic.order.flatMap(id => id === "canvas" ? graphic.objects.canvas.children ?? [] : [id]);
  assert.deepEqual(program.materializationConfigs.canvas.responsiveResult.snapshot.occupied,
    unionConcreteGraphicBounds(graphic, ids, program.materializationConfigs.textMetrics));
  assert.ok(program.materializationConfigs.canvas.responsiveResult.iterations <= 4);
  assert.deepEqual(deserializeProgram(serializeProgram(program)).graphicSpec, graphic);
}

test("all four legend edges and chart title converge independently of authoring order", () => {
  const base = points().encodeColor({ field: "g" }).createXAxis().createYAxis();
  for (const position of ["left", "right", "top", "bottom"]) {
    const first = base.createTitle({ text: "Chart title" }).createLegend({ position });
    const second = base.createLegend({ position }).createTitle({ text: "Chart title" });
    assert.deepEqual(first.graphicSpec, second.graphicSpec);
    assertMeasured(first);
    assertMeasured(first.editCanvas({ width: 650 }));
  }
});

test("source revision refreshes domains, guide decisions and occupied bounds atomically", () => {
  const base = points().createXAxis().createYAxis();
  const before = serializeProgram(base);
  const updated = base.reviseData({ source: "data", id: "updated", values: [{ x: 20, y: 300, g: "A" }, { x: 40, y: 100, g: "B" }] });
  assertMeasured(updated);
  assert.notDeepEqual(updated.resolvedScales.y.domain, base.resolvedScales.y.domain);
  assert.equal(serializeProgram(base), before);
  const explicit = base.editScale({ id: "x", range: [90, 400] }).editCanvas({ width: 700 });
  assert.deepEqual(explicit.resolvedScales.x.range, [90, 400]);
  assertMeasured(explicit);
});

test("guide-free point appearance refreshes occupied stroke bounds through the existing consumer path", () => {
  const base = points(), before = serializeProgram(base);
  const updated = base.editPointMark({ stroke: "red", strokeWidth: 20 });
  assertMeasured(updated);
  assert.notDeepEqual(updated.materializationConfigs.canvas.responsiveResult.snapshot.occupied,
    base.materializationConfigs.canvas.responsiveResult.snapshot.occupied);
  assert.equal(serializeProgram(base), before);
});

test("turning off the Canvas policy keeps label intent dormant and removes its derived choice", () => {
  const base = points().createXAxis({ ticksAndLabels: { labels: { responsive: {} } } });
  const off = base.editCanvas({ responsive: false, margin: 80 });
  assert.ok(off.guideConfigs.axis.x.labels.responsive);
  assert.equal(off.guideConfigs.axis.x.labels.responsiveResult, undefined);
  assert.equal(inspectProgram(off).layouts, undefined);
  const on = off.editCanvas({ responsive: {} });
  assert.ok(on.guideConfigs.axis.x.labels.responsiveResult);
  assertMeasured(on);
});

test("scoped concat replacement preserves each child's responsive state and inspection path", () => {
  const child = points().createXAxis().createYAxis();
  const joined = hconcat({ programs: [{ id: "left", program: child }, { id: "right", program: child }] });
  const changed = joined.replaceCompositionChild({ target: "left", program: child.editCanvas({ width: 650 }) });
  assert.equal(changed.children.right, joined.children.right);
  assert.equal(changed.children.left.graphicSpec.objects.canvas.properties.width, 650);
  assert.deepEqual(inspectProgram(changed).layouts.map(layout => layout.childPath), [["left"], ["right"]]);
  assertMeasured(changed.children.left);
  assert.deepEqual(deserializeProgram(serializeProgram(changed)).graphicSpec, changed.graphicSpec);
});

test("exact font preparation closes responsive wrap queries and unmeasured edits fail without estimates", async () => {
  const bytes = new Uint8Array(readFileSync(new URL("../../../fixtures/fonts/metric-fixture.ttf", import.meta.url)));
  const expectedHash = createHash("sha256").update(bytes).digest("hex");
  let measuredQueries = 0;
  const host = { requestToken: "current", load: () => ({ bytes, mimeType: "font/ttf" }),
    decode: value => Object.fromEntries(["contentHash", "family", "style", "weight", "metricsProviderVersion"].map(key => [key, value[key]])),
    measure: ({ asset, queries }) => { measuredQueries += queries.length; return { contentHash: asset.contentHash,
      metricsProviderVersion: asset.metricsProviderVersion,
      widths: queries.map(query => [...query.text].length * query.fontSize / 2) }; } };
  let program = chart().createCanvas({ width: 400, height: 320, margin: 20, responsive: {} })
    .createData({ values: ["A long alpha category", "A long beta category", "A long gamma category", "A long delta category"].map((x, i) => ({ x, y: i + 1 })) })
    .createBarPlot({ x: "x", y: "y", guides: { axes: { x: { ticksAndLabels: { labels: { responsive: {} } } }, y: {} }, legend: false } });
  const fonts = [];
  for (const weight of [400, 600, 700]) {
    const id = `font${weight}`; fonts.push(id);
    const prepared = await prepareFontResource(program, { kind: "create", id, uri: "fixture:font", mimeType: "font/ttf",
      expectedHash, family: "sans-serif", style: "normal", weight, metricsProviderVersion: "responsive-test@1" }, host);
    program = program.createFontResource({ prepared, requestToken: "current" });
  }
  const { load: _load, ...metricHost } = host;
  const prepared = await prepareTextMetrics(program, { id: "exact", fonts }, metricHost);
  const exact = program.applyTextMetrics({ prepared, requestToken: "current" });
  assert.ok(measuredQueries > 4);
  assertMeasured(exact);
  assert.equal(exact.materializationConfigs.textMetrics.schemaVersion, 2);
  assert.ok(exact.graphicSpec.objects.xAxisLabels.items.every(item => item.properties.font.contentHash === expectedHash));
  const before = serializeProgram(exact);
  assert.throws(() => exact.editXAxisLabels({ labelMap: [{ value: "A long alpha category", label: "Unmeasured new caption" }] }),
    error => error.assetCode === "metrics-required");
  assert.equal(serializeProgram(exact), before);
});

test("Polar and Parallel guide lanes keep unique edge identities during Canvas reservation", () => {
  const base = () => chart().createCanvas({ width: 600, height: 500, margin: 30, responsive: {} })
    .createData({ values: [{ x: 0, y: 1 }, { x: 2, y: 3 }] });
  const polar = base().createPointMark().encodeTheta({ field: "x" }).encodeR({ field: "y" }).createThetaAxis().createRadialAxis();
  const parallel = base().createParallelCoordinates({ dimensions: ["x", "y"], guides: { legend: false } });
  for (const p of [polar, parallel]) {
    const ids = p.materializationConfigs.canvas.responsiveResult.snapshot.lanes.map(lane => lane.id);
    assert.equal(new Set(ids).size, ids.length);
    assertMeasured(p);
    assertMeasured(p.editCanvas({ width: 650 }));
  }
});
