import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { serializeProgram } from "../../../src/persistence.js";
import { prepareGraphEdgeRoutes, createGraphRouteExecutor, computeGraphEdgeRoutesAsync } from "../../../src/graph.js";
import { ROUTE_EXECUTION_MAXIMA } from "../../../src/grammar/graph/routes/execution.js";
import { createRouteReplay, enterRouteReplay, activeRouteReplay } from "../../../src/materialization/graph/routeReplay.js";
import { getErrorDetails } from "../../../src/core/diagnostics.js";

const stale = error => getErrorDetails(error)?.code === "stale-result";

const execution = { policy: "bounded-route@1", ...ROUTE_EXECUTION_MAXIMA };
const route = program => program.semanticSpec.resources.find(resource => resource.kind === "edge-route");
const paths = program => JSON.stringify(Object.values(program.graphicSpec.objects).filter(object => object.type === "path").map(object => object.properties.commands));
function base() {
  return chart().createCanvas({ width: 200, height: 120, margin: 10 })
    .createData({ id: "nodes", values: [{ id: 0 }, { id: 1 }, { id: 2 }] })
    .createData({ id: "edges", values: [{ id: "e", source: 0, target: 1 }, { id: "f", source: 1, target: 2 }] })
    .createData({ id: "notes", values: [{ text: "a" }] })
    .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "id", edgeKey: "id", source: "source", target: "target" })
    .layoutGraph({ id: "layout", method: "fixed", options: { positions: [{ key: 0, x: 0, y: 0 }, { key: 1, x: 10, y: 10 }, { key: 2, x: 30, y: 5 }] } });
}
function executor(onPost = () => {}) {
  return createGraphRouteExecutor({ createWorker() {
    const listeners = new Map();
    return { addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: type => listeners.delete(type), terminate: () => listeners.clear(),
      postMessage({ job }) { onPost(job); computeGraphEdgeRoutesAsync(structuredClone(job)).then(data => listeners.get("message")?.({ data }), error => listeners.get("error")?.({ error })); } };
  } });
}
const host = worker => ({ requestToken: "revise", executor: worker, deadlineMs: 30000 });
async function bounded(program, worker) {
  const prepared = await prepareGraphEdgeRoutes(program, { kind: "create", id: "route", method: "edge-path", options: { execution } }, { requestToken: "create", executor: worker, deadlineMs: 30000 });
  return program.bundleGraphEdges({ prepared, requestToken: "create" }).createGraphPlot({ id: "plot", routes: "route" });
}
const revision = () => ({ source: "edges", id: "edges2", values: [{ id: "e", source: 0, target: 2 }, { id: "f", source: 2, target: 1 }] });

test("prepared source revisions match the synchronous v1 revision through the original native action", async () => {
  const posts = [], worker = executor(job => posts.push(job.inputHash));
  try {
    const ordinary = base().bundleGraphEdges({ id: "route", method: "edge-path" }).createGraphPlot({ id: "plot", routes: "route" }).reviseData(revision());
    const program = await bounded(base(), worker), before = serializeProgram(program);
    assert.throws(() => program.reviseData(revision()), /Bounded routes require prepareGraphEdgeRoutes/);
    posts.length = 0;
    const prepared = await prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "reviseData", args: revision() } }, host(worker));
    // Every job is computed once even though the preflight runs again after it.
    assert.equal(posts.length, 1); assert.deepEqual(prepared.inputHashes, posts);
    assert.deepEqual(prepared.request, { kind: "update", action: "reviseData", args: { source: "edges", id: "edges2", valuesCount: 2 } });
    const first = program.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "revise" }), second = program.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "revise" });
    assert.equal(serializeProgram(program), before);
    assert.equal(paths(first), paths(ordinary)); assert.equal(serializeProgram(first), serializeProgram(second));
    assert.deepEqual(route(first).result.routes.map(value => value.commands), route(ordinary).result.routes.map(value => value.commands));
    assert.deepEqual(first.semanticSpec.datasets.find(dataset => dataset.id === "edges2").values, ordinary.semanticSpec.datasets.find(dataset => dataset.id === "edges2").values);
    assert.equal(route(first).revision, route(program).revision + 1); assert.equal(route(first).result.inputHash, prepared.inputHashes[0]);
    assert.equal(first.trace.children.at(-1).op, "applyGraphEdgeRoutesUpdate"); assert.equal(first.trace.children.at(-1).children[0].op, "reviseData");
    assert.equal(posts.length, 1);
  } finally { worker.dispose(); }
});

