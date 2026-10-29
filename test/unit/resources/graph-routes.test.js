import { resolveGraphicBounds } from "../../../src/layout/canvas.js";
import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../src/index.js";
import { chart as basicChart } from "../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { encodeValue, decodeValue } from "../../../src/persistence/codec.js";
import { comparePrograms } from "../../../src/inspection.js";
import { resolveGraphicLineage } from "../../../src/selectors/resources.js";
import { trimGraphRoute } from "../../../src/materialization/graph/routeGeometry.js";

const get = (p, id = "routes") => p.semanticSpec.resources.find(r => r.kind === "edge-route" && r.id === id);
const nodes = [{ key: "a", group: "one" }, { key: "b", group: "one" }, { key: "c", group: "two" }];
const source = (rows = nodes) => chart().createCanvas({ width: 400, height: 300 }).createData({ id: "nodes", values: rows, keyField: "key" })
  .createData({ id: "edges", values: [{ key: "ac", source: "a", target: "c" }, { key: "ab", source: "a", target: "b" }, { key: "bc", source: "b", target: "c" }], keyField: "key" })
  .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "key", source: "source", target: "target", edgeKey: "key", directed: true })
  .layoutGraph({ id: "layout", method: "fixed", options: { positions: [{ key: "a", x: 0, y: 0 }, { key: "b", x: 50, y: 50 }, { key: "c", x: 100, y: 0 }] } });
const plot = (method = "edge-path") => source().bundleGraphEdges({ id: "routes", method }).createGraphPlot({ id: "plot", routes: "routes", nodes: { radius: 2 } });
const count = (trace, op) => (trace.op === op ? 1 : 0) + trace.children.reduce((sum, child) => sum + count(child, op), 0);

test("public routes retain graph topology and offline vectors while Basic excludes their authoring and stored primitives", () => {
  const before = source(), graph = before.semanticSpec.resources.find(r => r.kind === "graph"), snapshot = serializeProgram(before);
  for (const method of ["force-directed", "density", "edge-path"]) {
    const p = before.bundleGraphEdges({ id: "routes", method });
    assert.equal(get(p).kind, "edge-route"); assert.equal(get(p).result.complete, true);
    assert.equal(p.graphicSpec, before.graphicSpec); assert.equal(p.semanticSpec.resources.find(r => r.kind === "graph"), graph);
    assert.deepEqual(deserializeProgram(serializeProgram(p)).semanticSpec, p.semanticSpec);
    assert.deepEqual(get(p).inputs, [{ kind: "graph", id: "graph", revision: 0 }, { kind: "layout", id: "layout", revision: 0 }]);
    assert.equal(p.trace.children.at(-1).op, "bundleGraphEdges");
    assert.equal(p.trace.children.at(-1).children[0].op, "editSemantic");
    assert.throws(() => basicChart().editSemantic({ property: "resource[edge-route:routes]", value: get(p) }), /registered/);
  }
  assert.equal(typeof basicChart().bundleGraphEdges, "undefined"); assert.equal(serializeProgram(before), snapshot);
});

test("GraphPlot binds stored routes with exact lineage and preserves native identity when routes are detached", () => {
  const p = plot(), native = p.editGraphPlot({ routes: false });
  const graphics = p.graphicSpec.objects.plot.items, ordinary = native.graphicSpec.objects.plot.items;
  assert.deepEqual(graphics.map(g => g.identity.key), ordinary.map(g => g.identity.key));
  const edge = graphics.find(g => g.identity.role === "body" && g.type === "path");
  assert.equal(edge.identity.lineage.resource.kind, "edge-route");
  assert.equal(resolveGraphicLineage(p, edge.identity), get(p));
  assert.equal(edge.properties.commands[1].op, "L");
  assert.equal(ordinary.find(g => g.type === "path").properties.commands[1].op, "C");
  assert.deepEqual(p.editGraphPlot({ edges: { opacity: .5 } }).semanticSpec.layers[0].graphBinding.routes, p.semanticSpec.layers[0].graphBinding.routes);
  assert.equal(native.semanticSpec.layers[0].graphBinding.routes, undefined);
  assert.equal(comparePrograms(p, native).equivalence, "different");
});

