import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { deriveArcSectors } from "../../../../src/grammar/arcs.js";
import { resolveArcItems } from "../../../../src/materialization/selection/items/arc.js";
import { normalizeLegendOrder, resolveLegendOrderDomain } from "../../../../src/grammar/categoryOrder.js";

const values = Object.freeze([
  Object.freeze({ category: "A", value: 2, other: "a", index: 2 }),
  Object.freeze({ category: "B", value: 3, other: "b", index: 1 }),
  Object.freeze({ category: "C", value: 4, other: "c", index: 0 })
]);
function base() {
  return chart().createCanvas({ width: 1000, height: 700, margin: 150 })
    .createData({ id: "data", values });
}
function pie() {
  return base().createPiePlot({ id: "p", category: "category", value: "value", aggregate: "sum" });
}
function labels(program, kind = "color") {
  return program.graphicSpec.objects[`${kind}LegendLabels`].items.map(item => item.properties.text);
}
function sectors(program) {
  return deriveArcSectors(values, program.semanticSpec.layers[0], {
    thetaScale: program.resolvedScales.theta,
    frame: { availableRadius: 200 }
  }).sectors;
}
function snapshot(program) { return JSON.stringify(program); }
function rejectsUnchanged(program, run, pattern) {
  const before = snapshot(program);
  assert.throws(() => run(program), pattern);
  assert.equal(snapshot(program), before);
}

test("orders weighted theta without reassigning colors or changing sector weights", () => {
  const p = pie();
  const before = snapshot(p);
  const q = p.orderCategories({ target: "p", channel: "theta", values: ["C", "A"] });
  assert.deepEqual(q.resolvedScales.theta.domain, ["C", "A", "B"]);
  assert.deepEqual(q.resolvedScales.color, p.resolvedScales.color);
  assert.deepEqual(labels(q), ["A", "B", "C"]);
  const actual = sectors(q);
  assert.deepEqual(actual.map(s => s.sourceIndices), [[2], [0], [1]]);
  assert.deepEqual(actual.map(s => s.endTheta - s.startTheta), [160, 80, 120]);
  assert.deepEqual(q.graphicSpec.order, p.graphicSpec.order);
  assert.equal(snapshot(p), before);
  assert.deepEqual(q.removeCategoryOrder({ channel: "theta" }).graphicSpec, p.graphicSpec);
  const items = resolveArcItems(q, q.semanticSpec.layers[0], q.semanticSpec.datasets[0]);
  assert.equal(items.length, 3);
});

test("links legend order to theta and rematerializes links on order, scale, and Canvas edits", () => {
  const p = pie().editLegend({ order: { channel: "theta" } });
  const q = p.orderCategories({ channel: "theta", values: ["C"] });
  assert.deepEqual(labels(q), ["C", "A", "B"]);
  assert.deepEqual(q.graphicSpec.objects.colorLegendSymbols.items.map(i => i.properties.fill),
    ["#e45756", "#4c78a8", "#f58518"]);
  assert.deepEqual(q.semanticSpec.guides.legend.color.order, { channel: "theta" });
  assert.equal(Object.hasOwn(q.guideConfigs.legend.color, "order"), false);
  assert.deepEqual(labels(q.editCanvas({ width: 1100 })), ["C", "A", "B"]);
  assert.deepEqual(labels(q.removeCategoryOrder({ channel: "theta" })), ["A", "B", "C"]);
  const explicitScale = p.editScale({ id: "theta", domain: ["B", "C", "A"] });
  assert.deepEqual(labels(explicitScale), ["B", "C", "A"]);
  const reset = q.editLegend({ order: "scale" });
  assert.equal(Object.hasOwn(reset.semanticSpec.guides.legend.color, "order"), false);
  assert.deepEqual(labels(reset), ["A", "B", "C"]);
  assert.deepEqual(reset.graphicSpec.objects.p, q.graphicSpec.objects.p);
  assert.deepEqual(labels(q.editLegend({ labels: { fontSize: 14 } })), ["C", "A", "B"]);
});