test("prepared source revisions reject other receivers, tokens, unaffected sources and compositions", async () => {
  const worker = executor();
  try {
    const program = await bounded(base(), worker);
    const prepared = await prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "reviseData", args: revision() } }, host(worker));
    assert.throws(() => program.editCanvas({ width: 220 }).applyGraphEdgeRoutesUpdate({ prepared, requestToken: "revise" }), stale);
    assert.throws(() => program.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "other" }), stale);
    assert.throws(() => program.applyGraphEdgeRoutesUpdate({ prepared: structuredClone(prepared), requestToken: "revise" }), /authentic prepared edge route update/);
    await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "reviseData", args: { source: "notes", id: "notes2", values: [{ text: "b" }] } } }, host(worker)),
      /no bounded edge route update; use reviseData directly/);
    await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "reviseData", args: { ...revision(), extra: 1 } } }, host(worker)), /reviseData/);
    // A failing original preflight reports the native error itself.
    const native = (() => { try { program.editCanvas({ width: 200 }).reviseData({ ...revision(), id: "nodes" }); } catch (error) { return error; } })();
    assert.ok(native instanceof Error);
    await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "reviseData", args: { ...revision(), id: "nodes" } } }, host(worker)),
      error => error.name === native.name && error.message === native.message);
    const controller = new AbortController(), aborted = prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "reviseData", args: revision() } }, { ...host(worker), signal: controller.signal });
    controller.abort(new Error("stop"));
    await assert.rejects(aborted, /stop/);
    // The prepared identity is readable only inside its exact invocation.
    const direct = program.editCanvas({ width: 200 });
    assert.throws(() => direct.reviseData(revision()), /Bounded routes require prepareGraphEdgeRoutes/);
  } finally { worker.dispose(); }
});

test("route replay covers exact ordered passes and cannot be completed after an absorbed interruption", () => {
  const job = inputHash => ({ inputHash }), completions = [{ inputHash: "a", completion: 1 }, { inputHash: "b", completion: 2 }];
  const exact = createRouteReplay(completions, {});
  assert.equal(exact.take(job("a")), 1); assert.equal(exact.take(job("b")), 2); assert.equal(exact.finished(), true);
  assert.equal(exact.take(job("a")), 1); assert.equal(exact.finished(), false); assert.equal(exact.take(job("b")), 2); assert.equal(exact.finished(), true);
  for (const sequence of [["b"], ["a", "a"], ["a", "b", "c"]]) {
    const replay = createRouteReplay(completions, {});
    assert.throws(() => sequence.forEach(hash => replay.take(job(hash))), stale);
    assert.equal(replay.finished(), false);
  }
  const short = createRouteReplay(completions, {}); short.take(job("a")); assert.equal(short.finished(), false);
  const recording = createRouteReplay([completions[0]], {}, true);
  recording.take(job("a"));
  let request;
  try { recording.take(job("b")); } catch (error) { request = error; }
  assert.equal(recording.requested(request), true); assert.equal(recording.requested(new Error("other")), false); assert.equal(request.job.inputHash, "b");
  assert.equal(recording.finished(), false);
  const leave = enterRouteReplay(exact); assert.equal(activeRouteReplay(), exact); leave(); assert.equal(activeRouteReplay(), undefined);
});

const expression = root => ({ version: 2, registry: "standard@1", root });
function derivedBase() {
  return chart().createCanvas({ width: 200, height: 120, margin: 10 }).createParameter({ id: "cutoff", value: 4 })
    .createData({ id: "nodes", values: [{ id: 0 }, { id: 1 }, { id: 2 }] })
    .createData({ id: "edges", values: [{ id: "e", source: 0, target: 1, w: 1 }, { id: "f", source: 1, target: 2, w: 5 }, { id: "g", source: 0, target: 2, w: 9 }] })
    .filterData({ id: "strong", source: "edges", where: expression({ type: "binary", op: "gte", left: { type: "field", name: "w" }, right: { type: "parameter", id: "cutoff" } }) })
    .filterData({ id: "light", source: "edges", field: "w", range: { min: 0, max: 10 } })
    .createGraphData({ id: "graph", nodes: "nodes", edges: "strong", nodeKey: "id", edgeKey: "id", source: "source", target: "target" })
    .layoutGraph({ id: "layout", method: "fixed", options: { positions: [{ key: 0, x: 0, y: 0 }, { key: 1, x: 10, y: 10 }, { key: 2, x: 30, y: 5 }] } });
}

