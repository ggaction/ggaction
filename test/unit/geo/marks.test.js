import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat, vconcat } from "../../../src/index.js";
import { chart as basic } from "../../../src/basic.js";
import { getMarkItems, inspectProgram, comparePrograms } from "../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../src/persistence/codec.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { createTransitionScene } from "../../../src/scene.js";
import { exportAccessibleData } from "../../../src/accessibility.js";
import { pathFillContains } from "../../../src/grammar/pathGeometry.js";
import { geoSelectionPolicy } from "../../../src/materialization/selection/policies/geo.js";

const point = coordinates => ({ type: "Point", coordinates });
const line = coordinates => ({ type: "LineString", coordinates });
const polygon = coordinates => ({ type: "Polygon", coordinates });
const feature = (id, geometry) => ({ type: "Feature", id, properties: { code: id }, geometry });
const collection = (...features) => ({ type: "FeatureCollection", features });
const square = [[10, 10], [90, 10], [90, 90], [10, 90], [10, 10]];
const hole = [[30, 30], [30, 70], [70, 70], [70, 30], [30, 30]];
function base(values, spherical = false, projection = {}) {
  return chart().createCanvas({ width: 400, height: 300, margin: 0 })
    .createGeometryData({ id: "world", format: "geojson", values, coordinateKind: spherical ? "geographic" : "planar", featureKey: ["properties", "code"] })
    .createProjection({ id: "map", type: spherical ? "equirectangular" : "identity", ...projection })
    .createCoordinate({ type: "geo" });
}
const children = (p, id = "geo-shape") => p.graphicSpec.objects[id].items;
function traceOps(node, op) { return [node, ...(node.children ?? []).flatMap(child => traceOps(child))].filter(value => op === undefined || value.op === op); }

test("mixed geographic features preserve one logical item and independent concrete parts with holes", () => {
  const p = base(collection(feature("region", polygon([square, hole])), feature("cities", { type: "MultiPoint", coordinates: [[15, 20], [80, 75]] }), feature("road", line([[0, 0], [100, 100]])), feature("empty", null)))
    .createGeoShapeMark({ fill: "orange", strokeWidth: 0 });
  const items = getMarkItems(p, { target: "geo-shape" });
  assert.deepEqual(items.map(item => item.fields.code), ["region", "cities", "road"]);
  assert.deepEqual(items.map(item => item.geometry.length), [1, 2, 1]);
  assert.equal(children(p).length, 4);
  const region = children(p)[0].properties;
  assert.equal(pathFillContains(region.commands, { x: 20, y: 20 }, { fillRule: region.fillRule }), true);
  assert.equal(pathFillContains(region.commands, { x: 50, y: 50 }, { fillRule: region.fillRule }), false);
  assert.equal(children(p).at(-1).properties.fill, "none");
  assert.equal(new Set(children(p).map(child => JSON.stringify([child.identity.key, child.identity.role]))).size, 4);
  const source = geoSelectionPolicy.resolveSourceItems(p, p.semanticSpec.layers[0]);
  assert.equal(source.length, 4); assert.equal(source.at(-1).graphicRoles.length, 0);
  assert.equal(inspectProgram(p).views[0].logicalDataItems, 4);
  assert.equal(exportAccessibleData(p, { target: "geo-shape" }).views[0].rows.length, 3);
  assert.deepEqual(createTransitionScene(deserializeProgram(serializeProgram(p))), createTransitionScene(p));
  assert.match(renderToSVG(p), /fill-rule="evenodd"/);
});

test("date-line splitting and clipped hidden points retain source identities through projection edits", () => {
  const p = base(collection(feature("seam", line([[179, 0], [-179, 0]]))), true, { scalePx: 50, translatePx: [200, 150] }).createGeoLineMark();
  assert.equal(getMarkItems(p, { target: "geo-line" }).length, 1);
  assert.equal(children(p, "geo-line").length, 2);
  for (const part of children(p, "geo-line")) assert.ok(Math.abs(part.properties.commands[1].x - part.properties.commands[0].x) < 1);
  const hidden = base(collection(feature("front", point([0, 0])), feature("back", point([180, 0]))), true, { type: "orthographic", scalePx: 100, translatePx: [200, 150] }).createGeoPointMark();
  assert.deepEqual(getMarkItems(hidden, { target: "geo-point" }).map(item => item.fields.code), ["front"]);
  const sourceKeys = geoSelectionPolicy.resolveSourceItems(hidden, hidden.semanticSpec.layers[0]).map(item => item.key);
  const turned = hidden.editProjection({ rotateDeg: [180, 0] });
  assert.deepEqual(getMarkItems(turned, { target: "geo-point" }).map(item => item.fields.code), ["back"]);
  assert.deepEqual(geoSelectionPolicy.resolveSourceItems(turned, turned.semanticSpec.layers[0]).map(item => item.key), sourceKeys);
});

