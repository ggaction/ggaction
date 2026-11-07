import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { prepareGraphEdgeRoutes, createGraphRouteExecutor, computeGraphEdgeRoutesAsync, createGraphInferenceExecutor, prepareInferredGraphData, computeGraphInference } from "../../../src/graph.js";
import { encodeRowKey } from "../../../src/core/itemIdentity.js";
import { ROUTE_EXECUTION_MAXIMA } from "../../../src/grammar/graph/routes/execution.js";

const execution = { policy: "bounded-route@1", ...ROUTE_EXECUTION_MAXIMA };
const get = (program, kind, id) => program.semanticSpec.resources.find(resource => resource.kind === kind && resource.id === id);
function source() {
  return chart().createCanvas({ width: 400, height: 300, margin: 30 })
    .createData({ id: "nodes", values: [{ id: 0 }, { id: 1 }] })
    .createData({ id: "edges", values: [{ id: "e", source: 0, target: 1 }] })
    .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "id", edgeKey: "id", source: "source", target: "target", attributes: ["id"] })
    .layoutGraph({ id: "layout", method: "fixed", options: { positions: [{ key: 0, x: 0, y: 0 }, { key: 1, x: 10, y: 10 }] } });
}
function executor(onPost = () => {}) {
  return createGraphRouteExecutor({ createWorker() {
    const listeners = new Map();
    return { addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: type => listeners.delete(type), terminate: () => listeners.clear(),
      postMessage({ job }) { onPost(job); computeGraphEdgeRoutesAsync(structuredClone(job)).then(data => listeners.get("message")?.({ data }), error => listeners.get("error")?.({ error })); } };
  } });
}
async function bounded(program, worker, coordinateSpace = "world", id = "route", policy = execution) {
  const prepared = await prepareGraphEdgeRoutes(program, { kind: "create", id, graph: "graph", layout: "layout", method: "edge-path", coordinateSpace, options: { execution: policy } },
    { requestToken: "create", executor: worker, deadlineMs: 30000 });
  return program.bundleGraphEdges({ prepared, requestToken: "create" });
}
const edit = () => ({ action: "editLayout", args: { target: "layout", node: { key: 1, x: 25, y: 5 } } });
const host = worker => ({ requestToken: "update", executor: worker, deadlineMs: 30000 });

test("prepared layout updates use the original native action, materializers and completion exactly once", async () => {
  const worker = executor();
  try {
    for (const coordinateSpace of ["world", "screen"]) {
      const base = source().applyTheme({ theme: "dark" });
      const ordinary = base.bundleGraphEdges({ id: "route", method: "edge-path", coordinateSpace }).createGraphPlot({ id: "plot", routes: "route", labels: { field: "id" } });
      const program = (await bounded(base, worker, coordinateSpace)).createGraphPlot({ id: "plot", routes: "route", labels: { field: "id" } });
      const before = serializeProgram(program), prepared = await prepareGraphEdgeRoutes(program, { kind: "update", edit: edit() }, host(worker));
      assert.equal(serializeProgram(program), before);
      const actual = program.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "update" });
      const expected = ordinary.editLayout(edit().args);
      assert.deepEqual(actual.graphicSpec, expected.graphicSpec);
      assert.deepEqual(actual.materializationConfigs, expected.materializationConfigs);
      assert.deepEqual(get(actual, "edge-route", "route").result.routes, get(expected, "edge-route", "route").result.routes);
      assert.equal(get(actual, "layout", "layout").revision, 1); assert.equal(get(actual, "edge-route", "route").revision, 1);
      const trace = actual.trace.children.at(-1);
      assert.equal(trace.op, "applyGraphEdgeRoutesUpdate");
      assert.equal(trace.children[0].op, "editLayout");
      assert.deepEqual(trace.children[0].children.map(child => child.op), expected.trace.children.at(-1).children.map(child => child.op));
      assert.equal(actual.actionStack.length, 0);
      assert.deepEqual(deserializeProgram(serializeProgram(actual)).graphicSpec, actual.graphicSpec);
      assert.deepEqual(program.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "update" }).graphicSpec, actual.graphicSpec);
      assert.equal(serializeProgram(program), before);
    }
  } finally { worker.dispose(); }
});