test("derived-data and parameter revisions reach dependent routes through the same ordered replay", async () => {
  const posts = [], worker = executor(job => posts.push(job.inputHash));
  try {
    const ordinary = derivedBase().bundleGraphEdges({ id: "route", method: "edge-path" }).createGraphPlot({ id: "plot", routes: "route" });
    const program = await bounded(derivedBase(), worker), before = serializeProgram(program);
    for (const [action, args] of [["editParameter", { target: "cutoff", value: 0 }], ["editDerivedData", { target: "strong", definition: { type: "filter", field: "w", range: { min: 0, max: 6 } } }]]) {
      assert.throws(() => program[action](args), /Bounded routes require prepareGraphEdgeRoutes/);
      posts.length = 0;
      const prepared = await prepareGraphEdgeRoutes(program, { kind: "update", edit: { action, args } }, host(worker));
      assert.equal(posts.length, 1); assert.deepEqual(prepared.inputHashes, posts);
      const expected = ordinary[action](args), first = program.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "revise" });
      assert.deepEqual(route(first).result.routes.map(value => value.commands), route(expected).result.routes.map(value => value.commands));
      assert.deepEqual(first.semanticSpec.datasets.map(dataset => dataset.values), expected.semanticSpec.datasets.map(dataset => dataset.values));
      assert.equal(serializeProgram(program.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "revise" })), serializeProgram(first));
      assert.equal(first.trace.children.at(-1).children[0].op, action);
    }
    assert.equal(serializeProgram(program), before);
    // A derived dataset that no route consumes has no bounded update.
    await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "editDerivedData", args: { target: "light", definition: { type: "filter", field: "w", range: { min: 1, max: 2 } } } } }, host(worker)),
      /no bounded edge route update; use editDerivedData directly/);
    await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "editParameter", args: { target: "absent", value: 1 } } }, host(worker)));
  } finally { worker.dispose(); }
});

test("canvas edits replay every moved screen-space route in order and reject edits that move none", async () => {
  const posts = [], worker = executor(job => posts.push(job.inputHash));
  try {
    const screen = async (program, id, graph, layout) => {
      const prepared = await prepareGraphEdgeRoutes(program, { kind: "create", id, graph, layout, method: "edge-path", coordinateSpace: "screen", options: { execution } }, { requestToken: "create", executor: worker, deadlineMs: 30000 });
      return program.bundleGraphEdges({ prepared, requestToken: "create" });
    };
    // Two distinct screen-space jobs over separate graphs.
    const twoGraphs = () => base().createGraphData({ id: "graph2", nodes: "nodes", edges: "edges", nodeKey: "id", edgeKey: "id", source: "source", target: "target" })
      .layoutGraph({ id: "layout2", graph: "graph2", method: "fixed", options: { positions: [{ key: 0, x: 5, y: 0 }, { key: 1, x: 0, y: 20 }, { key: 2, x: 20, y: 20 }] } });
    const ordinary = twoGraphs().bundleGraphEdges({ id: "route", graph: "graph", layout: "layout", method: "edge-path", coordinateSpace: "screen" })
      .bundleGraphEdges({ id: "second", graph: "graph2", layout: "layout2", method: "edge-path", coordinateSpace: "screen" }).createGraphPlot({ id: "plot", layout: "layout", routes: "route" });
    const program = (await screen(await screen(twoGraphs(), "route", "graph", "layout"), "second", "graph2", "layout2")).createGraphPlot({ id: "plot", layout: "layout", routes: "route" }), before = serializeProgram(program);
    const edit = { width: 260, height: 160 };
    assert.throws(() => program.editCanvas(edit), /Bounded routes require prepareGraphEdgeRoutes/);
    posts.length = 0;
    const prepared = await prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "editCanvas", args: edit } }, host(worker));
    assert.equal(posts.length, 2); assert.deepEqual(prepared.inputHashes, posts);
    const expected = ordinary.editCanvas(edit), first = program.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "revise" });
    const results = value => value.semanticSpec.resources.filter(resource => resource.kind === "edge-route").map(resource => resource.result.routes.map(route => route.commands));
    assert.deepEqual(results(first), results(expected)); assert.equal(first.graphicSpec.objects.canvas.properties.width, 260);
    assert.equal(serializeProgram(program.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "revise" })), serializeProgram(first));
    assert.equal(serializeProgram(program), before);
    await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "editCanvas", args: { background: "#eee" } } }, host(worker)),
      /no bounded edge route update; use editCanvas directly/);
    const world = await bounded(base(), worker);
    await assert.rejects(prepareGraphEdgeRoutes(world, { kind: "update", edit: { action: "editCanvas", args: edit } }, host(worker)), /no bounded edge route update/);
  } finally { worker.dispose(); }
});