test("pixel radii remain constant while geographic radii project a spherical disk", () => {
  const p = base(collection(feature("city", point([0, 0]))), true, { type: "orthographic", scalePx: 100, translatePx: [200, 150] }).createGeoPointMark({ radiusPx: 7 });
  const zoom = p.editProjection({ scalePx: 200 });
  assert.equal(children(zoom, "geo-point")[0].properties.radius, 7);
  const disk = p.editGeoPointMark({ radiusDeg: 10 }), properties = children(disk, "geo-point")[0].properties;
  assert.equal(children(disk, "geo-point")[0].type, "path");
  assert.equal(pathFillContains(properties.commands, { x: 200, y: 150 }, { fillRule: properties.fillRule }), true);
  assert.equal(pathFillContains(properties.commands, { x: 250, y: 150 }, { fillRule: properties.fillRule }), false);
  for (const command of properties.commands.filter(command => command.op !== "Z")) assert.ok(Math.abs(Math.hypot(command.x - 200, command.y - 150) - 100 * Math.sin(Math.PI / 18)) < 1e-7);
  assert.equal(children(disk.editGeoPointMark({ radiusPx: 5 }), "geo-point")[0].properties.radius, 5);
  assert.throws(() => base(collection(feature("p", point([0, 0])))).createGeoPointMark({ radiusDeg: 10 }), /geographic/);
});

test("geometry and fit revisions preflight the complete union and materialize each geographic consumer once", () => {
  const p = base(collection(feature("a", point([0, 0])), feature("b", point([10, 10]))), false, { fit: { width: 200, height: 200 } })
    .createGeoPointMark({ id: "cities" }).createGeoShapeMark({ id: "symbols" });
  const before = serializeProgram(p), trace = p.trace;
  const q = p.editGeometryData({ values: collection(feature("b", point([20, 10])), feature("a", point([0, 0]))) });
  assert.deepEqual(q.semanticSpec.resources.map(r => r.revision), [1, 1]);
  assert.ok(q.semanticSpec.layers.every(layer => layer.geoBinding.geometry.revision === 1));
  const steps = traceOps(q.trace.children.at(-1), "materializeGeoMark");
  assert.deepEqual(steps.map(step => step.args.id).sort(), ["cities", "symbols"]);
  assert.deepEqual(getMarkItems(q, { target: "cities" }).map(item => item.key), getMarkItems(p, { target: "cities" }).map(item => item.key).reverse());
  assert.throws(() => p.editGeometryData({ values: collection(feature("line", line([[0, 0], [10, 10]]))) }), /incompatible/);
  assert.throws(() => p.editProjection({ type: "mercator" }), /incompatible|planar/);
  assert.equal(serializeProgram(p), before); assert.equal(p.trace, trace);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
});

test("coordinate reassignment and projection inspection follow the sole stored projection binding", () => {
  const p = base(collection(feature("a", point([10, 20])))).createGeoPointMark()
    .createProjection({ id: "double", type: "identity", scalePx: 2 });
  const q = p.editCoordinate({ target: "main", projection: "double" });
  assert.deepEqual([children(q, "geo-point")[0].properties.x, children(q, "geo-point")[0].properties.y], [20, 40]);
  assert.equal(q.semanticSpec.layers[0].geoBinding.projection, undefined);
  const revised = q.editProjection({ target: "double", translatePx: [5, 5] });
  assert.ok(inspectProgram(revised, { target: { kind: "projection", id: "double" } }).views.some(view => view.owner.id === "geo-point"));
  assert.ok(comparePrograms(q, revised, { target: { kind: "projection", id: "double" } }).changes.some(change => change.resource.kind === "mark"));
  assert.throws(() => q.removeResource({ kind: "geometry", id: "world" }), /consumer|reference|referenced/);
  assert.throws(() => q.removeCoordinate({ id: "main" }), /consumer|reference|referenced/);
  assert.throws(() => q.removeResource({ kind: "geometry", id: "world", cascade: true }), /live mark/);
  const removed = q.removeMark({ target: "geo-point" }).removeResource({ kind: "geometry", id: "world" });
  assert.equal(removed.semanticSpec.layers.length, 0);
});

