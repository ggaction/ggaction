import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { deriveArcSectors } from "../../../../src/grammar/arcs.js";

const rows = [{ category: "A", value: 1 }, { category: "A", value: 1 },
  { category: "B", value: 3 }, { category: "C", value: 4 }, { category: "Z", value: 0 }];
const base = () => chart().createCanvas({ width: 1000, height: 700, margin: 150 })
  .createData({ id: "source", values: rows }).createArcMark({ id: "sectors" });
const theta = { field: "category", fieldType: "nominal" };
const measured = { field: "value", aggregate: "sum", mapping: "area", scale: { range: [70, 140] } };
const radiusScale = p => p.semanticSpec.scales.find(s => s.id === "radius");
const sectors = p => deriveArcSectors(rows, p.semanticSpec.layers[0], {
  thetaScale: p.resolvedScales.theta, radiusScale: p.resolvedScales.radius
}).sectors;
function rejects(p, args, pattern) {
  const before = JSON.stringify(p);
  assert.throws(() => p.encodeR(args), pattern);
  assert.equal(JSON.stringify(p), before);
}

test("encodes category sums as annular areas with preserved source membership", () => {
  const p = base().encodeTheta(theta).encodeR(measured);
  assert.deepEqual(p.resolvedScales.radius.domain, [0, 4]);
  assert.equal(radiusScale(p).radialMapping, "area");
  assert.equal(radiusScale(p).zero, true);
  assert.equal(radiusScale(p).nice, false);
  const actual = sectors(p);
  assert.deepEqual(actual.map(s => s.radius), [2, 3, 4]);
  assert.deepEqual(actual.map(s => s.sourceIndices), [[0, 1], [2], [3]]);
  [Math.sqrt(12250), Math.sqrt(15925), 140].forEach((value, i) =>
    assert.ok(Math.abs(actual[i].outerRadius - value) < 1e-10));
  assert.equal(p.semanticSpec.layers[0].encoding.radius.mapping, undefined);
  assert.deepEqual(p.semanticSpec.datasets[0].values, rows);
});

test("counts without a measure field and transitions between count and sum", () => {
  const p = base().encodeTheta(theta).encodeR({ aggregate: "count", mapping: "radius-length" });
  assert.equal(Object.hasOwn(p.semanticSpec.layers[0].encoding.radius, "field"), false);
  assert.equal(Object.hasOwn(p.semanticSpec.layers[0].encoding.radius, "datum"), false);
  assert.deepEqual(p.resolvedScales.radius.domain, [0, 2]);
  const sum = p.encodeR({ field: "value", aggregate: "sum" });
  assert.equal(radiusScale(sum).radialMapping, "radius-length");
  assert.deepEqual(sum.resolvedScales.radius.domain, [0, 4]);
  const count = sum.encodeR({ aggregate: "count" });
  assert.deepEqual(count.semanticSpec, p.semanticSpec);
  assert.deepEqual(count.graphicSpec, p.graphicSpec);
});

test("supports radius-first authoring, pending Canvas edits, and exact completion", () => {
  for (const args of [measured, { mapping: "area", aggregate: "count" }]) {
    const pending = base().encodeR(args);
    assert.equal(pending.resolvedScales.radius, undefined);
    assert.equal(pending.graphicSpec.objects.sectors.items.length, 0);
    const actual = pending.editCanvas({ height: 800 }).encodeTheta(theta);
    const expected = base().editCanvas({ height: 800 }).encodeTheta(theta).encodeR(args);
    assert.deepEqual({ ...actual.semanticSpec, scales: [...actual.semanticSpec.scales].sort((a, b) => a.id.localeCompare(b.id)) },
      { ...expected.semanticSpec, scales: [...expected.semanticSpec.scales].sort((a, b) => a.id.localeCompare(b.id)) });
    assert.deepEqual(actual.graphicSpec, expected.graphicSpec);
    assert.deepEqual(actual.resolvedScales, expected.resolvedScales);
  }
});

test("updates all measured geometry and guides on mapping reassignment", () => {
  const p = base().encodeTheta(theta).encodeR(measured)
    .createRadialAxis({ ticksAndLabels: { values: [0, 2, 3, 4] } }).createRadialGrid({ values: [0, 2, 3, 4] });
  const q = p.encodeR({ field: "value", mapping: "radius-length" });
  assert.deepEqual(sectors(q).map(s => s.outerRadius), [105, 122.5, 140]);
  assert.equal(radiusScale(p).radialMapping, "area");
  const viaScale = p.editScale({ id: "radius", radialMapping: "radius-length" });
  assert.deepEqual(viaScale.semanticSpec, q.semanticSpec);
  assert.deepEqual(viaScale.graphicSpec, q.graphicSpec);
});

test("preserves compatible measured scale settings on reassignment and new scale ids", () => {
  const p = base().encodeTheta(theta).encodeR(measured);
  assert.deepEqual(p.encodeR({ field: "value" }).semanticSpec, p.semanticSpec);
  const q = p.encodeR({ field: "value", scale: { id: "other", domain: [0, 8], range: [70, 140] } });
  assert.equal(q.resolvedScales.other.radialMapping, "area");
  assert.deepEqual(q.resolvedScales.other.domain, [0, 8]);
  rejects(p, { field: "value", scale: { domain: [0, 3] } }, /cover/);
});

