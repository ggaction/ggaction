import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { chart, prepareFontResource, prepareTextMetrics } from "../../../src/index.js";
import { serializeProgram } from "../../../src/persistence.js";
import { normalizeProjectionOptions } from "../../../src/grammar/geo/projectionOptions.js";
import { normalizeGeoAnchorState, resolveGeoAnchorState, prepareGeoAnchorInterpolation, sampleGeoAnchorInterpolation } from "../../../src/grammar/animation/geoAnchor.js";
import { projectGeoAnnotationAnimation, normalizeGeoAnnotationPresentation, resolveGeoAnnotationPresentation } from "../../../src/materialization/animation/geoAnnotation.js";

const feature = (id, geometry) => ({ type: "Feature", id, properties: { id }, geometry });
const point = (id, x, y) => feature(id, { type: "Point", coordinates: [x, y] });
const values = (...features) => ({ type: "FeatureCollection", features });
const base = (camera = {}) => chart().createCanvas({ width: 400, height: 300, margin: 0 })
  .createProjection({ id: "map", type: "identity", ...camera }).createCoordinate({ type: "geo" });
const annotation = (program = base(), options = {}) => program.createGeoAnnotation({ id: "note", anchor: { type: "position", position: [10, 20] }, text: "A\nB", dx: 2, dy: -3, ...options });
const project = (program, namespaces) => projectGeoAnnotationAnimation(program, program.semanticSpec.layers.find(layer => layer.id === "note"), namespaces);
const native = program => program.graphicSpec.objects.note.items.map(({ type, properties, identity }) => ({ type, properties, identity }));
const copy = value => JSON.parse(JSON.stringify(value));
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} !== ${expected}`);
function parity(prepared, program) {
  const actual = resolveGeoAnnotationPresentation(prepared), expected = native(program);
  assert.equal(actual.length, expected.length);
  actual.forEach((item, index) => {
    close(item.properties.x, expected[index].properties.x); close(item.properties.y, expected[index].properties.y);
    const rest = ({ x, y, ...properties }) => properties;
    assert.deepEqual(rest(item.properties), rest(expected[index].properties));
    // The comparison action creates its own projection revision. A sampled
    // position retains the exact prepared target revision, never that counter.
    assert.deepEqual(item.identity, { ...expected[index].identity, lineage: prepared.state.identity.lineage });
    assert.equal(item.identity.lineage.resource.id, expected[index].identity.lineage.resource.id);
    assert.equal(item.identity.lineage.resource.kind, expected[index].identity.lineage.resource.kind);
  });
}
function sample(from, to, progress) {
  const a = project(from), b = project(to), track = prepareGeoAnchorInterpolation(a.state, b.state);
  const current = sampleGeoAnchorInterpolation(track, progress);
  assert.equal(current.mode, "anchor");
  return { ...b, state: current.state };
}

test("native annotation preparation preserves explicit offsets and exact endpoint identity", () => {
  const from = annotation(), to = from.editProjection({ scalePx: 4, translatePx: [40, 60] });
  const before = serializeProgram(from), trace = from.trace;
  const a = project(from), b = project(to), track = prepareGeoAnchorInterpolation(a.state, b.state);
  assert.deepEqual([a.properties.x, a.properties.y], [2, -3]);
  assert.deepEqual(resolveGeoAnchorState(a.state), [10, 20]);
  assert.equal(sampleGeoAnchorInterpolation(track, 0).state, track.from);
  assert.equal(sampleGeoAnchorInterpolation(track, 1).state, track.to);
  for (const progress of [0, .25, .5, .75, 1]) {
    const current = sampleGeoAnchorInterpolation(track, progress);
    parity({ ...b, state: current.state }, from.editProjection(current.state.parameters));
  }
  assert.deepEqual(sampleGeoAnchorInterpolation(track, .5).point, [40, 70]);
  assert.equal(serializeProgram(from), before); assert.equal(from.trace, trace);
  assert.ok(Object.isFrozen(a.properties)); assert.ok(Object.isFrozen(a.state.parameters));
  assert.deepEqual(project(from, ["outer", "left"]).state.identity.key,
    JSON.stringify([["outer", "left"], "note", "geo", ["annotation", "position"]]));
  parity(a, from); parity(b, to);
});

test("spherical annotation cameras use shortest rotation and logarithmic scale before projection", () => {
  const from = annotation(base({ type: "orthographic", scalePx: 100, translatePx: [200, 150], rotateDeg: [-60, 0, 0] }),
    { anchor: { type: "position", position: [0, 0] } });
  const to = from.editProjection({ scalePx: 400, rotateDeg: [60, 0, 0] });
  const middle = sample(from, to, .5);
  close(middle.state.parameters.scalePx, 200);
  assert.deepEqual(resolveGeoAnchorState(middle.state), [200, 150]);
  assert.notEqual(resolveGeoAnchorState(middle.state)[0], (native(from)[0].properties.x + native(to)[0].properties.x) / 2 - 2);
  parity(middle, from.editProjection({ scalePx: 200, rotateDeg: [0, 0, 0] }));
  const stationary = from.editProjection({ scalePx: 150 });
  assert.equal(sample(stationary, stationary, .5).state.parameters.scalePx, 150);
  parity(sample(stationary, stationary, .5), stationary);
});

test("a source annotation hidden at both endpoints appears only at its current camera", () => {
  const from = annotation(base({ type: "orthographic", scalePx: 100, translatePx: [-200, 150], clipExtentPx: [[0, 0], [400, 300]] }),
    { anchor: { type: "position", position: [0, 0] } });
  const to = from.editProjection({ translatePx: [600, 150] });
  assert.deepEqual(native(from), []); assert.deepEqual(native(to), []);
  const current = sample(from, to, .5);
  assert.deepEqual(resolveGeoAnchorState(current.state), [200, 150]);
  parity(current, from.editProjection({ translatePx: [200, 150] }));
  const globe = annotation(base({ type: "orthographic", scalePx: 100 }), { anchor: { type: "position", position: [180, 0] } });
  assert.deepEqual(resolveGeoAnnotationPresentation(project(globe)), []);
  parity(sample(globe, globe.editProjection({ rotateDeg: [180, 0] }), 1), globe.editProjection({ rotateDeg: [180, 0] }));
});

test("current geographic anchor meaning rebases without returning to an old endpoint", () => {
  const from = annotation(), target = from.editProjection({ scalePx: 16, translatePx: [80, 40] });
  let current = project(from).state;
  for (let index = 0; index < 20; index++) {
    const to = project(index % 2 ? from : target);
    const track = prepareGeoAnchorInterpolation(current, to.state), previous = resolveGeoAnchorState(current);
    assert.deepEqual(sampleGeoAnchorInterpolation(track, 0).point, previous);
    current = sampleGeoAnchorInterpolation(track, .3).state;
    parity({ ...to, state: current }, from.editProjection(current.parameters));
  }
  assert.deepEqual(resolveGeoAnchorState(copy(current)), resolveGeoAnchorState(current));
});

test("feature anchors retain source polygons, holes and explicit spherical complement meaning", () => {
  const polygon = { type: "Polygon", coordinates: [[[0, 0], [6, 0], [6, 4], [0, 4], [0, 0]], [[1, 1], [1, 3], [3, 3], [3, 1], [1, 1]]] };
  const from = annotation(base().createGeometryData({ id: "regions", format: "geojson", coordinateKind: "planar", featureKey: "id", values: values(feature("region", polygon)) }),
    { anchor: { type: "feature", key: "region" } });
  const prepared = project(from);
  assert.deepEqual(resolveGeoAnchorState(prepared.state), [3.2, 2]);
  assert.deepEqual(prepared.state.feature.geometry, polygon);
  assert.equal(Object.hasOwn(prepared.state, "centroid"), false);
  parity(sample(from, from.editProjection({ scalePx: 4 }), .5), from.editProjection({ scalePx: 2 }));
  const ring = [[-10, -10], [10, -10], [10, 10], [-10, 10], [-10, -10]];
  const geographic = winding => annotation(base({ type: "equirectangular", scalePx: 100 })
    .createGeometryData({ id: "regions", format: "geojson", coordinateKind: "geographic", polygonWinding: winding, featureKey: "id", values: values(feature("region", { type: "Polygon", coordinates: [ring] })) }),
  { anchor: { type: "feature", key: "region" } });
  const rightProgram = geographic("right-hand"), leftProgram = geographic("left-hand");
  const right = project(rightProgram), left = project(leftProgram);
  close(resolveGeoAnchorState(right.state)[0], 0);
  close(Math.abs(resolveGeoAnchorState(left.state)[0]), Math.PI * 100);
  assert.deepEqual(left.state.feature.geometry.coordinates, right.state.feature.geometry.coordinates);
  parity(left, leftProgram);
});

test("joined detail-level anchors preserve original source keys and exact target revisions", () => {
  const from = annotation(base()
    .createGeometryData({ id: "states", format: "geojson", coordinateKind: "planar", featureKey: "id", values: values(point("s", 100, 100)) })
    .createGeometryData({ id: "counties", format: "geojson", coordinateKind: "planar", featureKey: "id", values: values(point("a", 10, 20)) })
    .createGeoLODData({ id: "detail", levels: [{ id: "state", geometry: "states" }, { id: "county", geometry: "counties", enterZoom: 4.2, exitZoom: 3.8, parents: [{ key: "a", parent: "s" }] }], zoom: 5 })
    .createData({ id: "table", values: [{ id: "a", score: 5 }], keyField: "id" })
    .createGeoJoinData({ id: "joined", geometry: "detail", data: "table", geometryKey: "id", dataKey: "id" }),
  { anchor: { type: "feature", geometry: "joined", key: "a" } });
  const to = from.editGeoLODData({ target: "detail", zoom: 0 }).editProjection({ scalePx: 4 });
  const a = project(from), b = project(to);
  assert.equal(b.state.anchor.level, "county");
  assert.deepEqual(b.state.feature.geometry.coordinates, [10, 20]);
  assert.ok(b.state.geometry.revision > a.state.geometry.revision);
  const middle = sample(from, to, .5);
  assert.deepEqual(middle.state.identity.lineage.resource, b.state.geometry);
  parity(middle, to.editProjection({ scalePx: 2 }));
});

test("composite projection anchors use all native inset components and preserve excluded sources", () => {
  for (const position of [[-100, 40], [-150, 64], [-157, 20], [0, 0]]) {
    const from = annotation(base({ type: "albers-usa", scalePx: 300, translatePx: [200, 150] }), { anchor: { type: "position", position } });
    const to = from.editProjection({ scalePx: 1200, translatePx: [220, 170] }), middle = sample(from, to, .5);
    parity(middle, from.editProjection({ scalePx: 600, translatePx: [210, 160] }));
    assert.equal(resolveGeoAnnotationPresentation(middle).length, position[0] === 0 ? 0 : 1);
  }
});

test("null geometry and empty text remain absent while retaining their semantic sources", () => {
  const missing = annotation(base().createGeometryData({ id: "missing", format: "geojson", coordinateKind: "planar", featureKey: "id", values: values(feature("a", null)) }),
    { anchor: { type: "feature", key: "a" } });
  const prepared = project(missing), track = prepareGeoAnchorInterpolation(prepared.state, prepared.state);
  assert.equal(sampleGeoAnchorInterpolation(track, .5).point, null);
  assert.deepEqual(resolveGeoAnnotationPresentation(prepared), []);
  assert.equal(prepared.state.geometry.id, "missing");
  const empty = annotation(base(), { text: "" });
  assert.deepEqual(resolveGeoAnnotationPresentation(project(empty)), []);
  assert.deepEqual(project(empty).state.anchor.position, [10, 20]);
});

test("camera, source and key incompatibilities retain explicit crossfade reasons", () => {
  const state = project(annotation()).state;
  const cases = [
    [{ ...state, identity: { ...state.identity, key: state.identity.key.replace("note", "other") } }, "geo-identity"],
    [{ ...state, projection: { ...state.projection, id: "other" }, identity: { ...state.identity, lineage: { kind: "resource", resource: { ...state.projection, id: "other" } } } }, "geo-binding"],
    [{ ...state, anchor: { type: "position", position: [20, 20] } }, "geo-feature-geometry"],
    [{ ...state, parameters: normalizeProjectionOptions({ ...state.parameters, clipExtentPx: [[0, 0], [400, 300]] }) }, "projection-parameters"]
  ];
  for (const [target, reason] of cases) {
    const track = prepareGeoAnchorInterpolation(state, target);
    assert.equal(track.mode, "crossfade");
    assert.deepEqual(sampleGeoAnchorInterpolation(track, .25), { mode: "crossfade", reason, weights: [.75, .25] });
  }
  const spherical = project(annotation(base({ type: "equirectangular" }))).state;
  assert.equal(prepareGeoAnchorInterpolation(spherical, { ...spherical, parameters: normalizeProjectionOptions({ type: "mercator" }) }).reason, "projection-type");
  assert.equal(prepareGeoAnchorInterpolation(state, spherical).reason, "geo-identity");
});

test("closed anchor admission rejects malformed, ambiguous and unbounded stored inputs without getters", () => {
  const input = project(annotation()).state, before = JSON.stringify(input);
  const mutations = [
    value => { value.version = "native-geo-anchor@99"; }, value => { value.extra = true; },
    value => { delete value.feature; }, value => { value.anchor.position = undefined; },
    value => { value.identity.role = "body"; }, value => { value.identity.topology = "path"; },
    value => { value.projection.kind = "geometry"; }, value => { value.projection.revision = -1; },
    value => { value.parameters = { type: "identity" }; }, value => { value.anchor.extra = true; },
    value => { value.coordinateKind = "other"; }, value => { value.coordinateKind = "geographic"; },
    value => { value.feature = {}; }, value => { value.geometry = { kind: "geometry", id: "x", revision: 0 }; },
    value => { value.identity.lineage.resource.id = "stale"; },
    value => { value.anchor.position = [Infinity, 0]; }, value => { value.anchor.position = new Array(2); }
  ];
  for (const mutate of mutations) { const value = copy(input); mutate(value); assert.throws(() => normalizeGeoAnchorState(value)); }
  const geographic = copy(project(annotation(base({ type: "orthographic" }))).state);
  geographic.anchor.position = [0, 91]; assert.throws(() => normalizeGeoAnchorState(geographic), /latitude/);
  const cycle = copy(input); cycle.feature = cycle; assert.throws(() => normalizeGeoAnchorState(cycle), /cycle/);
  const deep = copy(input); let tail = deep; for (let index = 0; index < 130; index++) tail = tail.extra = {};
  assert.throws(() => normalizeGeoAnchorState(deep), /maxDepth/);
  let reads = 0; const getter = { ...input, get feature() { reads++; return null; } };
  assert.throws(() => normalizeGeoAnchorState(getter)); assert.equal(reads, 0);
  assert.throws(() => sampleGeoAnchorInterpolation(copy(prepareGeoAnchorInterpolation(input, input)), .5), /authentic/);
  const track = prepareGeoAnchorInterpolation(input, input);
  for (const time of [-.01, 1.01, NaN, Infinity, "0.5"]) assert.throws(() => sampleGeoAnchorInterpolation(track, time));
  assert.equal(JSON.stringify(input), before);
});

test("feature admission rejects invalid reference, winding and geometry even when clipped", () => {
  const program = annotation(base({ type: "orthographic" })
    .createGeometryData({ id: "world", format: "geojson", coordinateKind: "geographic", featureKey: "id", values: values(point("far", 180, 0)) }),
  { anchor: { type: "feature", key: "far" } });
  const input = project(program).state;
  const mutations = [
    value => { value.geometry.kind = "projection"; }, value => { delete value.feature.polygonWinding; },
    value => { value.feature.polygonWinding = "unknown"; }, value => { value.feature.extra = false; },
    value => { value.feature.geometry.coordinates = [0, 91]; },
    value => { value.feature.geometry = { type: "MultiPoint", coordinates: [[0, 0], [180, 0]] }; }
  ];
  for (const mutate of mutations) { const value = copy(input); mutate(value); assert.throws(() => normalizeGeoAnchorState(value)); }
  assert.deepEqual(resolveGeoAnnotationPresentation(project(program)), []);
});

test("presentation validation checks hidden concrete values, metrics and namespace ownership", () => {
  const program = annotation(), prepared = project(program);
  const mutations = [
    value => { value.extra = 1; }, value => { delete value.plotOrigin; }, value => { value.textMetrics = undefined; },
    value => { value.properties.text = 42; }, value => { value.properties.fontSize = 0; },
    value => { value.properties.x = Infinity; }, value => { value.properties.rotation = "bad"; },
    value => { value.plotOrigin = [0]; }, value => { value.plotOrigin = ["0", 0]; },
    value => { value.textMetrics = {}; }, value => { value.properties.font = {}; }
  ];
  for (const mutate of mutations) { const value = copy(prepared); mutate(value); assert.throws(() => normalizeGeoAnnotationPresentation(value)); }
  let reads = 0; assert.throws(() => normalizeGeoAnnotationPresentation({ ...prepared, get properties() { reads++; return prepared.properties; } }));
  assert.equal(reads, 0);
  for (const namespaces of [null, [""], [3]]) assert.throws(() => project(program, namespaces));
  assert.throws(() => projectGeoAnnotationAnimation(program, { ...program.semanticSpec.layers[0] }), /exact native/);
  const nonAnnotation = base().createGeometryData({ id: "world", format: "geojson", coordinateKind: "planar", featureKey: "id", values: values(point("a", 0, 0)) }).createGeoPointMark({ id: "point" });
  assert.throws(() => projectGeoAnnotationAnimation(nonAnnotation, nonAnnotation.semanticSpec.layers[0]), /exact native/);
});

test("structured native Text paint, line layout, outlines and shadows follow the current anchor", () => {
  const paints = [
    { type: "linear-gradient", from: { x: 0, y: 0 }, to: { x: 1, y: 0 }, stops: [{ offset: 0, color: "red" }, { offset: 1, color: "blue" }] },
    { type: "pattern", style: "diagonal", foreground: "red", background: "white", pitch: 6, strokeWidth: 1, coordinateSpace: "object" }
  ];
  for (const fill of paints) {
    const from = annotation(base(), { fill, rotation: 20, outline: { color: "white", width: 2 }, shadow: { color: "black", blurRadius: 2, offsetX: 1, offsetY: 2 } });
    const to = from.editProjection({ scalePx: 4, translatePx: [40, 60] }), middle = sample(from, to, .5);
    parity(middle, from.editProjection({ scalePx: 2, translatePx: [20, 30] }));
    assert.ok(resolveGeoAnnotationPresentation(middle)[0].properties.fillBounds);
  }
});

test("font bytes and prepared measurement identity survive copied anchor presentations", async () => {
  const p = annotation(base(), { text: "AB\nAB" });
  const bytes = new Uint8Array(readFileSync(new URL("../../fixtures/fonts/metric-fixture.ttf", import.meta.url)));
  const expectedHash = createHash("sha256").update(bytes).digest("hex");
  const decode = value => Object.fromEntries(["contentHash", "family", "style", "weight", "metricsProviderVersion"].map(key => [key, value[key]]));
  const prepared = await prepareFontResource(p, { kind: "create", id: "font", uri: "fixture:anchor", expectedHash,
    mimeType: "font/ttf", family: "sans-serif", style: "normal", weight: 400, metricsProviderVersion: "fixture@1" },
  { requestToken: "font", load: () => ({ bytes, mimeType: "font/ttf" }), decode });
  const withFont = p.createFontResource({ prepared, requestToken: "font" });
  const metrics = await prepareTextMetrics(withFont, { id: "exact", fonts: ["font"] }, { requestToken: "metrics", decode,
    measure: ({ asset, queries }) => ({ contentHash: asset.contentHash, metricsProviderVersion: asset.metricsProviderVersion, widths: queries.map(({ fontSize }) => fontSize * 1.4) }) });
  const exact = withFont.applyTextMetrics({ prepared: metrics, requestToken: "metrics" }), stored = project(exact);
  const middle = sample(exact, exact.editProjection({ scalePx: 4 }), .5);
  parity(copy(middle), exact.editProjection({ scalePx: 2 }));
  assert.equal(middle.properties.font.contentHash, expectedHash);
  assert.equal(middle.properties.font.payload.data, stored.properties.font.payload.data);
  const malformed = copy(stored); malformed.textMetrics.fonts[0].identity.contentHash = "0".repeat(64);
  assert.throws(() => normalizeGeoAnnotationPresentation(malformed), /measurement identity/);
  const noFont = copy(stored); delete noFont.properties.font;
  assert.throws(() => normalizeGeoAnnotationPresentation(noFont), /measurement identity/);
  const noQuery = copy(stored); noQuery.textMetrics.measurements = [];
  assert.throws(() => normalizeGeoAnnotationPresentation(noQuery), error => error.assetCode === "metrics-required");
  const profile = { schemaVersion: 1, id: "estimate", measurements: [] };
  const measured = p.applyTextMetrics({ profile }); parity(project(measured), measured);
});

test("prepared anchors isolate caller-owned values and round-trip closed meaning", () => {
  const program = annotation(), original = project(program), input = copy(original);
  const prepared = normalizeGeoAnnotationPresentation(input), track = prepareGeoAnchorInterpolation(input.state, input.state);
  input.properties.text = "Changed"; input.state.anchor.position[0] = 999; input.plotOrigin[0] = 999;
  assert.deepEqual(sampleGeoAnchorInterpolation(track, .5).point, [10, 20]);
  parity(prepared, program);
  assert.deepEqual(normalizeGeoAnnotationPresentation(copy(prepared)), original);
});