test("route edits and graph, layout and source revisions preflight then refresh shared consumers once", () => {
  const p = plot().createGraphPlot({ id: "second", routes: "routes" }), snapshot = serializeProgram(p);
  for (const next of [p.editEdgeRoute({ options: { exponent: 3 } }), p.editLayout({ options: { positions: [{ key: "a", x: 0, y: 0 }, { key: "b", x: 40, y: 60 }, { key: "c", x: 100, y: 0 }] } }),
    p.editGraphData({ definition: { directed: false } }), p.reviseData({ source: "nodes", id: "updated", values: nodes.map(row => ({ ...row, group: "updated" })) })]) {
    assert.equal(get(next).revision, 1);
    assert.equal(next.semanticSpec.layers[0].graphBinding.routes.revision, 1);
    assert.equal(next.semanticSpec.layers[1].graphBinding.routes.revision, 1);
    assert.equal(count(next.trace.children.at(-1), "materializeGraphPlot"), 2);
    assert.deepEqual(deserializeProgram(serializeProgram(next)).graphicSpec, next.graphicSpec);
  }
  assert.equal(serializeProgram(p), snapshot);
  const before = p.trace;
  assert.throws(() => p.reviseData({ source: "nodes", id: "invalid", values: nodes.slice(0, 2) }), /endpoint/);
  assert.equal(p.trace, before); assert.equal(serializeProgram(p), snapshot);
});

test("route selectors, incompatible bindings and immutable failures use explicit current or unique resources", () => {
  const p = plot(), snapshot = serializeProgram(p), trace = p.trace;
  for (const run of [() => p.bundleGraphEdges({ id: "routes", method: "density" }), () => p.bundleGraphEdges({ id: "new", method: "other" }),
    () => p.editEdgeRoute({}), () => p.editEdgeRoute({ options: {} }), () => p.editEdgeRoute({ options: { hierarchy: "wrong" } }),
    () => p.editEdgeRoute({ options: { exponent: undefined } }), () => p.editEdgeRoute({ coordinateSpace: null }),
    () => p.editEdgeRoute({ options: { limits: { maxSamples: 1 } } })]) assert.throws(run);
  const second = p.bundleGraphEdges({ id: "other", method: "force-directed" });
  assert.equal(get(second.editEdgeRoute({ options: { compatibilityThreshold: 1 } }), "other").revision, 1);
  const noCurrent = second._clone({ context: { ...second.context, currentResources: {} } });
  assert.throws(() => noCurrent.editEdgeRoute({ coordinateSpace: "world" }), /explicit edge route/);
  assert.equal(get(p._clone({ context: { ...p.context, currentResources: {} } }).editEdgeRoute({ coordinateSpace: "world" })).revision, 1);
  assert.throws(() => source().editEdgeRoute({ coordinateSpace: "world" }), /explicit edge route/);
  const otherLayout = p.layoutGraph({ id: "other-layout", graph: "graph", method: "circular" });
  assert.throws(() => otherLayout.editGraphPlot({ layout: "other-layout" }), /same exact/);
  assert.equal(serializeProgram(p), snapshot); assert.equal(p.trace, trace);
});

test("typed resource removal respects route dependencies and live mark consumers", () => {
  const p = plot();
  assert.throws(() => p.removeResource({ kind: "edge-route", id: "routes" }), /consumer|referenc|use/);
  assert.throws(() => p.removeResource({ kind: "layout", id: "layout", cascade: true }), /consumer|referenc|use/);
  const detached = p.editGraphPlot({ routes: false }).removeResource({ kind: "edge-route", id: "routes" });
  assert.equal(get(detached), undefined);
  const resourceOnly = source().bundleGraphEdges({ id: "routes", method: "edge-path" });
  assert.throws(() => resourceOnly.removeResource({ kind: "layout", id: "layout" }), /consumer|referenc|use/);
  assert.throws(() => resourceOnly.removeResource({ kind: "layout", id: "layout", cascade: true }), /dependent/);
  const removed = resourceOnly.removeResource({ kind: "edge-route", id: "routes" }).removeResource({ kind: "layout", id: "layout" });
  assert.equal(get(removed), undefined);
});