test("native update snapshots arguments before await and rejects stale or forged application", async () => {
  const worker = executor();
  try {
    const program = await bounded(source(), worker), input = edit();
    const pending = prepareGraphEdgeRoutes(program, { kind: "update", edit: input }, host(worker));
    input.args.node.x = 900;
    // An unrelated ordinary invocation remains valid during the host await.
    assert.equal(get(source().editLayout(edit().args), "layout", "layout").revision, 1);
    const prepared = await pending;
    const result = program.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "update" });
    assert.equal(get(result, "layout", "layout").options.options.positions.find(position => position.key === 1).x, 25);
    assert.throws(() => program.applyGraphEdgeRoutesUpdate({ prepared: structuredClone(prepared), requestToken: "update" }), /authentic/);
    assert.throws(() => program.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "other" }), /different/);
    assert.throws(() => result.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "update" }), /different/);
    assert.throws(() => program.editEdgeRoute({ prepared, requestToken: "update" }), /different/);
    let reads = 0;
    await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "editLayout", args: { node: { get x() { reads += 1; return 1; } } } } }, host(worker)), /own data/);
    assert.equal(reads, 0);
    await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "anything", args: {} } }, host(worker)), /editLayout/);
    await assert.rejects(prepareGraphEdgeRoutes(source(), { kind: "update", edit: edit() }, host(worker)), /no bounded/);
  } finally { worker.dispose(); }
});

test("cancellation between preparation and native apply leaves the receiver unchanged", async () => {
  const worker = executor();
  try {
    const program = await bounded(source(), worker), before = serializeProgram(program), controller = new AbortController();
    const prepared = await prepareGraphEdgeRoutes(program, { kind: "update", edit: edit() }, { ...host(worker), signal: controller.signal });
    const reason = Error("cancel native apply"); controller.abort(reason);
    assert.throws(() => program.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "update" }), error => error === reason);
    assert.equal(serializeProgram(program), before);
  } finally { worker.dispose(); }
});

test("one native update preserves mixed route order and the complete graph/Geo consumer closure", async () => {
  let posts = 0;
  const worker = executor(() => posts++);
  try {
    const base = source().bundleGraphEdges({ id: "legacy", method: "edge-path" });
    const program = (await bounded(await bounded(base, worker), worker, "screen", "screen"))
      .createGraphPlot({ id: "plot", routes: "route" })
      .createGeoRouteData({ id: "mapped", routes: "route", coordinateKind: "planar" })
      .createProjection({ id: "map", type: "identity", fit: { geometry: "mapped", width: 160, height: 100 } })
      .createCoordinate({ id: "geo", type: "geo", projection: "map" })
      .createGeoLineMark({ id: "lines", geometry: "mapped", coordinate: "geo" });
    const before = serializeProgram(program); posts = 0;
    const prepared = await prepareGraphEdgeRoutes(program, { kind: "update", edit: edit() }, host(worker));
    assert.equal(posts, 2); assert.equal(prepared.inputHashes.length, 3);
    const result = program.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "update" });
    assert.deepEqual(result.semanticSpec.resources.filter(r => r.kind === "edge-route").map(r => [r.id, r.revision, r.algorithmVersion]), [["legacy", 1, "1"], ["route", 1, "2"], ["screen", 1, "2"]]);
    assert.equal(get(result, "geometry", "mapped").revision, 1);
    assert.notDeepEqual(result.graphicSpec, program.graphicSpec);
    assert.equal(serializeProgram(program), before);
    assert.throws(() => program.editLayout(edit().args), /prepareGraphEdgeRoutes/);
  } finally { worker.dispose(); }
});

test("native argument cycles and non-data arrays fail before worker dispatch", async () => {
  let posts = 0; const worker = executor(() => posts++);
  try {
    const program = await bounded(source(), worker); posts = 0;
    const cyclic = edit(); cyclic.args.node.self = cyclic;
    await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: cyclic }, host(worker)), /cyclic/);
    const accessor = []; let reads = 0;
    Object.defineProperty(accessor, 0, { get() { reads++; return {}; }, enumerable: true });
    await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "editLayout", args: { target: "layout", options: { positions: accessor } } } }, host(worker)), /own data/);
    assert.equal(reads, 0);
    await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "editLayout", args: { target: "layout", options: { positions: [() => {}] } } } }, host(worker)), /function/);
    await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "editLayout", args: { target: "layout", options: { positions: new Array(2) } } } }, host(worker)), /position|object|dense/i);
    assert.equal(posts, 0);
  } finally { worker.dispose(); }
});

