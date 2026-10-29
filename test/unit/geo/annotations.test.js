import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { chart, hconcat, prepareFontResource, prepareTextMetrics } from "../../../src/index.js";
import { chart as basic } from "../../../src/basic.js";
import { getMarkItems, inspectProgram } from "../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../src/persistence/codec.js";
import { createTransitionScene } from "../../../src/scene.js";
import { geoSelectionPolicy } from "../../../src/materialization/selection/policies/geo.js";

const values = (...features) => ({ type: "FeatureCollection", features });
const point = (id, x, y) => ({ type: "Feature", id, properties: { code: id }, geometry: { type: "Point", coordinates: [x, y] } });
const base = () => chart().createCanvas({ width: 300, height: 200, margin: 0 })
  .createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" });
const annotated = () => base().createGeoAnnotation({ anchor: { type: "position", position: [30, 40] }, text: "Here" });
const items = (p, id = "geo-annotation") => p.graphicSpec.objects[id].items;
const props = (p, id) => items(p, id)[0].properties;
const traceOps = (node, op) => [node, ...(node.children ?? []).flatMap(child => traceOps(child, op))].filter(entry => entry.op === op);

test("geographic position annotations use native text and follow the sole coordinate projection", () => {
  const anchor = { type: "position", position: [30, 40] };
  const p = base().createGeoAnnotation({ anchor, text: "Here", dx: 2, dy: -3, rotation: 15, align: "center", baseline: "middle" });
  anchor.position[0] = 999;
  assert.deepEqual([props(p).x, props(p).y, props(p).text, props(p).rotation], [32, 37, "Here", 15]);
  assert.equal(p.semanticSpec.layers[0].geoBinding.projection, undefined);
  const q = p.editProjection({ scalePx: 2 });
  assert.deepEqual([props(q).x, props(q).y], [62, 77]);
  assert.equal(getMarkItems(q)[0].key, getMarkItems(p)[0].key);
  assert.equal(items(q)[0].identity.lineage.resource.revision, 1);
  assert.ok(inspectProgram(q, { target: { kind: "projection", id: "map" } }).views.some(view => view.owner.id === "geo-annotation"));
  assert.equal(typeof basic().createGeoAnnotation, "undefined");
  assert.equal(typeof basic().editGeoAnnotation, "undefined");
});

test("feature annotations use source centroids and refresh once after geometry edits", () => {
  const square = { type: "Feature", id: "region", properties: { code: "region" }, geometry: { type: "Polygon", coordinates: [[[10, 10], [30, 10], [30, 50], [10, 50], [10, 10]]] } };
  const p = base().createGeometryData({ id: "world", format: "geojson", coordinateKind: "planar", featureKey: "id", values: values(square) })
    .createGeoAnnotation({ anchor: { type: "feature", key: "region" }, text: "Region" });
  assert.deepEqual([props(p).x, props(p).y], [20, 30]);
  const before = serializeProgram(p), trace = p.trace;
  const q = p.editGeometryData({ values: values(point("region", 80, 90)) });
  assert.deepEqual([props(q).x, props(q).y], [80, 90]);
  assert.equal(getMarkItems(q)[0].key, getMarkItems(p)[0].key);
  assert.deepEqual(traceOps(q.trace.children.at(-1), "materializeGeoMark").map(node => node.args.id), ["geo-annotation"]);
  assert.throws(() => p.editGeometryData({ values: values(point("other", 0, 0)) }), /feature key/);
  assert.equal(serializeProgram(p), before); assert.equal(p.trace, trace);
  assert.throws(() => p.removeResource({ kind: "geometry", id: "world" }), /consumer|referenc/);
  assert.equal(p.removeMark({ target: "geo-annotation" }).removeResource({ kind: "geometry", id: "world" }).semanticSpec.resources.length, 1);
});

