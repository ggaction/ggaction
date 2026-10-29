import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { chart as basic } from "../../../src/basic.js";
import { getProjectionView, getMarkItems } from "../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";

const features = { type: "FeatureCollection", features: [
  { type: "Feature", id: "a", properties: {}, geometry: { type: "Point", coordinates: [20, 40] } },
  { type: "Feature", id: "b", properties: {}, geometry: { type: "Point", coordinates: [80, 60] } }
] };
const base = () => chart().createCanvas({ width: 400, height: 300, margin: 0 })
  .createGeometryData({ id: "places", format: "geojson", coordinateKind: "planar", featureKey: "id", values: features })
  .createProjection({ id: "map", type: "identity" }).createCoordinate({ id: "geo", type: "geo" })
  .createGeoPointMark({ id: "places-mark", radiusPx: 4 });
const projection = p => p.semanticSpec.resources.find(r => r.kind === "projection");
const ops = (node, op) => [...(node.op === op ? [node] : []), ...(node.children ?? []).flatMap(child => ops(child, op))];
const points = p => p.graphicSpec.objects["places-mark"].items.map(item => [item.properties.x, item.properties.y]);

test("projection snapshots expose immutable resolved parameters and optional native viewport", () => {
  const p = chart().createProjection({ id: "view", type: "mercator" }), snapshot = getProjectionView(p);
  assert.deepEqual(snapshot.projection, { kind: "projection", id: "view", revision: 0 });
  assert.equal(snapshot.parameters.type, "mercator"); assert.equal(snapshot.parameters.scalePx, 150);
  assert.equal(snapshot.viewport, null); assert.ok(Object.isFrozen(snapshot.parameters.translatePx));
  assert.deepEqual(getProjectionView(base()).viewport, { x: 0, y: 0, width: 400, height: 300 });
  assert.equal(typeof basic().navigateProjection, "undefined");
  assert.throws(() => getProjectionView({}), /program/);
  assert.throws(() => getProjectionView(basic()), /projection/);
});

test("pan and anchored bounded zoom use one native projection revision and preserve item identity", () => {
  const p = base(), before = serializeProgram(p), keys = getMarkItems(p).map(item => item.key);
  const pan = p.navigateProjection({ operation: { type: "pan", deltaPx: [10, -5] } });
  assert.deepEqual(points(pan), [[30, 35], [90, 55]]);
  const zoom = p.navigateProjection({ operation: { type: "zoom", anchorPx: [20, 40], factor: 3, scaleExtent: [1, 2] } });
  assert.deepEqual(points(zoom), [[20, 40], [140, 80]]);
  assert.deepEqual(getMarkItems(zoom).map(item => item.key), keys);
  assert.equal(projection(zoom).revision, 1); assert.deepEqual(projection(zoom).inputs, []);
  const trace = zoom.trace.children.at(-1);
  assert.equal(trace.op, "navigateProjection"); assert.deepEqual(trace.children.map(child => child.op), ["editProjection"]);
  assert.equal(ops(trace, "materializeGeoMark").length, 1);
  assert.deepEqual(zoom.graphicSpec, p.editProjection({ scalePx: 2, translatePx: [-20, -40] }).graphicSpec);
  assert.equal(serializeProgram(p), before);
});

test("pinch combines translation and scale while spherical rotate preserves native clipping", () => {
  const p = base();
  const q = p.navigateProjection({ operation: { type: "pinch", fromPx: [[10, 40], [30, 40]], toPx: [[10, 50], [50, 50]], scaleExtent: [.1, 10] } });
  assert.deepEqual(points(q), [[30, 50], [150, 90]]);
  const globe = chart().createCanvas({ width: 400, height: 300, margin: 0 })
    .createGeometryData({ id: "world", format: "geojson", coordinateKind: "geographic", values: { type: "MultiPoint", coordinates: [[0, 0], [180, 0]] } })
    .createProjection({ id: "globe", type: "orthographic", scalePx: 100, translatePx: [200, 150] })
    .createCoordinate({ type: "geo" }).createGeoPointMark();
  const turned = globe.navigateProjection({ operation: { type: "rotate", rotateDeg: [180, 0] } });
  assert.deepEqual(turned.graphicSpec, globe.editProjection({ rotateDeg: [180, 0] }).graphicSpec);
  assert.equal(projection(turned).revision, 1);
});

