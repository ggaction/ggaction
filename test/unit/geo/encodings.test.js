import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { getMarkItems } from "../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";

const feature = (id, n, category, geometry = { type: "Point", coordinates: [20 + n, 40] }) => ({ type: "Feature", id, properties: { n, category }, geometry });
const values = (...features) => ({ type: "FeatureCollection", features });
const base = (input = values(feature("a", 1, "first"), feature("b", 4, "second")), mode = "Point") => chart().createCanvas({ width: 480, height: 300, margin: { left: 0, right: 160, top: 0, bottom: 0 } })
  .createGeometryData({ id: "map-data", format: "geojson", coordinateKind: "planar", featureKey: "id", values: input })
  .createProjection({ id: "projection", type: "identity" }).createCoordinate({ type: "geo" })[`createGeo${mode}Mark`]({ id: "cities" });
const props = p => p.graphicSpec.objects.cities.items.map(item => item.properties);

test("geographic color reuses feature fields, native scales, legends and constant transitions", () => {
  const p = base().encodeColor({ field: "category", scale: { id: "color", range: ["red", "blue"] } }).createLegend({ target: "cities", channels: ["color"] });
  assert.deepEqual(props(p).map(item => item.fill), ["red", "blue"]);
  assert.deepEqual(p.resolvedScales.color.domain, ["first", "second"]);
  assert.equal(p.semanticSpec.layers[0].data, undefined);
  const keys = getMarkItems(p).map(item => item.key);
  const q = p.editColorScale({ id: "color", range: ["green", "purple"] });
  assert.deepEqual(props(q).map(item => item.fill), ["green", "purple"]);
  assert.deepEqual(getMarkItems(q).map(item => item.key), keys);
  const fixed = q.encodeColor({ value: "orange" });
  assert.deepEqual(props(fixed).map(item => item.fill), ["orange", "orange"]);
  assert.equal(fixed.semanticSpec.layers[0].encoding?.color, undefined);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
});

test("geographic point size uses square-pixel area at one feature grain", () => {
  const p = base().encodeSize({ field: "n", scale: { id: "area", domain: [1, 4], range: [Math.PI, 16 * Math.PI] } }).createLegend({ target: "cities", channels: ["size"] });
  assert.deepEqual(props(p).map(item => item.radius), [1, 4]);
  const fixed = p.encodeSize({ value: 9 * Math.PI });
  assert.deepEqual(props(fixed).map(item => item.radius), [3, 3]);
  assert.equal(fixed.semanticSpec.layers[0].encoding?.size, undefined);
  const multi = base(values(feature("multi", 4, "one", { type: "MultiPoint", coordinates: [[10, 10], [30, 30]] }))).encodeSize({ field: "n", scale: { id: "area", domain: [1, 4], range: [Math.PI, 16 * Math.PI] } });
  assert.equal(getMarkItems(multi).length, 1); assert.deepEqual(props(multi).map(item => item.radius), [4, 4]);
});

test("geographic mapping validates the complete feature before mutation and excludes empty geometry", () => {
  const p = base(values(feature("a", 1, "first"), feature("null", 99, "missing", null))).encodeColor({ field: "n", fieldType: "quantitative", scale: { id: "color", range: ["white", "black"] } });
  assert.deepEqual(p.resolvedScales.color.domain, [1, 1]);
  const before = serializeProgram(p), trace = p.trace;
  assert.throws(() => p.editGeometryData({ values: values(feature("a", "bad", "first")) }), /finite|number|quantitative/);
  assert.equal(serializeProgram(p), before); assert.equal(p.trace, trace);
  assert.equal(getMarkItems(p).length, 1);
});

test("geographic guides infer independent color and area blocks and retain the surviving block", () => {
  const p = base().encodeColor({ field: "category", scale: { id: "color", range: ["red", "blue"] } })
    .encodeSize({ field: "n", scale: { id: "area", range: [4, 25] } }).createLegend();
  assert.ok(p.graphicSpec.objects.colorLegendSymbolPoints);
  assert.ok(p.graphicSpec.objects.sizeLegendSymbols);
  const q = p.encodeColor({ value: "orange" });
  assert.equal(q.graphicSpec.objects.colorLegendSymbolPoints, undefined);
  assert.ok(q.graphicSpec.objects.sizeLegendSymbols);
  assert.deepEqual(props(q).map(item => item.radius), props(p).map(item => item.radius));
});