test("feature annotation anchors retain their original detail level across visible representations", () => {
  const p = base()
    .createGeometryData({ id: "states", format: "geojson", coordinateKind: "planar", featureKey: "id", values: values(point("s", 100, 100)) })
    .createGeometryData({ id: "counties", format: "geojson", coordinateKind: "planar", featureKey: "id", values: values(point("a", 10, 20), point("b", 30, 40)) })
    .createGeoLODData({ id: "regions", levels: [{ id: "state", geometry: "states" }, { id: "county", geometry: "counties", enterZoom: 4.2, exitZoom: 3.8, parents: [{ key: "a", parent: "s" }, { key: "b", parent: "s" }] }], zoom: 5 })
    .createGeoAnnotation({ anchor: { type: "feature", geometry: "regions", key: "a" }, text: "County A" });
  assert.equal(p.semanticSpec.layers[0].geoBinding.anchor.level, "county");
  const q = p.editGeoLODData({ zoom: 0 });
  assert.deepEqual([props(q).x, props(q).y], [10, 20]);
  assert.equal(getMarkItems(q)[0].key, getMarkItems(p)[0].key);
  const r = q.editGeometryData({ target: "counties", values: values(point("a", 15, 25), point("b", 30, 40)) });
  assert.deepEqual([props(r).x, props(r).y], [15, 25]);
  assert.equal(traceOps(r.trace.children.at(-1), "materializeGeoMark").length, 1);
  assert.deepEqual(deserializeProgram(serializeProgram(r)).graphicSpec, r.graphicSpec);
  const explicit = q.createGeoAnnotation({ id: "state-label", anchor: { type: "feature", geometry: "regions", key: "s", level: "state" }, text: "State" });
  assert.deepEqual([props(explicit, "state-label").x, props(explicit, "state-label").y], [100, 100]);
  assert.throws(() => q.editGeoAnnotation({ anchor: { type: "feature", key: "s", level: "unknown" } }), /detail level/);
  const envelope = JSON.parse(serializeProgram(p)), state = decodeValue(envelope.payload);
  delete state.semanticSpec.layers[0].geoBinding.anchor.level;
  assert.throws(() => deserializeProgram(JSON.stringify({ ...envelope, payload: encodeValue(state) })), /detail level/);
});

test("null, clipped and empty annotation content retain semantic intent without placeholder text", () => {
  const p = base().createGeometryData({ id: "world", format: "geojson", coordinateKind: "planar", featureKey: "id", values: values({ ...point("a", 0, 0), geometry: null }) })
    .createGeoAnnotation({ anchor: { type: "feature", key: "a" }, text: "Missing" });
  assert.equal(items(p).length, 0);
  assert.equal(geoSelectionPolicy.resolveSourceItems(p, p.semanticSpec.layers[0]).length, 1);
  assert.equal(items(p.editGeometryData({ values: values(point("a", 10, 20)) })).length, 1);
  const empty = annotated().editGeoAnnotation({ text: "" });
  assert.equal(items(empty).length, 0); assert.equal(items(empty.editGeoAnnotation({ text: "Back" })).length, 1);
  const globe = chart().createCanvas().createProjection({ id: "globe", type: "orthographic", scalePx: 100, translatePx: [150, 100] }).createCoordinate({ type: "geo" })
    .createGeoAnnotation({ anchor: { type: "position", position: [180, 0] }, text: "Far side" });
  assert.equal(items(globe).length, 0);
  assert.equal(items(globe.editProjection({ rotateDeg: [180, 0] })).length, 1);
});

test("joined feature annotations retain table lineage and typed keys across table revisions", () => {
  const p = base().createGeometryData({ id: "world", format: "geojson", coordinateKind: "planar", featureKey: "id", values: values(point(1, 10, 20), point("1", 30, 40)) })
    .createData({ id: "table", values: [{ key: 1, score: 5 }, { key: "1", score: 8 }], keyField: "key" })
    .createGeoJoinData({ id: "joined", geometry: "world", data: "table", geometryKey: "id", dataKey: "key" })
    .createGeoAnnotation({ anchor: { type: "feature", geometry: "joined", key: 1 }, text: "Number one" });
  assert.deepEqual([props(p).x, props(p).y], [10, 20]);
  assert.equal(getMarkItems(p)[0].fields.score, 5); assert.equal(getMarkItems(p)[0].rows.length, 1);
  const q = p.reviseData({ source: "table", id: "updated", values: [{ key: 1, score: 10 }, { key: "1", score: 9 }] });
  assert.equal(getMarkItems(q)[0].fields.score, 10); assert.equal(getMarkItems(q)[0].key, getMarkItems(p)[0].key);
  const r = q.editGeoAnnotation({ anchor: { type: "feature", key: "1" } });
  assert.deepEqual([props(r).x, props(r).y], [30, 40]);
  assert.notEqual(getMarkItems(r)[0].key, getMarkItems(q)[0].key);
});

