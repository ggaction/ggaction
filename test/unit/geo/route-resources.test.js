import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { chart as basic } from "../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { getMarkItems } from "../../../src/inspection.js";
import { createInteractionSession } from "../../../src/interaction.js";
import { exportAccessibleData } from "../../../src/accessibility.js";
import { decodeValue, encodeValue } from "../../../src/persistence/codec.js";
import { encodeRowKey } from "../../../src/core/itemIdentity.js";
import { resolveStoredSelection } from "../../../src/materialization/selection/state.js";
import { routeGeometryFeatures } from "../../../src/grammar/geo/routes.js";

const get = (p, id) => p.semanticSpec.resources.find(r => r.id === id);
function base(space = "world") {
  return chart().createCanvas({ width: 240, height: 200, margin: 0 })
    .createData({ id: "nodes", values: [{ k: "a" }, { k: "b" }, { k: "c" }], keyField: "k" })
    .createData({ id: "edges", values: [{ k: 1, s: "a", t: "b" }, { k: "1", s: "b", t: "c" }], keyField: "k" })
    .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "k", edgeKey: "k", source: "s", target: "t" })
    .layoutGraph({ id: "layout", method: "fixed", options: { positions: [{ key: "a", x: 0, y: 0 }, { key: "b", x: 20, y: 40 }, { key: "c", x: 40, y: 0 }] } })
    .bundleGraphEdges({ id: "routes", method: "edge-path", coordinateSpace: space });
}
function plotted(space) {
  return base(space).createGeoRouteData({ id: "route-geometry", routes: "routes", coordinateKind: "planar" })
    .createProjection({ id: "map", type: "identity", fit: { geometry: "route-geometry", width: 160, height: 100 } })
    .createCoordinate({ id: "geo", type: "geo", projection: "map" })
    .createGeoLineMark({ id: "lines", geometry: "route-geometry", coordinate: "geo" });
}
test("route geometry retains M/L samples, duplicate endpoints and typed edge order", () => {
  const routes = [{ edgeKey: "first", commands: [{ op: "M", x: 170, y: 30 }, { op: "L", x: -170, y: 40 }] },
    { edgeKey: "zero", commands: [{ op: "M", x: 1, y: 2 }, { op: "L", x: 1, y: 2 }] }];
  const before = structuredClone(routes), result = routeGeometryFeatures(routes, "geographic");
  assert.deepEqual(result.features.map(f => f.geometry.coordinates), [[[170, 30], [-170, 40]], [[1, 2], [1, 2]]]);
  assert.deepEqual(result.features.map(f => f.properties.edgeKey), ["first", "zero"]);
  assert.deepEqual(routes, before); assert(Object.isFrozen(result.features[0].geometry.coordinates));
  assert.throws(() => routeGeometryFeatures([{ edgeKey: "bad", commands: [{ op: "M", x: 0, y: 91 }, { op: "L", x: 0, y: 0 }] }], "geographic"), /latitude/);
});
test("route data exposes exact graph row provenance and survives editable restore", () => {
  const p = plotted(), geometry = get(p, "route-geometry"), routes = get(p, "routes"), items = getMarkItems(p, { target: "lines" });
  assert.deepEqual(geometry.inputs, [{ kind: "edge-route", id: "routes", revision: 0 }]);
  assert.deepEqual(geometry.result.features.map(f => f.geometry.coordinates), routes.result.routes.map(r => r.commands.map(c => [c.x, c.y])));
  assert.equal(items.length, 2); assert.notEqual(items[0].key, items[1].key);
  assert.deepEqual(items.map(i => i.rows.map(row => [row.data, row.index])), [[["edges", 0]], [["edges", 1]]]);
  assert.deepEqual(items.map(i => [i.fields.sourceKey, i.fields.targetKey]), [["a", "b"], ["b", "c"]]);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
  assert.equal(typeof basic().createGeoRouteData, "undefined");
  assert.throws(() => basic().editSemantic({ property: "resource[geometry:route-geometry]", value: geometry }), /registered/);
});
test("route, layout, graph and data revisions refresh geometry and fit consumers atomically", () => {
  const p = plotted(), before = serializeProgram(p), keys = getMarkItems(p, { target: "lines" }).map(i => i.key);
  for (const q of [p.editEdgeRoute({ target: "routes", options: { exponent: 3 } }),
    p.editLayout({ target: "layout", node: { key: "b", x: 30, y: 60 } }),
    p.editGraphData({ target: "graph", definition: { directed: true } }),
    p.reviseData({ source: "edges", id: "next", values: [{ k: 1, s: "a", t: "b" }, { k: "1", s: "b", t: "c" }] })]) {
    for (const id of ["routes", "route-geometry", "map"]) assert.equal(get(q, id).revision, 1, id);
    assert.deepEqual(getMarkItems(q, { target: "lines" }).map(i => i.key), keys);
    assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
  }
  assert.equal(serializeProgram(p), before);
});
test("screen route viewport changes revise planar geometry but geographic interpretation rejects them", () => {
  const p = plotted("screen"), q = p.editCanvas({ width: 300 });
  for (const id of ["routes", "route-geometry", "map"]) assert.equal(get(q, id).revision, get(p, id).revision + 1, id);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
  assert.throws(() => p.editGeoRouteData({ coordinateKind: "geographic" }), /world/);
});