test("geographic feature highlights apply to every split part and preserve line styling", () => {
  const p = base(collection(feature("seam", line([[179, 0], [-179, 0]]))), true, { scalePx: 50, translatePx: [200, 150] }).createGeoLineMark({ stroke: "navy", strokeWidth: 2 });
  const hidden = p.highlightMarks({ id: "faded", target: "geo-line", select: { field: "code", op: "eq", value: "seam" }, stroke: "navy", opacity: 0 });
  assert.ok(children(hidden, "geo-line").every(child => child.properties.opacity === 0 && child.properties.stroke === "navy"));
  const colored = p.highlightMarks({ id: "red", target: "geo-line", select: { field: "code", op: "eq", value: "seam" }, color: "red" });
  assert.ok(children(colored, "geo-line").every(child => child.properties.fill === "none" && child.properties.stroke === "red"));
  const revised = colored.editProjection({ scalePx: 60 });
  assert.ok(children(revised, "geo-line").every(child => child.properties.stroke === "red"));
  assert.deepEqual(deserializeProgram(serializeProgram(revised)).graphicSpec, revised.graphicSpec);
});

test("graticules retain explicit resolved geographic intent and fail bounded pathological requests", () => {
  const p = chart().createCanvas().createProjection({ id: "map", type: "equirectangular", scalePx: 100 }).createCoordinate({ type: "geo" })
    .createGraticule({ extentDeg: [[-20, -10], [20, 10]], stepDeg: [20, 10], precisionDeg: 5 });
  assert.equal(getMarkItems(p, { target: "graticule" }).length, 6);
  assert.ok(children(p, "graticule").every(child => child.properties.fill === "none"));
  assert.equal(p.semanticSpec.resources.length, 1);
  const q = p.editGraticule({ stepDeg: [10, 10] });
  assert.equal(getMarkItems(q, { target: "graticule" }).length, 8);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
  for (const args of [{ stepDeg: [0, 1] }, { stepDeg: [Number.MIN_VALUE, 1] }, { precisionDeg: Number.MIN_VALUE }, { extentDeg: [[5, 0], [-5, 10]] }, { radiusPx: 5 }, { fill: "red" }]) assert.throws(() => p.editGraticule(args));
  assert.equal(serializeProgram(p), serializeProgram(deserializeProgram(serializeProgram(p))));
});

test("stored geographic marks reject missing intent, incompatible geometry and malformed style", () => {
  const p = base(collection(feature("a", point([10, 20])))).createGeoPointMark(), envelope = JSON.parse(serializeProgram(p));
  const mutations = [s => { delete s.semanticSpec.layers[0].geoBinding; }, s => { s.semanticSpec.layers[0].geoBinding.mode = "line"; },
    s => { s.semanticSpec.layers[0].geoBinding.geometry.revision++; }, s => { s.semanticSpec.layers[0].geoBinding.projection = "map"; },
    s => { delete s.materializationConfigs.marks["geo-point"].geo.radiusPx; }, s => { s.materializationConfigs.marks["geo-point"].geo.blend = "invalid"; },
    s => { s.semanticSpec.layers[0].encoding = { x: { datum: 1 } }; }, s => { s.semanticSpec.layers[0].conditionals = {}; }];
  for (const mutate of mutations) { const state = decodeValue(envelope.payload); mutate(state); assert.throws(() => deserializeProgram(JSON.stringify({ ...envelope, payload: encodeValue(state) }))); }
  const graticule = chart().createCanvas().createProjection({ id: "map", type: "orthographic" }).createCoordinate({ type: "geo" }).createGraticule();
  const saved = JSON.parse(serializeProgram(graticule)), state = decodeValue(saved.payload); delete state.semanticSpec.layers[0].geoBinding.graticule.stepDeg;
  assert.throws(() => deserializeProgram(JSON.stringify({ ...saved, payload: encodeValue(state) })), /resolved/);
  for (const args of [{ radiusPx: -1 }, { clip: "yes" }, { radiusDeg: 180 }, { radiusPx: 1, radiusDeg: 2 }, { opacity: 2 }, { coordinate: "absent" }, { geometry: "absent" }, { blend: "invalid" }, { fill: undefined }]) assert.throws(() => p.editGeoPointMark(args));
  assert.throws(() => p.editGeoPointMark({}), /nonempty/);
  assert.equal(typeof basic().createGeoPointMark, "undefined");
});

test("geographic composition preserves child namespaces and rejects implicit data partitioning", () => {
  const p = base(collection(feature("a", point([10, 20])))).createGeoPointMark({ clip: true });
  for (const compose of [hconcat, vconcat]) {
    const joined = compose({ programs: [{ id: "left", program: p }, { id: "right", program: p }] });
    const changed = joined.editGeoPointMark({ target: { childPath: ["left"], id: "geo-point" }, radiusPx: 9 });
    assert.equal(changed.children.right, p); assert.equal(children(changed.children.left, "geo-point")[0].properties.radius, 9);
    assert.deepEqual(createTransitionScene(deserializeProgram(serializeProgram(changed))), createTransitionScene(changed));
  }
  for (const run of [() => p.facet({ field: "code" }), () => p.repeatCharts({ target: "geo-point", channel: "x", fields: ["x", "y"] })]) assert.throws(run, /eligible|data|source|support|field role/i);
  const changed = p.editCanvas({ width: 500 });
  assert.equal(children(changed, "geo-point")[0].properties.x, 10);
  assert.equal(changed.graphicSpec.objects["geo-point"].clip.width, 500);
});