test("spherical feature anchors use angular centroids and reject incompatible coordinate reassignment", () => {
  const p = chart().createCanvas().createGeometryData({ id: "world", format: "geojson", coordinateKind: "geographic", featureKey: "id", values: values(point("a", 0, 0)) })
    .createProjection({ id: "globe", type: "orthographic", scalePx: 100, translatePx: [150, 100] }).createCoordinate({ type: "geo" })
    .createGeoAnnotation({ anchor: { type: "feature", key: "a" }, text: "Center" });
  assert.deepEqual([props(p).x, props(p).y], [150, 100]);
  const candidate = p.createProjection({ id: "flat", type: "identity" }).createCoordinate({ id: "flat", type: "geo", projection: "flat" });
  assert.throws(() => candidate.editGeoAnnotation({ target: "geo-annotation", coordinate: "flat" }), /incompatible/);
});

test("annotation text shares structured fills, effects, multiline and native clipping", () => {
  const fill = { type: "linear-gradient", from: { x: 0, y: 0 }, to: { x: 1, y: 0 }, stops: [{ offset: 0, color: "red" }, { offset: 1, color: "blue" }] };
  const p = base().createGeoAnnotation({ anchor: { type: "position", position: [30, 40] }, text: "First\nSecond", fill,
    outline: { color: "white", width: 2 }, shadow: { color: "black", blurRadius: 2, offsetX: 1, offsetY: 2 }, blend: "multiply", clip: true,
    lineHeight: 18, blockAlign: "middle", lineCap: "round", lineJoin: "bevel" });
  assert.equal(props(p).fill.type, "linear-gradient"); assert.equal(props(p).blend, "multiply");
  assert.equal(props(p).outline.color, "white"); assert.equal(props(p).shadow.blurRadius, 2);
  assert.equal(props(p).lines.length, 2); assert.equal(p.graphicSpec.objects["geo-annotation"].clip.width, 300);
  const q = p.editGeoAnnotation({ outline: false, shadow: false, text: "One", clip: false });
  assert.equal(props(q).outline, undefined); assert.equal(props(q).shadow, undefined); assert.equal(props(q).lines.length, 1);
  assert.equal(q.graphicSpec.objects["geo-annotation"].clip, undefined);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
});

test("annotation themes preserve equal-default authored overrides and reset native text defaults", () => {
  const p = annotated(), before = serializeProgram(p);
  const q = p.applyTheme({ theme: { base: "dark", tokens: { fontSize: 20, fontWeight: 700 } } });
  assert.equal(props(q).fontSize, 20); assert.equal(props(q).fontWeight, 700); assert.equal(props(q).fill, "#e2e8f0");
  assert.equal(props(q.removeTheme()).fontSize, 12); assert.equal(props(q.removeTheme()).fill, "#334155");
  const authored = q.editGeoAnnotation({ fontSize: 12, fill: "#334155" }).applyTheme({ theme: { base: "light", tokens: { fontSize: 24 } } });
  assert.equal(props(authored).fontSize, 12); assert.equal(props(authored).fill, "#334155");
  const first = base().applyTheme({ theme: { base: "dark", tokens: { fontSize: 18 } } }).createGeoAnnotation({ anchor: { type: "position", position: [0, 0] }, text: "First" });
  assert.equal(props(first).fontSize, 18); assert.equal(props(first).fill, "#e2e8f0");
  assert.equal(serializeProgram(p), before);
});

test("prepared font profiles bind geographic annotation text and reject unprepared edits atomically", async () => {
  const p = base().createGeoAnnotation({ anchor: { type: "position", position: [10, 20] }, text: "AB" });
  const bytes = new Uint8Array(readFileSync(new URL("../../fixtures/fonts/metric-fixture.ttf", import.meta.url)));
  const expectedHash = createHash("sha256").update(bytes).digest("hex");
  const decode = value => Object.fromEntries(["contentHash", "family", "style", "weight", "metricsProviderVersion"].map(key => [key, value[key]]));
  const prepared = await prepareFontResource(p, { kind: "create", id: "font", uri: "fixture:annotation", expectedHash,
    mimeType: "font/ttf", family: "sans-serif", style: "normal", weight: 400, metricsProviderVersion: "fixture@1" },
  { requestToken: "font", load: () => ({ bytes, mimeType: "font/ttf" }), decode });
  const withFont = p.createFontResource({ prepared, requestToken: "font" });
  const metrics = await prepareTextMetrics(withFont, { id: "exact", fonts: ["font"] }, { requestToken: "metrics", decode,
    measure: ({ asset, queries }) => ({ contentHash: asset.contentHash, metricsProviderVersion: asset.metricsProviderVersion,
      widths: queries.map(({ text, fontSize }) => [...text].reduce((sum, letter) => sum + ({ A: .6, B: .8 }[letter] ?? 0), 0) * fontSize) }) });
  const exact = withFont.applyTextMetrics({ prepared: metrics, requestToken: "metrics" }), before = serializeProgram(exact);
  assert.equal(props(exact).font.contentHash, expectedHash);
  assert.throws(() => exact.editGeoAnnotation({ text: "ABA" }), error => error.assetCode === "metrics-required");
  assert.throws(() => exact.applyTheme({ theme: { base: "light", tokens: { fontSize: 20 } } }), error => error.assetCode === "metrics-required");
  assert.equal(serializeProgram(exact), before);
  assert.deepEqual(createTransitionScene(deserializeProgram(before)), createTransitionScene(exact));
  assert.equal(props(exact.removeTextMetrics()).font, undefined);
});