test("route interpretation validates closed own data before optional or inherited values are read", () => {
  let calls = 0;
  for (const field of ["edgeKey", "commands", "coordinateKind"]) {
    Object.defineProperty(Object.prototype, field, { configurable: true, get() { calls++; throw Error("inherited"); } });
    try {
      assert.throws(() => routeGeometryFeatures([{}], "planar"), /edge keys/);
    } finally { delete Object.prototype[field]; }
  }
  assert.equal(calls, 0);
  const good = { edgeKey: "a", commands: [{ op: "M", x: 0, y: 0 }, { op: "L", x: 1, y: 1 }] };
  for (const routes of [[good, good], [{ ...good, commands: [] }], [{ ...good, commands: [{ op: "M", x: 0, y: 0 }, { op: "C", x: 1, y: 1 }] }],
    [{ ...good, commands: [{ op: "M", x: NaN, y: 0 }, { op: "L", x: 1, y: 1 }] }]]) assert.throws(() => routeGeometryFeatures(routes, "planar"));
  assert.throws(() => routeGeometryFeatures([{ ...good, get commands() { calls++; } }], "planar"), /own data/);
  assert.equal(calls, 0);
  assert.deepEqual(routeGeometryFeatures([], "planar").features, []);
  assert.throws(() => routeGeometryFeatures(Array.from({ length: 100001 }, () => good), "planar"), /exceed/);
  assert.throws(() => routeGeometryFeatures([{ ...good, commands: Array(1000001).fill(good.commands[0]) }], "planar"), /sample range/);
});

test("geographic route edits preserve explicit identity and reject ambiguous or incompatible changes", () => {
  const p = plotted(), before = serializeProgram(p), identity = get(p, "route-geometry").result.identity;
  const q = p.editGeoRouteData({ routes: "routes" });
  assert.equal(get(q, "route-geometry").revision, 1);
  assert.equal(get(q, "route-geometry").result.identity.logicalId, identity.logicalId);
  assert.deepEqual(get(q, "route-geometry").result.identity.rowKeys, identity.rowKeys);
  for (const run of [() => p.editGeoRouteData({}), () => p.editGeoRouteData({ coordinateKind: undefined }),
    () => p.editGeoRouteData({ routes: "missing" }), () => p.editGeoRouteData({ coordinateKind: "geographic" }),
    () => p.createGeoRouteData({ id: "route-geometry", routes: "routes", coordinateKind: "planar" }),
    () => p.createGeoRouteData({ id: "missing-source", coordinateKind: "planar" }),
    () => p.createGeoRouteData({ id: "missing-kind", routes: "routes" }),
    () => p.createGeoRouteData({ id: "null-kind", routes: "routes", coordinateKind: null }),
    () => p.createGeoRouteData({ id: "unknown", routes: "routes", coordinateKind: "planar", extra: 1 })]) assert.throws(run);
  const two = p.createGeoRouteData({ id: "other", routes: "routes", coordinateKind: "planar" });
  assert.equal(get(two.editGeoRouteData({ routes: "routes" }), "other").revision, 1);
  assert.throws(() => two._clone({ context: { ...two.context, currentResources: {} } }).editGeoRouteData({ routes: "routes" }), /explicit geometry/);
  assert.equal(serializeProgram(p), before);
});