test("layout update authority rejects overrides and aborts during suspended preparation", async () => {
  const worker = executor();
  try {
    const program = await bounded(source(), worker), prototype = program.constructor.prototype;
    const native = prototype.editLayout, apply = prototype.applyGraphEdgeRoutesUpdate;
    const prepared = await prepareGraphEdgeRoutes(program, { kind: "update", edit: edit() }, host(worker));
    try {
      prototype.editLayout = function () { return this; };
      await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: edit() }, host(worker)), /replaced/);
      assert.throws(() => apply.call(program, { prepared, requestToken: "update" }), /different/);
    } finally { prototype.editLayout = native; }
    try {
      prototype.applyGraphEdgeRoutesUpdate = function () { return this; };
      await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: edit() }, host(worker)), /replaced/);
      assert.throws(() => apply.call(program, { prepared, requestToken: "update" }), /different/);
    } finally { prototype.applyGraphEdgeRoutesUpdate = apply; }
    const semantic = prototype.editSemantic, failure = Error("native primitive failed");
    try {
      prototype.editSemantic = function () { throw failure; };
      assert.throws(() => apply.call(program, { prepared, requestToken: "update" }), error => error === failure);
    } finally { prototype.editSemantic = semantic; }
    // A failed native invocation must not retain its consumed plan or context.
    assert.equal(get(apply.call(program, { prepared, requestToken: "update" }), "layout", "layout").revision, 1);
    const controller = new AbortController(), reason = Error("stop suspended update");
    const aborting = executor(() => controller.abort(reason));
    try { await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: edit() }, { ...host(aborting), signal: controller.signal }), error => error === reason); }
    finally { aborting.dispose(); }
    assert.deepEqual(program.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "update" }).graphicSpec, program.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "update" }).graphicSpec);
  } finally { worker.dispose(); }
});

test("native hierarchy layout updates keep the original tree and route materializers", async () => {
  const base = source()
    .createData({ id: "tree", values: [{ key: "root", parent: null, value: 0 }, { key: 0, parent: "root", value: 1 }, { key: 1, parent: "root", value: 1 }] })
    .createHierarchyData({ id: "h", data: "tree", key: "key", parent: "parent", value: "value" })
    .layoutHierarchy({ id: "hl", hierarchy: "h", method: "tree", options: { nodeSize: [10, 10], siblingGap: 20, depthGap: 30, orientation: "vertical" } });
  const nodes = [0, 1].map(key => get(base, "layout", "hl").result.nodes.find(node => node.key === encodeRowKey(key)));
  const aligned = base.editLayout({ target: "layout", options: { positions: nodes.map((node, key) => ({ key, x: node.x, y: node.y })) } });
  const options = { hierarchy: "h", hierarchyLayout: "hl", mapping: [0, 1].map(key => ({ nodeKey: key, hierarchyKey: key })) };
  const worker = executor();
  try {
    const ordinary = aligned.bundleGraphEdges({ id: "route", graph: "graph", layout: "layout", method: "hierarchical", options }).createTreePlot({ id: "treePlot", layout: "hl" }).createGraphPlot({ id: "plot", routes: "route" });
    const preparedRoute = await prepareGraphEdgeRoutes(aligned, { kind: "create", id: "route", graph: "graph", layout: "layout", method: "hierarchical", options: { ...options, execution } }, host(worker));
    const program = aligned.bundleGraphEdges({ prepared: preparedRoute, requestToken: "update" }).createTreePlot({ id: "treePlot", layout: "hl" }).createGraphPlot({ id: "plot", routes: "route" });
    const args = { target: "hl", options: { nodeSize: [10, 10] } };
    const prepared = await prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "editLayout", args } }, host(worker));
    const result = program.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "update" });
    assert.deepEqual(result.graphicSpec, ordinary.editLayout(args).graphicSpec);
    assert.equal(get(result, "layout", "hl").revision, 1); assert.equal(get(result, "edge-route", "route").revision, 1);
    const hierarchyArgs = { target: "h", valueMode: "leaf-sum" };
    const hierarchy = await prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "editHierarchyData", args: hierarchyArgs } }, host(worker));
    const revised = program.applyGraphEdgeRoutesUpdate({ prepared: hierarchy, requestToken: "update" });
    assert.deepEqual(revised.graphicSpec, ordinary.editHierarchyData(hierarchyArgs).graphicSpec);
    assert.equal(get(revised, "hierarchy", "h").revision, 1);
    assert.equal(get(revised, "layout", "hl").revision, 1);
    assert.equal(get(revised, "edge-route", "route").revision, 1);
    const before = serializeProgram(program);
    await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "editLayout", args: { target: "hl", options: { depthGap: 40 } } } }, host(worker)), /anchors must match/);
    assert.equal(serializeProgram(program), before);
  } finally { worker.dispose(); }
});