test("restoration rejects stale route references, viewport, hashes and malformed optional bindings", () => {
  const p = plot();
  for (const mutate of [state => state.semanticSpec.resources.at(-1).result.inputHash = "0".repeat(64),
    state => state.semanticSpec.resources.at(-1).inputs[1].revision++, state => state.semanticSpec.resources.at(-1).result.viewport = {},
    state => state.semanticSpec.layers[0].graphBinding.routes = undefined,
    state => state.semanticSpec.layers[0].graphBinding.routes.kind = "graph"]) {
    const envelope = JSON.parse(serializeProgram(p)), state = decodeValue(envelope.payload); mutate(state); envelope.payload = encodeValue(state);
    assert.throws(() => deserializeProgram(JSON.stringify(envelope)), /hash|stale|viewport|plain object|kind|reference|input|Graph routes/);
  }
});

test("route restore rejects malformed resolved defaults, input roles and source-row proofs before materialization", () => {
  const p = plot();
  for (const [mutate, reason] of [
    [r => r.ownership = { mode: "generated", owner: r.inputs[0] }, /authored/],
    [r => r.provenance.origin = "observed", /inferred/],
    [r => delete r.options.options.exponent, /resolved defaults/],
    [r => r.inputs = r.inputs.slice(0, 1), /exact graph/],
    [r => r.inputs[1].kind = "hierarchy", /exact graph/],
    [r => r.result.complete = false, /complete/],
    [r => r.result.resultHash = "invalid", /canonical hashes/],
    [r => r.provenance.sourceRows = [], /source provenance/]
  ]) {
    const envelope = JSON.parse(serializeProgram(p)), state = decodeValue(envelope.payload);
    mutate(state.semanticSpec.resources.find(resource => resource.kind === "edge-route")); envelope.payload = encodeValue(state);
    assert.throws(() => deserializeProgram(JSON.stringify(envelope)), reason);
  }
});

test("sampled route trimming follows arc distance and preserves repeated endpoints without invented arrows", () => {
  const points = [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 4 }];
  assert.deepEqual(trimGraphRoute(points, 2, 1), [{ x: 2, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 3 }]);
  assert.deepEqual(trimGraphRoute(points, 99, 99), [{ x: 3, y: .5 }, { x: 3, y: .5 }]);
  assert.deepEqual(trimGraphRoute([{ x: 1, y: 2 }, { x: 1, y: 2 }], 5, 5), [{ x: 1, y: 2 }, { x: 1, y: 2 }]);
});

test("scoped route edits refresh the selected composition child without changing its sibling", () => {
  const child = plot(), p = hconcat({ programs: [{ id: "left", program: child }, { id: "right", program: child }] });
  const next = p.editEdgeRoute({ target: { childPath: ["left"], id: "routes" }, options: { exponent: 3 } });
  assert.equal(get(next.children.left).revision, 1); assert.equal(next.children.right, p.children.right);
});


test("responsive screen routes follow settled guide bounds with one revision per edit", () => {
  const p = source().editCanvas({ width: 900, height: 600, margin: 100 })
    .bundleGraphEdges({ id: "routes", method: "edge-path", coordinateSpace: "screen" })
    .createGraphPlot({ id: "network", routes: "routes" })
    .createData({ id: "measurements", values: [{ x: 1, y: 1000 }, { x: 2, y: 2000 }, { x: 3, y: 3000 }] })
    .createScatterPlot({ id: "points", data: "measurements", x: "x", y: "y", guides: false })
    .createYAxis({ ticksAndLabels: { values: [1000, 2000, 3000] }, title: { text: "Observation value" } })
    .editCanvas({ responsive: {} });
  const saved = serializeProgram(p), first = get(p).revision;
  const q = p.editYAxisLabels({ fontSize: 48 });
  assert.deepEqual(get(q).result.viewport, resolveGraphicBounds(q));
  assert.equal(get(q).revision, first + 1);
  assert.equal(count(q.trace.children.at(-1), "refreshScreenEdgeRoutes"), 1);
  const r = q.editCanvas({ width: 760, height: 520 });
  assert.deepEqual(get(r).result.viewport, resolveGraphicBounds(r));
  assert.equal(get(r).revision, get(q).revision + 1);
  assert.equal(count(r.trace.children.at(-1), "refreshScreenEdgeRoutes"), 1);
  assert.deepEqual(deserializeProgram(serializeProgram(r)).graphicSpec, r.graphicSpec);
  assert.equal(serializeProgram(p), saved);
});