test("fit stays a live geometry dependency while pan and explicit snapshot reset detach it", () => {
  const p = base(), fit = p.navigateProjection({ operation: { type: "fit", fit: { geometry: "places", width: 300, height: 200, padding: 10 } } });
  assert.deepEqual(projection(fit).inputs, [{ kind: "geometry", id: "places", revision: 0 }]);
  assert.deepEqual(fit.graphicSpec, p.editProjection({ fit: { geometry: "places", width: 300, height: 200, padding: 10 } }).graphicSpec);
  const initial = getProjectionView(fit), moved = fit.navigateProjection({ operation: { type: "pan", deltaPx: [10, 20] } });
  const reset = moved.navigateProjection({ operation: { type: "reset", initial: initial.parameters } });
  assert.deepEqual(getProjectionView(reset).parameters, initial.parameters);
  assert.deepEqual(reset.graphicSpec, fit.graphicSpec);
  assert.deepEqual(projection(reset).inputs, []); assert.equal(projection(reset).options.fit, undefined);
  assert.equal(projection(reset).revision, 3);
  const restored = deserializeProgram(serializeProgram(reset));
  assert.deepEqual(getProjectionView(restored), getProjectionView(reset));
  assert.deepEqual(restored.navigateProjection({ operation: { type: "pan", deltaPx: [-10, 0] } }).graphicSpec,
    reset.navigateProjection({ operation: { type: "pan", deltaPx: [-10, 0] } }).graphicSpec);
});

test("resize centers the old viewport and explicitly preserves or fits its scale", () => {
  const p = base();
  const preserved = p.navigateProjection({ operation: { type: "resize", canvas: { width: 800, height: 600 }, scaling: "preserve" } });
  assert.deepEqual(getProjectionView(preserved).parameters.translatePx, [200, 150]);
  assert.equal(getProjectionView(preserved).parameters.scalePx, 1);
  assert.deepEqual(points(preserved), [[220, 190], [280, 210]]);
  const fitted = p.navigateProjection({ operation: { type: "resize", canvas: { width: 800, height: 600 }, scaling: "fit" } });
  assert.deepEqual(getProjectionView(fitted).parameters.translatePx, [0, 0]);
  assert.equal(getProjectionView(fitted).parameters.scalePx, 2); assert.deepEqual(points(fitted), [[40, 80], [160, 120]]);
  assert.equal(projection(fitted).revision, 1);
  assert.deepEqual(fitted.trace.children.at(-1).children.map(child => child.op), ["editCanvas", "editProjection"]);
  assert.deepEqual(getProjectionView(fitted).viewport, { x: 0, y: 0, width: 800, height: 600 });
});

test("resize retains exact plot intent and requires explicit detachment for outer Canvas dimensions", () => {
  const p = base().editCanvas({ plot: { width: 200, height: 100 }, margin: 20 }), before = serializeProgram(p);
  assert.throws(() => p.navigateProjection({ operation: { type: "resize", canvas: { width: 600 }, scaling: "fit" } }), /plot/);
  assert.equal(serializeProgram(p), before);
  const resized = p.navigateProjection({ operation: { type: "resize", canvas: { plot: { width: 400, height: 200 } }, scaling: "fit" } });
  assert.deepEqual(getProjectionView(resized).viewport, { x: 20, y: 20, width: 400, height: 200 });
  assert.deepEqual(getProjectionView(resized).parameters.translatePx, [-20, -20]);
  const detached = p.navigateProjection({ operation: { type: "resize", canvas: { width: 600, plot: false }, scaling: "preserve" } });
  assert.equal(detached.materializationConfigs.canvas.plot, undefined);
  assert.equal(getProjectionView(detached).viewport.width, 560);
});

test("scoped navigation and view snapshots leave independent concat children unchanged", () => {
  const p = base(), pair = hconcat({ programs: [{ id: "left", program: p }, { id: "right", program: p }] });
  const next = pair.navigateProjection({ target: { childPath: ["right"], id: "map" }, operation: { type: "pan", deltaPx: [10, 0] } });
  assert.deepEqual(next.children.left.graphicSpec, p.graphicSpec);
  assert.deepEqual(getProjectionView(next, { target: "map", childPath: ["right"] }).parameters.translatePx, [10, 0]);
  assert.equal(getProjectionView(next, { childPath: ["left"] }).projection.revision, 0);
  assert.throws(() => getProjectionView(pair, { childPath: ["missing"] }), /Unknown program child/);
  assert.throws(() => getProjectionView(pair, { childPath: "left" }), /array/);
});