test("route-derived geometry joins and fit branches advance once with their source and preserve selections", () => {
  const initial = plotted();
  const p = initial.createData({ id: "labels", values: get(initial, "route-geometry").result.features.map((f, i) => ({ key: f.properties.edgeKey, value: i })) })
    .createGeoJoinData({ id: "joined", geometry: "route-geometry", data: "labels", geometryKey: ["properties", "edgeKey"], dataKey: "key" })
    .createProjection({ id: "joined-map", type: "identity", fit: { geometry: "joined", width: 100, height: 80 } })
    .createCoordinate({ id: "joined-coordinate", type: "geo", projection: "joined-map" })
    .createGeoLineMark({ id: "joined-lines", geometry: "joined", coordinate: "joined-coordinate" });
  const exact = p.selectMarks({ id: "selected", target: "lines", items: [getMarkItems(p, { target: "lines" })[0].key] });
  const q = exact.editEdgeRoute({ target: "routes", options: { exponent: 4 } });
  for (const id of ["routes", "route-geometry", "joined", "map", "joined-map"]) assert.equal(get(q, id).revision, 1, id);
  assert.deepEqual(getMarkItems(q, { target: "joined-lines" }).map(item => item.fields.value), [0, 1]);
  assert.deepEqual(getMarkItems(q, { target: "lines" }).map(item => item.key), getMarkItems(exact, { target: "lines" }).map(item => item.key));
  assert.deepEqual(resolveStoredSelection(q, "selected").keys, [getMarkItems(exact, { target: "lines" })[0].key]);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
});

function hierarchyRoutes() {
  let p = base().createData({ id: "tree", values: [{ k: "root", parent: null, value: 0 }, ...["a", "b", "c"].map(k => ({ k, parent: "root", value: 1 }))] })
    .createHierarchyData({ id: "hierarchy", data: "tree", key: "k", parent: "parent", value: "value" })
    .layoutHierarchy({ id: "tree-layout", hierarchy: "hierarchy", method: "tree", options: { nodeSize: [10, 10], depthGap: 20, siblingGap: 10, orientation: "vertical" } });
  const positions = ["a", "b", "c"].map(key => { const node = get(p, "tree-layout").result.nodes.find(n => n.key === encodeRowKey(key)); return { key, x: node.x, y: node.y }; });
  p = p.editLayout({ target: "layout", options: { positions } });
  return p.editEdgeRoute({ target: "routes", method: "hierarchical", options: { hierarchy: "hierarchy", hierarchyLayout: "tree-layout", mapping: ["a", "b", "c"].map(key => ({ nodeKey: key, hierarchyKey: key })) } });
}

test("all canonical route methods keep one geographic feature per original edge without changing their samples", () => {
  for (const method of ["hierarchical", "force-directed", "density", "edge-path"]) {
    const source = method === "hierarchical" ? hierarchyRoutes() : method === "edge-path" ? base() : base().editEdgeRoute({ target: "routes", method });
    const p = source.createGeoRouteData({ id: "mapped", routes: "routes", coordinateKind: "geographic" });
    const route = get(p, "routes"), geometry = get(p, "mapped");
    assert.deepEqual(geometry.result.features.map(feature => feature.geometry.coordinates), route.result.routes.map(r => r.commands.map(c => [c.x, c.y])));
    assert.deepEqual(geometry.provenance.sourceRows, route.provenance.sourceRows);
    assert.deepEqual(deserializeProgram(serializeProgram(p)).semanticSpec, p.semanticSpec);
    if (method === "hierarchical") {
      const q = p.editHierarchyData({ target: "hierarchy", valueMode: "own-plus-children" });
      assert.equal(get(q, "mapped").revision, 1);
      assert.equal(get(q, "mapped").inputs[0].revision, route.revision + 1);
      assert.deepEqual(deserializeProgram(serializeProgram(q)).semanticSpec, q.semanticSpec);
    }
  }
});

test("empty and inferred routes retain their native edge grain and endpoint row provenance", () => {
  const empty = base().reviseData({ source: "edges", id: "empty-edges", values: [] })
    .createGeoRouteData({ id: "empty", routes: "routes", coordinateKind: "planar" });
  assert.deepEqual(get(empty, "empty").result.features, []);
  assert.deepEqual(deserializeProgram(serializeProgram(empty)).semanticSpec, empty.semanticSpec);
  const p = chart().createCanvas({ width: 200, height: 200 }).createData({ id: "nodes", keyField: "k", values: [{ k: 1, value: 0 }, { k: "1", value: 1 }, { k: "c", value: 3 }] })
    .createInferredGraphData({ id: "graph", data: "nodes", nodeKey: "k", ruleId: "nearest", rule: "knn", features: ["value"], metric: "euclidean" })
    .layoutGraph({ id: "layout", method: "circular" }).bundleGraphEdges({ id: "routes", method: "edge-path" })
    .createGeoRouteData({ id: "mapped", routes: "routes", coordinateKind: "planar" })
    .createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" }).createGeoLineMark({ id: "lines" });
  const items = getMarkItems(p, { target: "lines" });
  assert.equal(items.length, get(p, "graph").result.model.edges.length);
  assert(items.every(item => item.rows.length === 2 && item.rows.every(row => row.data === "nodes" && row.role === "node")));
  assert(items.every(item => item.fields.rule === "knn" && item.fields.metric === "euclidean"));
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
});