test("geographic line and shape colors share native continuous and discrete scale mapping", () => {
  const p = base(values(feature("a", 1, "first", { type: "LineString", coordinates: [[0, 0], [20, 40]] }),
    feature("b", 4, "second", { type: "LineString", coordinates: [[40, 0], [60, 40]] })), "Line").removeMark({ target: "cities" })
    .createGeoLineMark({ id: "lines" }).encodeColor({ field: "n", fieldType: "quantitative", scale: { id: "color", domain: [1, 4], range: ["red", "blue"] } })
    .createLegend();
  const lines = p.graphicSpec.objects.lines.items;
  assert.deepEqual(lines.map(item => item.properties.stroke), ["#ff0000", "#0000ff"]);
  assert.deepEqual(lines.map(item => item.properties.fill), ["none", "none"]);
  const q = p.encodeColor({ field: "n", fieldType: "quantitative", scale: { id: "bins", type: "threshold", domain: [2], range: ["red", "blue"] } });
  assert.deepEqual(q.graphicSpec.objects.lines.items.map(item => item.properties.stroke), ["red", "blue"]);
  const shape = base(values(feature("a", 1, "first", { type: "Polygon", coordinates: [[[10, 10], [30, 10], [30, 30], [10, 10]]] })), "Shape")
    .removeMark({ target: "cities" }).createGeoShapeMark({ id: "areas" }).encodeColor({ field: "category", scale: { id: "color", range: ["red"] } }).createLegend();
  assert.equal(shape.graphicSpec.objects.areas.items[0].properties.fill, "red");
  assert.throws(() => shape.encodeSize({ field: "n" }), /point|size|radius/i);
});

test("feature mapping rejects topology policies and direct style conflicts before changing state", () => {
  const p = base().encodeColor({ field: "category" }).encodeSize({ field: "n" });
  const before = serializeProgram(p), trace = p.trace;
  for (const run of [() => p.editGeoPointMark({ fill: "red" }), () => p.editGeoPointMark({ radiusPx: 5 }),
    () => p.editGeoPointMark({ radiusDeg: 5 }), () => p.encodeColor({ field: "category", layout: "stack" }),
    () => p.encodeColor({ field: "n", fieldType: "quantitative", aggregate: "sum" })]) {
    assert.throws(run); assert.equal(serializeProgram(p), before); assert.equal(p.trace, trace);
  }
  assert.equal(p.editGeoPointMark({ opacity: 0 }).graphicSpec.objects.cities.items[0].properties.opacity, 0);
});

test("channel selection uses semantic feature values while temporal units share native normalization", () => {
  const p = base(values(feature("a", 2020, "first"), feature("b", 2024, "second")))
    .encodeColor({ field: "n", fieldType: "temporal", temporalUnit: "year", scale: { id: "color", range: ["white", "black"] } })
    .selectMarks({ id: "first", channel: "color", op: "eq", value: Date.UTC(2020, 0, 1) })
    .highlightMarks({ selection: "first", fill: "red" });
  assert.deepEqual(getMarkItems(p).map(item => item.channels.color), [Date.UTC(2020, 0, 1), Date.UTC(2024, 0, 1)]);
  assert.equal(getMarkItems(p).find(item => item.fields.n === 2020).properties.fill, "red");
  assert.notEqual(getMarkItems(p).find(item => item.fields.n === 2024).properties.fill, "red");
});

test("geographic categorical size, zero area and explicit unknown retain native mapping semantics", () => {
  const p = base(values(feature("a", 1, "first"), feature("b", 4, null)))
    .encodeSize({ field: "category", fieldType: "nominal", scale: { id: "area", domain: ["first"], range: [0], unknown: 4 * Math.PI } });
  assert.deepEqual(props(p).map(item => item.radius), [0, 2]);
  assert.equal(getMarkItems(p).length, 2);
  assert.throws(() => p.editSizeScale({ id: "area", unknown: -1 }), /non-negative|area/);
  const q = p.encodeSize({ field: "n", scale: { id: "measured", type: "threshold", domain: [2], range: [Math.PI, 9 * Math.PI] } });
  assert.deepEqual(props(q).map(item => item.radius), [1, 3]);
});

test("empty geographic domains require explicit policy and clipping does not filter source measurements", () => {
  const p = base().encodeColor({ field: "n", fieldType: "quantitative", scale: { id: "color", emptyDomain: "preserve" } });
  const clipped = p.editProjection({ clipExtentPx: [[0, 0], [1, 1]] });
  assert.deepEqual(clipped.resolvedScales.color.domain, [1, 4]); assert.equal(getMarkItems(clipped).length, 0);
  const empty = p.editGeometryData({ values: values() });
  assert.deepEqual(empty.resolvedScales.color.domain, [1, 4]); assert.deepEqual(props(empty), []);
  const newSource = p.createGeometryData({ id: "empty", format: "geojson", coordinateKind: "planar", featureKey: "id", values: values() });
  assert.throws(() => newSource.editGeoPointMark({ geometry: "empty" }), /domain|binding/);
  const explicit = newSource.editColorScale({ id: "color", domain: [0, 5] }).editGeoPointMark({ geometry: "empty" });
  assert.deepEqual(explicit.resolvedScales.color.domain, [0, 5]); assert.deepEqual(props(explicit), []);
  assert.throws(() => base(values()).encodeColor({ field: "n", fieldType: "quantitative" }), /empty|domain/);
});