test("rejects invalid measured aggregate, geometry, data, and non-Arc consumers atomically", () => {
  const p = base().encodeTheta(theta);
  for (const args of [
    { field: "value", aggregate: "sum" }, { field: "value", mapping: "area" },
    { field: "value", mapping: "area", aggregate: "count" },
    { field: "value", mapping: "area", aggregate: "mean" },
    { ...measured, mapping: "disk" }, { ...measured, fieldType: "nominal" },
    { ...measured, scale: { nice: true } }, { ...measured, scale: { zero: false } },
    { ...measured, scale: { type: "sqrt" } }, { ...measured, scale: { reverse: true } },
    { ...measured, scale: { range: [140, 70] } }
  ]) rejects(p, args);
  const point = chart().createCanvas().createData({ id: "d", values: rows }).createPointMark();
  rejects(point, measured, /Arc radius/);
  assert.throws(() => p.encodeX({ field: "value", mapping: "area" }));
  for (const value of [-1, NaN, Infinity, null, 0]) {
    const q = chart().createCanvas().createData({ id: "d", values: [{ category: "A", value }] }).createArcMark();
    rejects(q, measured);
  }
  rejects(base().encodeTheta({ ...theta, aggregate: "count" }), measured, /equal-angle/);
});

test("rejects measured and ordinary shared scale consumers without altering the source", () => {
  const p = base().encodeTheta(theta).encodeR(measured).createPointMark({ id: "points" });
  rejects(p, { target: "points", field: "value", scale: { id: "radius" } });
  const generic = base().encodeTheta(theta).encodeR({ field: "value" }).createArcMark({ id: "other" })
    .encodeTheta({ ...theta, target: "other" });
  rejects(generic, { ...measured, target: "other" });
});

test("allows a pending second measured consumer and resolves it when theta is assigned", () => {
  const p = base().encodeTheta(theta).encodeR(measured).createArcMark({ id: "other", data: "source" })
    .encodeR({ ...measured, target: "other" });
  assert.equal(p.graphicSpec.objects.other.items.length, 0);
  const q = p.encodeTheta({ ...theta, target: "other" });
  assert.deepEqual(q.graphicSpec.objects.other.items.map(item => item.properties), q.graphicSpec.objects.sectors.items.map(item => item.properties));
});

test("authors and validates the canonical measured scale through lower scale actions", () => {
  const p = chart().createScale({ id: "r", radialMapping: "area" });
  assert.deepEqual(p.createScale({ id: "r", radialMapping: "area" }).semanticSpec, p.semanticSpec);
  for (const patch of [{ type: "sqrt" }, { radialMapping: "disk" }, { nice: true }, { zero: false },
    { domain: [1, 4] }, { range: [4, 2] }, { unknown: 0 }]) {
    assert.throws(() => p.editScale({ id: "r", ...patch }));
    assert.throws(() => chart().createScale({ id: "r", radialMapping: "area", ...patch }));
  }
  assert.equal(p.editScale({ id: "r", radialMapping: "radius-length" }).semanticSpec.scales[0].radialMapping, "radius-length");
});

test("inherits measured Arc grain without attaching it to ordinary point radius", () => {
  for (const args of [measured, { mapping: "area", aggregate: "count", scale: { range: [70, 140] } }]) {
    const p = base().encodeTheta(theta).encodeR(args);
    const arc = p.createArcMark({ id: "other" });
    assert.deepEqual(arc.semanticSpec.layers[1].encoding, p.semanticSpec.layers[0].encoding);
    assert.deepEqual(arc.graphicSpec.objects.other.items.map(item => item.properties), p.graphicSpec.objects.sectors.items.map(item => item.properties));
    const point = p.createPointMark({ id: "points" });
    assert.equal(point.semanticSpec.layers[1].encoding.radius, undefined);
  }
});

test("clears measured radius explicitly before reusing its scale for ordinary radius", () => {
  const p = base().encodeTheta(theta).encodeR(measured);
  assert.throws(() => p.editScale({ id: "radius", radialMapping: undefined }), /Remove measured/);
  const q = p.removeEncoding({ channel: "radius" })
    .editScale({ id: "radius", radialMapping: undefined })
    .encodeR({ field: "value" });
  assert.equal(radiusScale(q).radialMapping, undefined);
  assert.equal(q.semanticSpec.layers[0].encoding.radius.aggregate, undefined);
  assert.equal(p.semanticSpec.layers[0].encoding.radius.aggregate, "sum");
});

test("validates pending radius bounds and prevents orphaned category-dependent radial guides", () => {
  const pending = base().encodeR(measured);
  assert.throws(() => pending.editCanvas({ height: 500 }), /range|radius|fit/);
  const p = pending.encodeTheta(theta).createRadialAxis().createRadialGrid();
  const before = JSON.stringify(p);
  assert.throws(() => p.removeEncoding({ channel: "theta" }), /Remove measured radius/);
  assert.equal(JSON.stringify(p), before);
  const q = p.removeEncoding({ channel: "radius" }).removeEncoding({ channel: "theta" });
  assert.equal(q.guideConfigs.axis?.radius, undefined);
  assert.equal(q.graphicSpec.objects.sectors.items.length, 0);
});