test("restoration rejects forged route shapes, lineage, key order and input revisions", () => {
  const p = plotted(), saved = serializeProgram(p);
  for (const mutate of [r => { r.result.features[0].geometry.coordinates[0][0] += 1; },
    r => { r.result.features.reverse(); }, r => { r.result.features[0].properties.edgeKey = "unrelated"; },
    r => { r.result.features[0].drawable = false; }, r => { r.result.features[0].geometry.type = "Polygon"; },
    r => { r.result.identity.revision++; }, r => { r.result.identity.keySpec.mode = "generated"; },
    r => { r.result.diagnostics.positions++; }, r => { r.result.coordinateKind = "geographic"; },
    r => { r.provenance.sourceRows = []; }, r => { r.inputs[0].revision++; }, r => { r.inputs[0].kind = "layout"; },
    r => { r.options.extra = true; }, r => { r.result.features[0].extra = true; }]) {
    const envelope = JSON.parse(saved), state = decodeValue(envelope.payload);
    mutate(state.semanticSpec.resources.find(r => r.id === "route-geometry")); envelope.payload = encodeValue(state);
    assert.throws(() => deserializeProgram(JSON.stringify(envelope)));
  }
  assert.equal(serializeProgram(p), saved);
});

test("composition scopes and native removal preserve unrelated route consumers", () => {
  const child = plotted(), p = hconcat({ programs: [{ id: "left", program: child }, { id: "right", program: child }] });
  const q = p.editGeoRouteData({ target: { childPath: ["left"], id: "route-geometry" }, routes: "routes" });
  assert.equal(get(q.children.left, "route-geometry").revision, 1); assert.equal(q.children.right, p.children.right);
  assert.throws(() => child.removeResource({ kind: "edge-route", id: "routes" }), /use|depend|referenc/);
  assert.throws(() => child.removeResource({ kind: "geometry", id: "route-geometry" }), /use|depend|referenc/);
  const only = base().createGeoRouteData({ id: "mapped", routes: "routes", coordinateKind: "planar" });
  const removed = only.removeResource({ kind: "geometry", id: "mapped" }).removeResource({ kind: "edge-route", id: "routes" });
  assert.equal(get(removed, "routes"), undefined);
});


test("route geometry keeps native seam splitting, interpolation, clipping and exact hit provenance", () => {
  const positions = [{ key: "a", x: 179, y: 0 }, { key: "b", x: -179, y: 0 }, { key: "c", x: -160, y: 30 }];
  const p = base().editLayout({ target: "layout", options: { positions } })
    .createGeoRouteData({ id: "mapped", routes: "routes", coordinateKind: "geographic" })
    .createProjection({ id: "map", type: "equirectangular", scalePx: 20, translatePx: [120, 100] })
    .createCoordinate({ type: "geo" }).createGeoLineMark({ id: "lines", interpolation: "source-segment", strokeWidth: 4 });
  const items = getMarkItems(p), parts = p.graphicSpec.objects.lines.items;
  assert.equal(items.length, 2); assert.equal(parts.length, 3);
  assert.equal(parts[0].identity.key, parts[1].identity.key);
  const path = parts[0].properties.commands, point = { x: (path[0].x + path[1].x) / 2, y: (path[0].y + path[1].y) / 2 };
  const session = createInteractionSession({ program: p });
  session.dispatch({ type: "inspect", point, slop: 0 });
  assert.equal(session.getState().hit.target.itemKey, items[0].key); session.destroy();
  const selected = p.selectMarks({ id: "chosen", target: "lines", items: [items[0].key] });
  const turned = selected.editProjection({ type: "orthographic", scalePx: 80, rotateDeg: [180, 0] });
  assert.deepEqual(resolveStoredSelection(turned, "chosen").keys, [items[0].key]);
  const hidden = selected.editProjection({ type: "orthographic", scalePx: 80 });
  assert.equal(getMarkItems(hidden).length, 0);
  assert.equal(exportAccessibleData(p, { target: "lines", format: "items" }).views[0].items.length, 2);
  const geodesic = p.editGeoLineMark({ interpolation: "great-circle" });
  assert.deepEqual(getMarkItems(geodesic).map(item => item.key), items.map(item => item.key));
  assert.notDeepEqual(geodesic.graphicSpec.objects.lines.items.at(-1).properties.commands, parts.at(-1).properties.commands);
  assert.deepEqual(deserializeProgram(serializeProgram(geodesic)).graphicSpec, geodesic.graphicSpec);
});