test("held completions share sample admission across heterogeneous route policies", async () => {
  const worker = executor();
  try {
    const single = await bounded(source(), worker, "world", "small", { ...execution, maxSamples: 32 });
    const own = await prepareGraphEdgeRoutes(single, { kind: "update", edit: edit() }, host(worker));
    assert.equal(get(single.applyGraphEdgeRoutesUpdate({ prepared: own, requestToken: "update" }), "edge-route", "small").revision, 1);
    const program = await bounded(single, worker, "world", "wide");
    const before = serializeProgram(program);
    await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: edit() }, host(worker)), /small execution maxSamples/);
    assert.equal(serializeProgram(program), before);
  } finally { worker.dispose(); }
});


test("native observed and flow graph edits refresh every layout and route through original writers", async () => {
  const worker = executor();
  try {
    for (const flow of [false, true]) {
      const action = flow ? "editFlowData" : "editGraphData";
      const base = flow ? chart().createCanvas({ width: 400, height: 300, margin: 30 })
        .createData({ id: "nodes", values: [{ id: 0 }, { id: 1 }] })
        .createData({ id: "edges", values: [{ id: "e", source: 0, target: 1, value: 1 }] })
        .createFlowData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "id", edgeKey: "id", source: "source", target: "target", value: "value" })
        .layoutGraph({ id: "layout", method: "fixed", options: { positions: [{ key: 0, x: 0, y: 0 }, { key: 1, x: 10, y: 10 }] } }) : source();
      const ordinary = base.bundleGraphEdges({ id: "route", method: "edge-path" }).createGraphPlot({ id: "plot", routes: "route" });
      const program = (await bounded(base, worker)).createGraphPlot({ id: "plot", routes: "route" });
      const args = { target: "graph", definition: { attributes: ["id"] } };
      const before = serializeProgram(program), prepared = await prepareGraphEdgeRoutes(program, { kind: "update", edit: { action, args } }, host(worker));
      const actual = program.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "update" }), expected = ordinary[action](args);
      for (const [kind, id] of [["graph", "graph"], ["layout", "layout"], ["edge-route", "route"]]) assert.equal(get(actual, kind, id).revision, 1);
      assert.deepEqual(actual.graphicSpec, expected.graphicSpec);
      assert.deepEqual(get(actual, "edge-route", "route").result.routes, get(expected, "edge-route", "route").result.routes);
      assert.equal(actual.trace.children.at(-1).children[0].op, action);
      assert.deepEqual(actual.trace.children.at(-1).children[0].children.map(child => child.op), expected.trace.children.at(-1).children.map(child => child.op));
      assert.deepEqual(deserializeProgram(serializeProgram(actual)).graphicSpec, actual.graphicSpec);
      assert.equal(serializeProgram(program), before);
    }
  } finally { worker.dispose(); }
});

function inferenceWorker() {
  return createGraphInferenceExecutor({ createWorker() {
    const listeners = new Map();
    return { addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: type => listeners.delete(type), terminate: () => listeners.clear(),
      postMessage({ job }) { queueMicrotask(() => { try { listeners.get("message")?.({ data: computeGraphInference(structuredClone(job)) }); } catch (error) { listeners.get("error")?.({ error }); } }); } };
  } });
}