test("canvas fitting replays every probe's screen-space job and never absorbs a route continuation", async () => {
  const posts = [], worker = executor(job => posts.push(job.inputHash));
  try {
    const labelled = () => chart().createCanvas({ width: 200, height: 120, margin: 2 })
      .createData({ id: "nodes", values: [{ id: 0, name: "a very long node label" }, { id: 1, name: "b" }, { id: 2, name: "c" }] })
      .createData({ id: "edges", values: [{ id: "e", source: 0, target: 1 }, { id: "f", source: 1, target: 2 }] })
      .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "id", edgeKey: "id", source: "source", target: "target", attributes: ["name"] })
      .layoutGraph({ id: "layout", method: "fixed", options: { positions: [{ key: 0, x: 0, y: 0 }, { key: 1, x: 10, y: 10 }, { key: 2, x: 30, y: 5 }] } });
    const expected = labelled().bundleGraphEdges({ id: "route", method: "edge-path", coordinateSpace: "screen" })
      .createGraphPlot({ id: "plot", routes: "route", labels: { field: "name" } }).fitCanvas({});
    const receiver = labelled(), created = await prepareGraphEdgeRoutes(receiver, { kind: "create", id: "route", method: "edge-path", coordinateSpace: "screen", options: { execution } }, { requestToken: "create", executor: worker, deadlineMs: 30000 });
    const program = receiver.bundleGraphEdges({ prepared: created, requestToken: "create" }).createGraphPlot({ id: "plot", routes: "route", labels: { field: "name" } });
    // Before this connection a probe absorbed the requirement and reported an overflow.
    assert.throws(() => program.fitCanvas({}), /Bounded routes require prepareGraphEdgeRoutes/);
    posts.length = 0;
    const prepared = await prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "fitCanvas", args: {} } }, host(worker));
    assert.ok(posts.length > 1); assert.deepEqual(prepared.inputHashes, posts);
    const first = program.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "revise" });
    assert.deepEqual(route(first).result.routes.map(value => value.commands), route(expected).result.routes.map(value => value.commands));
    assert.deepEqual(first.materializationConfigs.canvas.margin, expected.materializationConfigs.canvas.margin);
    assert.deepEqual(first.materializationConfigs.fitting, expected.materializationConfigs.fitting);
    assert.equal(serializeProgram(program.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "revise" })), serializeProgram(first));
  } finally { worker.dispose(); }
});

test("fit probes absorb only ordinary failures while a replay is active", async () => {
  const { checkFitContinuation } = await import("../../../src/actions/graphs/edgeRoutes.js");
  const ordinary = new Error("geometry");
  assert.equal(checkFitContinuation(ordinary), undefined);
  const quota = new RangeError("quota"), controller = new AbortController();
  const replay = createRouteReplay([], { ledger: { check() {} }, signal: controller.signal });
  let leave = enterRouteReplay(replay);
  try {
    assert.equal(checkFitContinuation(ordinary), undefined);
    let stale; try { replay.take({ inputHash: "a" }); } catch (error) { stale = error; }
    assert.throws(() => checkFitContinuation(stale), error => error === stale);
    controller.abort(new Error("stopped"));
    assert.throws(() => checkFitContinuation(ordinary), /stopped/);
  } finally { leave(); }
  leave = enterRouteReplay(createRouteReplay([], { ledger: { check() { throw quota; } } }));
  try { assert.throws(() => checkFitContinuation(ordinary), error => error === quota); } finally { leave(); }
});