test("explicit partial legend order changes only items and survives recreation of combined legends", () => {
  const p = pie();
  const q = p.editLegend({ order: { values: ["B"] } });
  assert.deepEqual(labels(q), ["B", "A", "C"]);
  assert.deepEqual(q.graphicSpec.objects.p, p.graphicSpec.objects.p);
  assert.deepEqual(q.resolvedScales, p.resolvedScales);
  const created = p.removeLegend().createLegend({ order: { values: ["B"] } });
  assert.deepEqual(created.graphicSpec, q.graphicSpec);
  const points = base().createPointMark({ id: "p" })
    .encodeX({ field: "category", fieldType: "nominal" }).encodeY({ field: "value" })
    .encodeColor({ field: "category" }).encodeShape({ field: "category" })
    .createLegend({ order: { channel: "x" } })
    .orderCategories({ channel: "x", values: ["C"] });
  assert.deepEqual(labels(points, "series"), ["C", "A", "B"]);
  const remaining = points.removeEncoding({ channel: "shape" });
  assert.deepEqual(remaining.semanticSpec.guides.legend.color.order, { channel: "x" });
  assert.deepEqual(labels(remaining), ["C", "A", "B"]);
});

test("validates legend ordering shape and known categories without changing earlier programs", () => {
  const p = pie();
  for (const order of [null, false, {}, [], "auto", { values: [] }, { values: ["A", "A"] },
    { values: ["unknown"] }, { values: [null] }, { values: ["A"], channel: "theta" },
    { values: ["A"], extra: true }, { channel: "radius" }, { channel: "x" }, { values: undefined }]) {
    rejectsUnchanged(p, q => q.editLegend({ order }), /order|categorical|values/);
    rejectsUnchanged(p.removeLegend(), q => q.createLegend({ order }), /order|categorical|values/);
  }
  assert.deepEqual(normalizeLegendOrder({ values: [false, 0, "0"] }), { values: [false, 0, "0"] });
  assert.deepEqual(resolveLegendOrderDomain([true, false], { values: [false] }), [false, true]);
});

test("rejects missing or mismatched linked fields, domains, and encoding removal until reset", () => {
  const p = pie().editLegend({ order: { channel: "theta" } });
  rejectsUnchanged(p, q => q.removeEncoding({ channel: "theta" }), /Reset linked legend/);
  rejectsUnchanged(p, q => q.encodeTheta({ field: "other", fieldType: "nominal", aggregate: "count" }), /same categorical/);
  rejectsUnchanged(p, q => q.editScale({ id: "theta", domain: ["A", "B", "C", "D"] }), /same categorical domain/);
  rejectsUnchanged(p, q => q.editScale({ id: "color", domain: ["A", "B", "C", "D"] }), /same categorical domain/);
  const incomplete = p.editLegend({ order: "scale" }).removeEncoding({ channel: "theta" });
  assert.equal(incomplete.semanticSpec.layers[0].encoding.theta, undefined);
  const removed = p.removeEncoding({ channel: "color" });
  assert.equal(removed.semanticSpec.guides.legend?.color, undefined);
  const mismatch = base().createPointMark({ id: "p" })
    .encodeX({ field: "other", fieldType: "nominal" }).encodeY({ field: "value" })
    .encodeColor({ field: "category" });
  rejectsUnchanged(mismatch, q => q.createLegend({ order: { channel: "x" } }), /same categorical field/);
});

test("rejects ordering continuous and interval legend families", () => {
  for (const type of ["sequential", "quantize"]) {
    const p = base().createPointMark({ id: "p" }).encodeX({ field: "value" })
      .encodeY({ field: "index" }).encodeColor({ field: "value", fieldType: "quantitative", scale: { type } });
    rejectsUnchanged(p, q => q.createLegend({ order: "scale" }), /order/);
    rejectsUnchanged(p.createLegend(), q => q.editLegend({ order: "scale" }), /order/);
  }
});