test("a responsive source revision recomputes routes once against the same pass's final viewport", () => {
  const rows = nodes.map((row, index) => ({ ...row, x: index, y: (index + 1) * 1000 }));
  const base = source(rows).editCanvas({ width: 1000, height: 700, margin: 100 })
    .bundleGraphEdges({ id: "routes", method: "edge-path", coordinateSpace: "screen" })
    .createGraphPlot({ id: "network", routes: "routes" })
    .createScatterPlot({ id: "points", data: "nodes", x: "x", y: "y", guides: false })
    .createYAxis({ title: false })
    .editCanvas({ responsive: {} })
    .editYAxisLabels({ fontSize: 32 });
  const p = base.createData({ id: "other-nodes", values: nodes, keyField: "key" })
    .createGraphData({ id: "other-graph", nodes: "other-nodes", edges: "edges", nodeKey: "key", source: "source", target: "target", edgeKey: "key" })
    .layoutGraph({ id: "other-layout", graph: "other-graph", method: "circular" })
    .bundleGraphEdges({ id: "other-routes", graph: "other-graph", layout: "other-layout", method: "edge-path", coordinateSpace: "screen" });
  const saved = serializeProgram(p);
  const next = p.reviseData({ source: "nodes", id: "updated", values: rows.map(row => ({ ...row, y: row.y * 100000 })) });
  assert.notDeepEqual(resolveGraphicBounds(next), resolveGraphicBounds(p));
  assert.deepEqual(get(next).result.viewport, resolveGraphicBounds(next));
  assert.equal(get(next).revision, get(p).revision + 1);
  assert.deepEqual(get(next, "other-routes").result.viewport, resolveGraphicBounds(next));
  assert.equal(get(next, "other-routes").revision, get(p, "other-routes").revision + 1);
  assert.equal(count(next.trace.children.at(-1), "refreshScreenEdgeRoutes"), 0);
  assert.deepEqual(deserializeProgram(serializeProgram(next)).graphicSpec, next.graphicSpec);
  assert.equal(serializeProgram(p), saved);
});

test("guide margin growth keeps exact plot screen routes bound to the enlarged Canvas", () => {
  const p = source().editCanvas({ plot: { width: 600, height: 400 }, margin: 100 })
    .bundleGraphEdges({ id: "routes", method: "edge-path", coordinateSpace: "screen" })
    .createGraphPlot({ id: "network", routes: "routes" })
    .createData({ id: "measurements", values: [{ x: 1, y: 1000 }, { x: 2, y: 2000 }, { x: 3, y: 3000 }] })
    .createScatterPlot({ id: "points", data: "measurements", x: "x", y: "y", guides: false })
    .createYAxis({ title: false });
  const next = p.editYAxisLabels({ fontSize: 64 });
  assert.notDeepEqual(resolveGraphicBounds(next), resolveGraphicBounds(p));
  assert.deepEqual(get(next).result.viewport, resolveGraphicBounds(next));
  assert.equal(get(next).revision, get(p).revision + 1);
  assert.equal(count(next.trace.children.at(-1), "refreshScreenEdgeRoutes"), 1);
  assert.deepEqual(deserializeProgram(serializeProgram(next)).graphicSpec, next.graphicSpec);
});