test("native inference edits preserve raw and authentic prepared ownership through B", async () => {
  const worker = executor(), inference = inferenceWorker();
  const base = chart().createCanvas({ width: 400, height: 300, margin: 30 })
    .createData({ id: "nodes", values: [{ id: 0, x: 0 }, { id: 1, x: 2 }, { id: 2, x: 6 }] })
    .createInferredGraphData({ id: "graph", data: "nodes", nodeKey: "id", ruleId: "near", rule: "knn", features: ["x"], metric: "manhattan", options: { k: 1 } })
    .layoutGraph({ id: "layout", graph: "graph", method: "fixed", options: { positions: [{ key: 0, x: 0, y: 0 }, { key: 1, x: 10, y: 10 }, { key: 2, x: 20, y: 0 }] } });
  try {
    const args = { target: "graph", definition: { options: { k: 2 } } };
    const ordinary = base.bundleGraphEdges({ id: "route", method: "edge-path" }).createGraphPlot({ id: "plot", routes: "route" });
    const program = (await bounded(base, worker)).createGraphPlot({ id: "plot", routes: "route" });
    const expected = ordinary.editInferredGraphData(args), controller = new AbortController();
    const inferenceHandle = await prepareInferredGraphData(program, { kind: "edit", ...args }, { requestToken: "inference", executor: inference, signal: controller.signal });
    let authentic;
    for (const input of [args, { prepared: inferenceHandle, requestToken: "inference" }]) {
      const edit = { action: "editInferredGraphData", args: input };
      const prepared = await prepareGraphEdgeRoutes(program, { kind: "update", edit }, host(worker));
      const result = program.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "update" });
      assert.deepEqual(result.graphicSpec, expected.graphicSpec);
      assert.deepEqual(get(result, "graph", "graph"), get(expected, "graph", "graph"));
      assert.deepEqual(get(result, "edge-route", "route").result.routes, get(expected, "edge-route", "route").result.routes);
      assert.deepEqual(deserializeProgram(serializeProgram(result)).graphicSpec, result.graphicSpec);
      if (input.prepared) authentic = prepared;
    }
    for (const invalid of [{ prepared: structuredClone(inferenceHandle), requestToken: "inference" }, { prepared: inferenceHandle, requestToken: "wrong" }, { prepared: inferenceHandle, requestToken: "inference", target: "graph" }]) {
      await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "editInferredGraphData", args: invalid } }, host(worker)), /authentic|receiver|only/);
    }
    const before = serializeProgram(program), reason = Error("inference owner revoked"); controller.abort(reason);
    assert.throws(() => program.applyGraphEdgeRoutesUpdate({ prepared: authentic, requestToken: "update" }), error => error === reason);
    assert.equal(serializeProgram(program), before);
  } finally { worker.dispose(); inference.dispose(); }
});


test("native graph route admission follows candidate graphs before downstream layout and route", async () => {
  const worker = executor();
  try {
    const base = chart().createCanvas({ width: 400, height: 300, margin: 30 })
      .createData({ id: "nodes", values: [{ id: 0 }, { id: 1 }, { id: 2 }] })
      .createData({ id: "edges", values: [{ source: 0, target: 1, weight: 1 }, { source: 1, target: 2, weight: 2 }, { source: 0, target: 2, weight: 5 }] })
      .createGraphData({ id: "original", nodes: "nodes", edges: "edges", nodeKey: "id", source: "source", target: "target", weight: "weight" })
      .createInferredGraphData({ id: "graph", data: "nodes", nodeKey: "id", ruleId: "backbone", rule: "mst", candidateGraph: "original" })
      .layoutGraph({ id: "layout", graph: "graph", method: "circular" });
    const ordinary = base.bundleGraphEdges({ id: "route", method: "edge-path" }).createGraphPlot({ id: "plot", routes: "route" });
    const program = (await bounded(base, worker)).createGraphPlot({ id: "plot", routes: "route" });
    const args = { target: "original", definition: { weight: "weight" } };
    const prepared = await prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "editGraphData", args } }, host(worker));
    assert.equal(prepared.inputHashes.length, 1);
    const actual = program.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "update" });
    assert.deepEqual(actual.graphicSpec, ordinary.editGraphData(args).graphicSpec);
    for (const [kind, id] of [["graph", "original"], ["graph", "graph"], ["layout", "layout"], ["edge-route", "route"]]) assert.equal(get(actual, kind, id).revision, 1);
  } finally { worker.dispose(); }
});