test("prepared data updates, camera resizes and recomputing graph filters replay their dependent routes", async () => {
  const { prepareDataUpdate } = await import("../../../src/index.js");
  const posts = [], worker = executor(job => posts.push(job.inputHash));
  const commands = value => route(value).result.routes.map(item => item.commands);
  try {
    // A prepared source refresh keeps its original data registry handle.
    const csv = text => ({ text, mimeType: "text/csv", encoding: "utf-8" });
    const sourced = async () => {
      const start = chart().createCanvas({ width: 200, height: 120, margin: 10 }).createData({ id: "nodes", values: [{ id: 0 }, { id: 1 }, { id: 2 }] });
      const initial = await prepareDataUpdate(start, { kind: "create", id: "edges", source: { kind: "named", name: "edges", format: "csv", parse: { source: { type: "number" }, target: { type: "number" } } } },
        { requestToken: "initial", resolveNamed: async () => csv("id,source,target\ne,0,1\nf,1,2") });
      return start.applyDataUpdate({ prepared: initial, requestToken: "initial" })
        .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "id", edgeKey: "id", source: "source", target: "target" })
        .layoutGraph({ id: "layout", method: "fixed", options: { positions: [{ key: 0, x: 0, y: 0 }, { key: 1, x: 10, y: 10 }, { key: 2, x: 30, y: 5 }] } });
    };
    const refresh = program => prepareDataUpdate(program, { kind: "revise", target: "edges", id: "edges2" }, { requestToken: "refresh", resolveNamed: async () => csv("id,source,target\ne,0,2\nf,2,1") });
    const plain = (await sourced()).bundleGraphEdges({ id: "route", method: "edge-path" }).createGraphPlot({ id: "plot", routes: "route" });
    const expectedData = plain.applyDataUpdate({ prepared: await refresh(plain), requestToken: "refresh" });
    const program = await bounded(await sourced(), worker), data = await refresh(program);
    assert.throws(() => program.applyDataUpdate({ prepared: data, requestToken: "refresh" }), /Bounded routes require prepareGraphEdgeRoutes/);
    posts.length = 0;
    const update = await prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "applyDataUpdate", args: { prepared: data, requestToken: "refresh" } } }, host(worker));
    assert.equal(posts.length, 1);
    assert.deepEqual(commands(program.applyGraphEdgeRoutesUpdate({ prepared: update, requestToken: "revise" })), commands(expectedData));
    await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "applyDataUpdate", args: { prepared: data, requestToken: "other" } } }, host(worker)), stale);
    await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "applyDataUpdate", args: { prepared: structuredClone(data), requestToken: "refresh" } } }, host(worker)), /authentic prepared data update/);
    const creation = await prepareDataUpdate(program, { kind: "create", id: "extra", source: { kind: "inline", values: [{ id: 1 }] } }, { requestToken: "create-extra" });
    await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "applyDataUpdate", args: { prepared: creation, requestToken: "create-extra" } } }, host(worker)),
      /use applyDataUpdate directly/);
    // The registry still compares a direct call's own receiver.
    assert.throws(() => program.editCanvas({ width: 200 }).applyDataUpdate({ prepared: data, requestToken: "refresh" }), stale);

    // Recomputing graph filters revise the inferred graph, its layout and routes.
    const inferred = () => chart().createCanvas({ width: 200, height: 120 }).createData({ id: "rows", values: [{ id: "a", x: 1 }, { id: "b", x: 2 }, { id: "c", x: 3 }] })
      .createInferredGraphData({ id: "graph", data: "rows", nodeKey: "id", ruleId: "sequence", rule: "sequence", options: { orderField: "x" } })
      .layoutGraph({ id: "layout", method: "fixed", options: { positions: [{ key: "a", x: 0, y: 0 }, { key: "b", x: 10, y: 10 }, { key: "c", x: 30, y: 5 }] } });
    const filter = { target: "plot", field: "key", op: "neq", value: "b", recompute: true };
    const filtered = inferred().bundleGraphEdges({ id: "route", method: "edge-path" }).createGraphPlot({ id: "plot", routes: "route" }).filterMarks(filter);
    const graphProgram = await bounded(inferred(), worker);
    posts.length = 0;
    const filterUpdate = await prepareGraphEdgeRoutes(graphProgram, { kind: "update", edit: { action: "filterMarks", args: filter } }, host(worker));
    const applied = graphProgram.applyGraphEdgeRoutesUpdate({ prepared: filterUpdate, requestToken: "revise" });
    assert.equal(posts.length, 1); assert.deepEqual(commands(applied), commands(filtered));
    const removal = await prepareGraphEdgeRoutes(applied, { kind: "update", edit: { action: "removeMarkFilter", args: { target: "plot" } } }, host(worker));
    assert.deepEqual(commands(applied.applyGraphEdgeRoutesUpdate({ prepared: removal, requestToken: "revise" })), commands(filtered.removeMarkFilter({ target: "plot" })));
    await assert.rejects(prepareGraphEdgeRoutes(graphProgram, { kind: "update", edit: { action: "filterMarks", args: { ...filter, recompute: false } } }, host(worker)), /use filterMarks directly/);
    await assert.rejects(prepareGraphEdgeRoutes(graphProgram, { kind: "update", edit: { action: "filterMarks", args: { field: "key", op: "neq", value: "b" } } }, host(worker)), /explicit target/);

    // A camera resize moves screen-space routes; other camera operations do not.
    const point = (id, coordinates) => ({ type: "Feature", id, properties: {}, geometry: { type: "Point", coordinates } });
    const mapped = () => base().createGeometryData({ id: "world", format: "geojson", coordinateKind: "geographic", featureKey: "id", values: { type: "FeatureCollection", features: [point("a", [0, 0]), point("b", [10, 5])] } })
      .createProjection({ id: "projection", type: "equirectangular", scalePx: 100, translatePx: [100, 60] });
    const resize = { target: "projection", operation: { type: "resize", canvas: { width: 260, height: 160 }, scaling: "fit" } };
    const resized = mapped().bundleGraphEdges({ id: "route", method: "edge-path", coordinateSpace: "screen" }).navigateProjection(resize);
    const receiver = mapped(), created = await prepareGraphEdgeRoutes(receiver, { kind: "create", id: "route", method: "edge-path", coordinateSpace: "screen", options: { execution } }, { requestToken: "create", executor: worker, deadlineMs: 30000 });
    const camera = receiver.bundleGraphEdges({ prepared: created, requestToken: "create" });
    posts.length = 0;
    const navigation = await prepareGraphEdgeRoutes(camera, { kind: "update", edit: { action: "navigateProjection", args: resize } }, host(worker));
    assert.equal(posts.length, 1); assert.deepEqual(commands(camera.applyGraphEdgeRoutesUpdate({ prepared: navigation, requestToken: "revise" })), commands(resized));
    await assert.rejects(prepareGraphEdgeRoutes(camera, { kind: "update", edit: { action: "navigateProjection", args: { target: "projection", operation: { type: "fit", fit: { features: "all" } } } } }, host(worker)),
      /use navigateProjection directly/);
  } finally { worker.dispose(); }
});