test("geographic great-circle routes can explicitly clear a hint without changing source identity", () => {
  const p = base(collection(feature("route", line([[0, 0], [180, 0]]))), true).createGeoLineMark({ interpolation: "great-circle", routeHint: [90, 30] });
  assert.throws(() => p.editGeoLineMark({ routeHint: false }), /Antipodal/);
  const q = p.editGeoLineMark({ interpolation: "source-segment", routeHint: false });
  assert.equal(q.semanticSpec.layers[0].geoBinding.routeHint, undefined);
  assert.deepEqual(getMarkItems(q, { target: "geo-line" }).map(item => item.key), getMarkItems(p, { target: "geo-line" }).map(item => item.key));
});

test("nested point collections project every geographic disk and bound generated circle expansion", () => {
  const nested = { type: "GeometryCollection", geometries: [null, { type: "MultiPoint", coordinates: [[-20, 0], [20, 0]] }, { type: "GeometryCollection", geometries: [point([0, 20])] }] };
  const p = base(collection(feature("places", nested)), true, { type: "orthographic", scalePx: 100, translatePx: [200, 150] }).createGeoPointMark({ radiusDeg: 5 });
  assert.equal(getMarkItems(p, { target: "geo-point" }).length, 1);
  assert.equal(children(p, "geo-point").length, 3);
  assert.ok(children(p, "geo-point").every(child => child.type === "path"));
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
  const before = serializeProgram(p);
  assert.throws(() => p.editProjection({ scalePx: 1e9, precisionPx: .001 }), /circle points|generated item/i);
  assert.equal(serializeProgram(p), before);
  assert.throws(() => p.editGeoPointMark({ routeHint: [0, 100], interpolation: "great-circle" }), /routeHint/);
  assert.throws(() => p.editGeoPointMark({ routeHint: [0, 0], interpolation: "source-segment" }), /routeHint/);
});

test("geographic source revision keeps unrelated resources, coordinates and rendered owners exact", () => {
  const p = base(collection(feature("city", point([10, 20])))).createGeoPointMark({ id: "cities" })
    .createParameter({ id: "gain", value: 2 })
    .createProjection({ id: "other", type: "identity", scalePx: 3 })
    .createCoordinate({ id: "other", type: "geo", projection: "other" })
    .createGeoPointMark({ id: "other-cities", geometry: "world" });
  const q = p.editGeometryData({ target: "world", values: collection(feature("city", point([20, 40]))) });
  assert.equal(children(q, "cities")[0].properties.x, 20);
  assert.equal(children(q, "other-cities")[0].properties.x, 60);
  assert.equal(q.semanticSpec.resources.find(resource => resource.kind === "parameter"), p.semanticSpec.resources.find(resource => resource.kind === "parameter"));
  assert.deepEqual(q.semanticSpec.coordinates, p.semanticSpec.coordinates);
  assert.deepEqual(traceOps(q.trace.children.at(-1), "materializeGeoMark").map(step => step.args.id).sort(), ["cities", "other-cities"]);
});

test("geographic selection rejects stale concrete identity and resolves null feature properties", () => {
  const p = chart().createCanvas().createGeometryData({ id: "world", format: "geojson", coordinateKind: "planar", featureKey: "id", values: collection({ type: "Feature", id: "plain", properties: null, geometry: point([10, 20]) }) }).createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" }).createGeoPointMark();
  assert.deepEqual(getMarkItems(p, { target: "geo-point" })[0].fields, {});
  const layer = p.semanticSpec.layers[0];
  const absent = { ...p, graphicSpec: { ...p.graphicSpec, objects: {} }, markConfigs: p.markConfigs };
  assert.equal(geoSelectionPolicy.resolveSourceItems(absent, layer).length, 1);
  assert.throws(() => geoSelectionPolicy.resolveItems(absent, layer), /materialized/);
  const items = children(p, "geo-point").map(({ identity, ...child }) => child);
  const stale = { ...p, graphicSpec: { ...p.graphicSpec, objects: { ...p.graphicSpec.objects, "geo-point": { ...p.graphicSpec.objects["geo-point"], items } } }, markConfigs: p.markConfigs };
  assert.throws(() => geoSelectionPolicy.resolveItems(stale, layer), /identity/);
});