test("invalid operations, consumers, ambiguity and unsafe descriptors preserve old state and trace", () => {
  const p = base(), before = serializeProgram(p), trace = p.trace;
  for (const operation of [undefined, {}, { type: "pan", deltaPx: [Infinity, 0] }, { type: "pan", deltaPx: [0, 0], extra: true },
    { type: "fit", fit: { width: 0, height: 100 } }, { type: "fit" }, { type: "fit", fit: {}, extra: 1 },
    { type: "rotate", rotateDeg: [0, 0] }, { type: "reset", initial: { type: "mercator" } },
    { type: "resize", canvas: {}, scaling: "fit" }, { type: "resize", canvas: { width: 0 }, scaling: "fit" },
    { type: "resize", canvas: { width: 800, margin: 10 }, scaling: "fit" },
    { type: "resize", canvas: { width: 800 }, scaling: "automatic" },
    { type: "resize", canvas: { width: 800 }, scaling: "fit", extra: 1 }]) {
    assert.throws(() => p.navigateProjection({ operation })); assert.equal(serializeProgram(p), before); assert.equal(p.trace, trace);
  }
  let reads = 0;
  for (const args of [{ operation: { get type() { reads++; return "pan"; } } },
    { operation: { type: "resize", canvas: { get width() { reads++; return 800; } }, scaling: "fit" } }]) assert.throws(() => p.navigateProjection(args));
  assert.throws(() => getProjectionView(p, { get target() { reads++; return "map"; } })); assert.equal(reads, 0);
  const path = []; Object.defineProperty(path, "0", { enumerable: true, get() { reads++; return "left"; } });
  assert.throws(() => getProjectionView(p, { childPath: path }), /accessor/); assert.equal(reads, 0);
  for (const options of [{ extra: true }, { target: undefined }, null]) assert.throws(() => getProjectionView(p, options));
  const many = p.createProjection({ id: "other", type: "identity" })._withContext({ currentResources: {} });
  assert.throws(() => many.navigateProjection({ operation: { type: "pan", deltaPx: [1, 0] } }), /explicit projection/);
  assert.throws(() => getProjectionView(many), /explicit projection/);
  assert.equal(getProjectionView(many, { target: "other" }).projection.id, "other");
});

test("responsive resize uses settled plot bounds and updates independent screen routes once", () => {
  const p = base().editCanvas({ width: 1000, height: 700, margin: 100 })
    .createData({ id: "nodes", values: [{ key: "a", x: 0, y: 1000 }, { key: "b", x: 1, y: 2000 }], keyField: "key" })
    .createData({ id: "edges", values: [{ source: "a", target: "b" }] })
    .createGraphData({ id: "network", nodes: "nodes", edges: "edges", nodeKey: "key", source: "source", target: "target" })
    .layoutGraph({ id: "layout", graph: "network", method: "circular" })
    .bundleGraphEdges({ id: "routes", method: "edge-path", coordinateSpace: "screen" }).createGraphPlot({ id: "network-plot", routes: "routes" })
    .createScatterPlot({ id: "native", data: "nodes", x: "x", y: "y", guides: false })
    .createYAxis({ title: false }).editCanvas({ responsive: {} }).editYAxisLabels({ fontSize: 32 });
  const before = getProjectionView(p), saved = serializeProgram(p);
  const q = p.navigateProjection({ target: "map", operation: { type: "resize", canvas: { width: 1200, height: 800 }, scaling: "fit" } });
  const after = getProjectionView(q), ratio = Math.min(after.viewport.width / before.viewport.width, after.viewport.height / before.viewport.height);
  assert.equal(after.parameters.scalePx, ratio);
  const center = view => [view.x + view.width / 2, view.y + view.height / 2];
  assert.deepEqual(after.parameters.translatePx, center(after.viewport).map((number, i) => number - center(before.viewport)[i] * ratio));
  const route = program => program.semanticSpec.resources.find(r => r.kind === "edge-route");
  assert.deepEqual(route(q).result.viewport, after.viewport);
  assert.equal(route(q).revision, route(p).revision + 1); assert.equal(after.projection.revision, before.projection.revision + 1);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
  assert.equal(serializeProgram(p), saved);
});

test("a clipped zoom anchor fails without a partial native action branch", () => {
  const p = chart().createProjection({ id: "globe", type: "orthographic", scalePx: 100, translatePx: [200, 150] });
  const original = serializeProgram(p), trace = p.trace;
  assert.throws(() => p.navigateProjection({ operation: { type: "zoom", anchorPx: [500, 500], factor: 2, scaleExtent: [10, 1000] } }), /visible|invertible/);
  assert.equal(serializeProgram(p), original); assert.equal(p.trace, trace);
});