test("focused derived-data editors replay through their own wrappers", async () => {
  const posts = [], worker = executor(job => posts.push(job.inputHash));
  try {
    const ordinary = derivedBase().bundleGraphEdges({ id: "route", method: "edge-path" }).createGraphPlot({ id: "plot", routes: "route" });
    const program = await bounded(derivedBase(), worker);
    const where = expression({ type: "binary", op: "lte", left: { type: "field", name: "w" }, right: { type: "literal", value: 5 } });
    for (const [action, args] of [["editFilteredData", { target: "strong", where }], ["editFilteredData", { target: "strong", field: "w", range: { min: 2, max: 9 }, where: undefined }]]) {
      const clean = Object.fromEntries(Object.entries(args).filter(([, value]) => value !== undefined));
      let expected;
      try { expected = ordinary[action](clean); } catch (error) {
        await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: { action, args: clean } }, host(worker)), { message: error.message });
        continue;
      }
      posts.length = 0;
      const prepared = await prepareGraphEdgeRoutes(program, { kind: "update", edit: { action, args: clean } }, host(worker));
      const result = program.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "revise" });
      assert.equal(posts.length, 1);
      assert.deepEqual(route(result).result.routes.map(value => value.commands), route(expected).result.routes.map(value => value.commands));
      assert.equal(result.trace.children.at(-1).children[0].op, action);
    }
    await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "editFilteredData", args: { target: "light", range: { min: 1, max: 2 } } } }, host(worker)),
      /use editFilteredData directly/);
    await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "editBin2DData", args: { target: "absent", includeEmpty: true } } }, host(worker)));
  } finally { worker.dispose(); }
});