test("route source levels preserve typed keys, rows and dependency closure across detail changes", () => {
  const p = plotted().createGeoLODData({ id: "detail", levels: [{ id: "one", geometry: "route-geometry" }] })
    .createGeoLineMark({ id: "detail-lines", geometry: "detail", coordinate: "geo" });
  const q = p.editLayout({ target: "layout", node: { key: "b", x: 35, y: 45 } });
  assert.equal(get(q, "detail").revision, 1);
  assert.deepEqual(getMarkItems(q, { target: "detail-lines" }).map(item => item.rows), getMarkItems(q, { target: "lines" }).map(item => item.rows));
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
  const ops = node => [node, ...(node.children ?? []).flatMap(ops)];
  assert.deepEqual(ops(q.trace.children.at(-1)).filter(node => node.op === "materializeGeoMark").map(node => node.args.id).sort(), ["detail-lines", "lines"]);
});

test("invalid geographic revisions and unprepared dependent writes are atomic", () => {
  const p = base().createGeoRouteData({ id: "mapped", routes: "routes", coordinateKind: "geographic" })
    .createProjection({ id: "map", type: "equirectangular" }).createCoordinate({ type: "geo" }).createGeoLineMark();
  const saved = serializeProgram(p), trace = p.trace;
  assert.throws(() => p.editLayout({ target: "layout", node: { key: "b", x: 30, y: 91 } }), /latitude/);
  const forged = structuredClone(get(p, "routes")); forged.revision++;
  assert.throws(() => p.editSemantic({ property: "resource[edge-route:routes]", value: forged }), /dependent|prepar|revision|stale/i);
  assert.equal(serializeProgram(p), saved); assert.equal(p.trace, trace);
});

test("route fields drive native color, labels and their revised row lineage", () => {
  const p = plotted().encodeColor({ target: "lines", field: "sourceKey" }).createMarkLabels({ source: "lines", field: "targetKey" });
  const keys = getMarkItems(p, { target: "lines-labels" }).map(item => item.key);
  assert.deepEqual(p.graphicSpec.objects["lines-labels"].items.map(item => item.properties.text), ["b", "c"]);
  assert.deepEqual(getMarkItems(p, { target: "lines-labels" }).map(item => item.rows.map(row => row.data)), [["edges"], ["edges"]]);
  const q = p.editLayout({ target: "layout", node: { key: "b", x: 40, y: 60 } });
  assert.deepEqual(getMarkItems(q, { target: "lines-labels" }).map(item => item.key), keys);
  assert.notDeepEqual(q.graphicSpec.objects["lines-labels"].items.map(item => item.properties), p.graphicSpec.objects["lines-labels"].items.map(item => item.properties));
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
});

test("inferred graph recompute and restore propagate the same route geometry dependency chain", () => {
  const p = chart().createCanvas({ width: 200, height: 200 }).createData({ id: "nodes", keyField: "k", values: [{ k: "a", order: 0 }, { k: "b", order: 1 }, { k: "c", order: 2 }] })
    .createInferredGraphData({ id: "graph", data: "nodes", nodeKey: "k", ruleId: "ordered", rule: "sequence", options: { orderField: "order" } })
    .layoutGraph({ id: "layout", method: "circular" }).bundleGraphEdges({ id: "routes", method: "edge-path" })
    .createGraphPlot({ id: "network", routes: "routes" })
    .createGeoRouteData({ id: "mapped", routes: "routes", coordinateKind: "planar" })
    .createProjection({ id: "map", type: "identity" }).createCoordinate({ id: "geo", type: "geo" })
    .createGeoLineMark({ id: "lines", geometry: "mapped" });
  const q = p.filterMarks({ target: "network", field: "key", op: "neq", value: "b", recompute: true });
  assert.equal(get(q, "mapped").revision, 1);
  assert.deepEqual(getMarkItems(q, { target: "lines" }).map(item => [item.fields.sourceKey, item.fields.targetKey]), [["a", "c"]]);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
  const restored = q.removeMarkFilter({ target: "network" });
  assert.deepEqual(getMarkItems(restored, { target: "lines" }).map(item => [item.fields.sourceKey, item.fields.targetKey]), [["a", "b"], ["b", "c"]]);
});