test("supports theta count and summary ties, while rejecting incompatible shared ordering", () => {
  const p = pie();
  assert.deepEqual(p.orderCategories({ channel: "theta", by: "count", direction: "descending" })
    .resolvedScales.theta.domain, ["A", "B", "C"]);
  assert.deepEqual(p.orderCategories({ channel: "theta", by: { field: "value", aggregate: "sum" }, direction: "descending" })
    .resolvedScales.theta.domain, ["C", "B", "A"]);
  rejectsUnchanged(p.editScale({ id: "theta", domain: ["A", "B", "C"] }),
    q => q.orderCategories({ channel: "theta", values: ["C"] }), /explicit domain/);
  const shared = p.createArcMark({ id: "other", data: "data" })
    .encodeTheta({ field: "category", fieldType: "nominal", aggregate: "count" });
  const ordered = shared.orderCategories({ target: "p", channel: "theta", values: ["C"] });
  assert.deepEqual(ordered.resolvedScales.theta.domain, ["C", "A", "B"]);
  rejectsUnchanged(ordered, q => q.orderCategories({ target: "other", channel: "theta", values: ["B"] }), /identically/);
  const foreign = p.createData({ id: "foreign", values }).createArcMark({ id: "foreign", data: "foreign" })
    .encodeTheta({ field: "category", fieldType: "nominal", aggregate: "count" });
  rejectsUnchanged(foreign, q => q.orderCategories({ target: "p", channel: "theta", values: ["C"] }), /incompatible shared/);
});

test("supports categorical Polar points and lines without adding or changing path ordering", () => {
  const p = base().createPointMark({ id: "points" })
    .encodeTheta({ field: "category", fieldType: "nominal" }).encodeR({ field: "value" })
    .encodeColor({ field: "category" }).createLegend({ channels: ["color"], order: { channel: "theta" } })
    .createAxes().createGrid();
  const q = p.orderCategories({ channel: "theta", values: ["C"] });
  assert.deepEqual(labels(q), ["C", "A", "B"]);
  assert.deepEqual(q.graphicSpec.objects.thetaAxisLabels.items.map(i => i.properties.text), ["C", "A", "B"]);
  assert.notDeepEqual(q.graphicSpec.objects.points, p.graphicSpec.objects.points);
  const line = base().createLineMark({ id: "line" }).encodeTheta({ field: "category", fieldType: "nominal" })
    .encodeR({ field: "value" });
  const ordered = line.orderCategories({ channel: "theta", values: ["B"] });
  assert.deepEqual(ordered.semanticSpec.layers[0].encoding.pathOrder, line.semanticSpec.layers[0].encoding.pathOrder);
  assert.deepEqual(ordered.graphicSpec.order, line.graphicSpec.order);
  assert.notDeepEqual(ordered.graphicSpec.objects.line, line.graphicSpec.objects.line);
  rejectsUnchanged(base().createPointMark().encodeTheta({ field: "value" }),
    q => q.orderCategories({ channel: "theta", values: [2] }), /categorical/);
});


test("rejects stale category order when a new scale changes the position role", () => {
  const p = pie().orderCategories({ channel: "theta", by: "category" });
  rejectsUnchanged(p, q => q.encodeTheta({ field: "value", fieldType: "quantitative", scale: { id: "numeric", type: "linear" } }), /Remove category order/);
  const reset = p.removeCategoryOrder({ channel: "theta" })
    .encodeTheta({ field: "value", fieldType: "quantitative", scale: { id: "numeric", type: "linear" } });
  assert.deepEqual(reset.resolvedScales.numeric.domain, [2, 4]);
});


test("completes explicit legend order from source appearance while preserving reordered palettes", () => {
  const p = pie().editScale({ id: "color", domain: ["C", "B", "A"] });
  const q = p.editLegend({ order: { values: ["B"] } });
  assert.deepEqual(labels(q), ["B", "A", "C"]);
  assert.deepEqual(q.resolvedScales.color, p.resolvedScales.color);
  assert.deepEqual(q.graphicSpec.objects.p, p.graphicSpec.objects.p);
  assert.deepEqual(q.graphicSpec.objects.colorLegendSymbols.items.map(i => i.properties.fill),
    ["#f58518", "#e45756", "#4c78a8"]);
});