test("annotation selection and scoped edits reuse native text highlight and composition boundaries", () => {
  const p = annotated(), key = getMarkItems(p)[0].key;
  const q = p.highlightMarks({ id: "chosen", target: "geo-annotation", select: { items: [key] }, stroke: "red", strokeWidth: 4, color: "green", opacity: 0 });
  assert.equal(props(q).stroke, undefined); assert.equal(props(q).strokeWidth, undefined);
  assert.equal(props(q).fill, "green"); assert.equal(props(q).opacity, 0);
  const r = q.editProjection({ translatePx: [5, 6] });
  assert.equal(props(r).opacity, 0); assert.deepEqual([props(r).x, props(r).y], [35, 46]);
  const pair = hconcat({ programs: [{ id: "left", program: p }, { id: "right", program: p }] });
  const edited = pair.editGeoAnnotation({ target: { childPath: ["left"], id: "geo-annotation" }, text: "Left" });
  assert.equal(props(edited.children.left).text, "Left"); assert.equal(edited.children.right, p);
  assert.deepEqual(createTransitionScene(deserializeProgram(serializeProgram(edited))), createTransitionScene(edited));
});

test("annotation input validation is descriptor-safe and rejects ambiguous or unsupported anchors atomically", () => {
  const p = annotated(), before = serializeProgram(p); let reads = 0;
  const anchor = { type: "position", get position() { reads++; return [0, 0]; } };
  assert.throws(() => p.editGeoAnnotation({ anchor })); assert.equal(reads, 0);
  for (const patch of [{}, { text: null }, { text: undefined }, { anchor: { type: "position", position: [0, 0], geometry: "x" } }, { anchor: { type: "feature", key: "x" } }, { anchor: { type: "position", position: [Infinity, 0] } }, { fontSize: -1 }, { clip: 1 }, { blend: "invalid" }, { inheritColor: true }, { encoding: {} }]) assert.throws(() => p.editGeoAnnotation(patch));
  assert.equal(serializeProgram(p), before);
  assert.throws(() => base().createGeoAnnotation({ text: "Missing" }));
  const world = p.createGeometryData({ id: "world", format: "geojson", coordinateKind: "planar", featureKey: "id", values: values(point("a", 0, 0)) });
  assert.throws(() => world.editGeoAnnotation({ anchor: { type: "feature", geometry: "world", key: "a", level: "county" } }), /level/);
  const ambiguous = world.createGeoAnnotation({ id: "other", anchor: { type: "position", position: [0, 0] }, text: "Other" });
  assert.throws(() => ambiguous.createGeoAnnotation({ anchor: { type: "position", position: [0, 0] }, text: "Third" }), /id|exists|unique/i);
});

test("stored annotations reject missing semantic intent, stale references and malformed styles", () => {
  const p = annotated(), envelope = JSON.parse(serializeProgram(p));
  const mutations = [state => { delete state.semanticSpec.layers[0].geoBinding.text; }, state => { state.semanticSpec.layers[0].geoBinding.anchor.position = [NaN, 0]; },
    state => { state.semanticSpec.layers[0].geoBinding.geometry = { kind: "projection", id: "map", revision: 0 }; }, state => { delete state.materializationConfigs.marks["geo-annotation"].geo.fontSize; },
    state => { state.materializationConfigs.marks["geo-annotation"].geo.clip = "yes"; }, state => { state.semanticSpec.layers[0].encoding = { x: { datum: 1 } }; },
    state => { state.materializationConfigs.marks["geo-annotation"].geo.fontSize = undefined; }, state => { state.materializationConfigs.marks["geo-annotation"].geo.blend = "unknown"; },
    state => { state.semanticSpec.layers[0].geoBinding.anchor.type = "screen"; }, state => { state.semanticSpec.layers[0].conditionals = {}; }];
  for (const mutate of mutations) {
    const state = decodeValue(envelope.payload); mutate(state);
    assert.throws(() => deserializeProgram(JSON.stringify({ ...envelope, payload: encodeValue(state) })));
  }
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
});
