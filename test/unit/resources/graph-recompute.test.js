import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { getMarkItems } from "../../../src/inspection.js";
import { exportAccessibleData } from "../../../src/accessibility.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { encodeValue, decodeValue } from "../../../src/persistence/codec.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { normalizeGraphSubsetTransform, deriveGraphSubsetRows } from "../../../src/grammar/graph/subset.js";
import { subsetGraphCandidate } from "../../../src/grammar/graph/candidateSubset.js";
import { prepareProgramHitFrame } from "../../../src/interaction/hitProgram.js";

const rows = [{ id: "a", x: 0, group: "x" }, { id: "b", x: 1, group: "x" }, { id: "c", x: 2, group: "x" }, { id: "d", x: 5, group: "x" }];
const resource = (p, id = "g") => p.semanticSpec.resources.find(r => r.id === id);
const data = (p, id) => p.semanticSpec.datasets.find(d => d.id === id);
const nodeItems = (p, target = "graphPlot") => getMarkItems(p, { target }).filter(i => i.fields.kind === "node");
const keys = p => nodeItems(p).map(i => i.fields.key);
const keep = { field: "key", op: "neq", value: "b" };
const base = (definition = {}, method = "circular") => chart().createCanvas({ width: 400, height: 300, margin: 0 })
  .createData({ id: "nodes", values: rows, keyField: "id" })
  .createInferredGraphData({ id: "g", data: "nodes", nodeKey: "id", ruleId: "links", rule: "sequence", options: { orderField: "x" }, attributes: ["x", "group"], ...definition })
  .layoutGraph({ id: "l", method, ...(method === "fixed" ? { options: { positions: rows.map((row, i) => ({ key: row.id, x: i * 50, y: 50 })) } } : {}) })
  .createGraphPlot();
const pairs = p => getMarkItems(p).filter(i => i.fields.kind === "edge").map(i => [i.fields.sourceKey, i.fields.targetKey]);

test("explicit recompute reconnects sequence neighbors and preserves source rows and surviving logical items", () => {
  const p = base(), before = serializeProgram(p), induced = p.filterMarks(keep), q = p.filterMarks({ ...keep, recompute: true });
  assert.deepEqual(pairs(induced), [["c", "d"]]);
  assert.deepEqual(pairs(q), [["a", "c"], ["c", "d"]]);
  assert.deepEqual(keys(q), ["a", "c", "d"]);
  assert.equal(resource(q).revision, 1); assert.equal(resource(q, "l").revision, 1);
  assert.equal(data(q, "nodes"), data(p, "nodes"));
  assert.equal(serializeProgram(p), before);
  for (const node of nodeItems(q)) {
    assert.equal(node.key, nodeItems(p).find(i => i.fields.key === node.fields.key).key);
    assert.ok(node.rows.some(row => row.data === "nodes"));
  }
  assert.deepEqual(q.trace.children.at(-1).children[0].children.map(child => child.op), ["createDerivedData", "materializeGraphSubsetData", "editSemantic", "materializeGraphPlot"]);
  assert.equal(exportAccessibleData(q).views[0].rows.length, 5);
  assert.equal(renderToSVG(deserializeProgram(serializeProgram(q))), renderToSVG(q));
});

test("all inferred rules recompute subsets, including empty results, under their original policy", () => {
  const definitions = [
    {}, { rule: "group", options: { fields: ["group"], mode: "clique" } },
    { rule: "knn", features: ["x"], metric: "euclidean", options: { k: 1 } },
    { rule: "radius", features: ["x"], metric: "euclidean", options: { radius: 3 } },
    { rule: "similarity", features: ["x"], metric: "cosine", options: { threshold: 0.5, zeroVector: "zero-similarity" } },
    { rule: "mst", features: ["x"], metric: "euclidean", options: {} }
  ];
  for (const definition of definitions) {
    const p = base(definition), q = p.filterMarks({ ...keep, recompute: true });
    assert.deepEqual(keys(q), ["a", "c", "d"]);
    assert.deepEqual(keys(deserializeProgram(serializeProgram(q))), keys(q));
    assert.deepEqual(keys(q.removeMarkFilter()), ["a", "b", "c", "d"]);
    const empty = p.filterMarks({ field: "key", op: "eq", value: "absent", recompute: true });
    assert.deepEqual(resource(empty).result.model.nodes, []); assert.deepEqual(resource(empty).result.model.edges, []);
    assert.deepEqual(keys(deserializeProgram(serializeProgram(empty)).removeMarkFilter()), keys(p));
  }
});

test("replace, compose, explicit induced switch and removal reevaluate the original graph recipe", () => {
  const p = base(), q = p.filterMarks({ ...keep, recompute: true });
  assert.equal(q.filterMarks(keep).graphicSpec, q.graphicSpec);
  assert.throws(() => q.filterMarks({ field: "key", op: "eq", value: "c" }), /mode/);
  const replaced = q.filterMarks({ field: "key", op: "eq", value: "b", mode: "replace" });
  assert.deepEqual(keys(replaced), ["b"]);
  assert.equal(replaced.semanticSpec.datasets.length, 2);
  const composed = q.filterMarks({ field: "key", op: "neq", value: "c", mode: "compose" });
  assert.deepEqual(keys(composed), ["a", "d"]); assert.deepEqual(pairs(composed), [["a", "d"]]);
  const switched = q.filterMarks({ ...keep, recompute: false });
  assert.deepEqual(pairs(switched), pairs(p.filterMarks(keep)));
  assert.deepEqual(resource(switched).result.model, resource(p).result.model);
  assert.equal(switched.semanticSpec.datasets.length, 1);
  assert.equal(switched.context.currentData, "nodes");
  assert.equal(renderToSVG(switched.removeMarkFilter()), renderToSVG(p));
  assert.deepEqual(keys(switched.filterMarks({ ...keep, recompute: true })), keys(q));
});

test("source revisions replay exact keys, preserve fixed coordinates and release obsolete derived revisions", () => {
  const p = base({}, "fixed"), q = p.filterMarks({ ...keep, recompute: true });
  const revised = q.reviseData({ source: "nodes", id: "changed", values: rows.filter(row => row.id !== "c") });
  assert.deepEqual(keys(revised), ["a", "d"]);
  const view = revised.markConfigs.graphPlot.graphPlot.view.recompute;
  assert.equal(view.source, "changed"); assert.equal(resource(revised).inputs[0].id, view.dataset);
  assert.equal(data(revised, "graphPlotGraphSubset"), undefined);
  const restored = deserializeProgram(serializeProgram(revised));
  const returned = restored.reviseData({ source: "changed", id: "returned", values: rows });
  assert.deepEqual(keys(returned), ["a", "c", "d"]);
  assert.deepEqual(resource(returned, "l").options, resource(p, "l").options);
  assert.deepEqual(keys(returned.removeMarkFilter()), keys(p));
  const dynamic = base().filterMarks({ ...keep, recompute: true }).reviseData({ source: "nodes", id: "added", values: [...rows, { id: "e", x: 7, group: "x" }] });
  assert.deepEqual(keys(dynamic), ["a", "c", "d"]);
  assert.deepEqual(keys(dynamic.removeMarkFilter()), ["a", "b", "c", "d", "e"]);
});

test("resource sharing refreshes every graph consumer and permits only one recompute owner", () => {
  const p = base().layoutGraph({ id: "second", graph: "g", method: "circular", options: { radius: 70 } }).createGraphPlot({ id: "peer", layout: "second" });
  const q = p.filterMarks({ target: "graphPlot", ...keep, recompute: true });
  assert.deepEqual(nodeItems(q, "peer").map(i => i.fields.key), ["a", "c", "d"]);
  assert.equal(resource(q, "second").revision, 1);
  assert.throws(() => q.filterMarks({ target: "peer", ...keep, recompute: true }), /one recompute/);
  assert.deepEqual(nodeItems(q.removeMark({ target: "graphPlot" }), "peer").map(i => i.fields.key), rows.map(row => row.id));
  const removed = q.removeMark({ target: "graphPlot" });
  assert.equal(removed.semanticSpec.datasets.length, 1); assert.equal(removed.markConfigs.graphPlot, undefined);
  assert.equal(q.editGraphPlot({ target: "graphPlot", layout: "second" }).markConfigs.graphPlot.graphPlot.view.recompute.dataset, q.markConfigs.graphPlot.graphPlot.view.recompute.dataset);
});

test("candidate MST projects valid original endpoints and refreshes candidate revisions", () => {
  const edges = [{ id: "ab", from: "a", to: "b", weight: 1 }, { id: "bc", from: "b", to: "c", weight: 1 }, { id: "ac", from: "a", to: "c", weight: 3 }, { id: "cd", from: "c", to: "d", weight: 2 }];
  const p = chart().createCanvas().createData({ id: "nodes", values: rows, keyField: "id" }).createData({ id: "edges", values: edges, keyField: "id" })
    .createGraphData({ id: "candidate", nodes: "nodes", edges: "edges", nodeKey: "id", source: "from", target: "to", edgeKey: "id", weight: "weight" })
    .createInferredGraphData({ id: "g", data: "nodes", candidateGraph: "candidate", nodeKey: "id", rule: "mst", ruleId: "tree", options: { forest: true } })
    .layoutGraph({ id: "l", graph: "g", method: "circular" }).createGraphPlot();
  const q = p.filterMarks({ ...keep, recompute: true });
  assert.equal(resource(q).result.diagnostics.cost, 5); assert.equal(resource(q).result.diagnostics.candidateCount, 2);
  assert.deepEqual(keys(deserializeProgram(serializeProgram(q))), ["a", "c", "d"]);
  const revised = q.reviseData({ source: "edges", id: "reweighted", values: edges.map(edge => ({ ...edge, weight: edge.weight + 1 })) });
  assert.equal(resource(revised).revision, 2); assert.equal(resource(revised).result.diagnostics.cost, 7);
  assert.equal(resource(revised, "l").revision, 2);
  assert.throws(() => subsetGraphCandidate(resource(p, "candidate").result.model, rows.slice(1), rows.slice(2), "id"), /candidate/);
});

test("invalid policy, binding changes and unsupported targets reject atomically", () => {
  const p = base({ rule: "knn", features: ["x"], metric: "euclidean", options: { k: 2 } }), before = serializeProgram(p);
  assert.throws(() => p.filterMarks({ field: "x", op: "eq", value: 0, recompute: true }));
  assert.throws(() => p.filterMarks({ field: "key", op: "oneOf", values: ["a", "b"], recompute: true }), /k/);
  for (const recompute of [null, 1, "true", undefined]) assert.throws(() => p.filterMarks({ ...keep, recompute }), /boolean/);
  assert.equal(serializeProgram(p), before);
  const q = base().filterMarks({ ...keep, recompute: true }), snapshot = serializeProgram(q);
  assert.throws(() => q.editInferredGraphData({ target: "g", data: "nodes" }), /Remove/);
  assert.throws(() => q.editInferredGraphData({ target: "g", definition: { nodeKey: ["id"] } }), /Remove/);
  assert.equal(serializeProgram(q), snapshot);
  assert.deepEqual(keys(q.editInferredGraphData({ target: "g", definition: { options: { orderField: "x", lag: 2 } } })), keys(q));
  const plain = chart().createCanvas().createData({ id: "d", values: [{ x: 1 }] }).createPointMark();
  assert.throws(() => plain.filterMarks({ field: "x", op: "eq", value: 1, recompute: true }), /inferred graph/);
});

test("stored recompute ownership and subset content are verified on restore", () => {
  const q = base().filterMarks({ ...keep, recompute: true }), envelope = JSON.parse(serializeProgram(q)), original = decodeValue(envelope.payload);
  const corruptions = [
    state => { state.materializationConfigs.marks.graphPlot.graphPlot.view.recompute.source = "missing"; },
    state => { state.materializationConfigs.marks.graphPlot.graphPlot.view.recompute.dataset = "nodes"; },
    state => { state.materializationConfigs.marks.graphPlot.graphPlot.view.recompute.extra = true; },
    state => { state.semanticSpec.datasets.at(-1).transform[0].nodeKey = "group"; },
    state => { state.semanticSpec.datasets.at(-1).transform[0].keys.push("a"); },
    state => { state.semanticSpec.datasets.at(-1).values[0].group = "corrupt"; }
  ];
  for (const corrupt of corruptions) {
    const state = structuredClone(original); corrupt(state);
    assert.throws(() => deserializeProgram(JSON.stringify({ ...envelope, payload: encodeValue(state) })));
  }
});

test("typed-key subset keeps source order, compound values and immutable lineage", () => {
  const input = [{ id: 1 }, { id: "1" }, { id: 1n }], transform = normalizeGraphSubsetTransform("id", [1n, 1]);
  assert.deepEqual(deriveGraphSubsetRows(input, transform), [input[0], input[2]]);
  assert.deepEqual(deriveGraphSubsetRows(input, normalizeGraphSubsetTransform(["id"], [["1"]])), [input[1]]);
  for (const invalid of [null, {}, { type: "filter", nodeKey: "id", keys: [] }, { type: "graphSubset", nodeKey: "id", keys: [1, 1] }]) assert.throws(() => deriveGraphSubsetRows(input, invalid));
  assert.throws(() => normalizeGraphSubsetTransform("id", [null]));
  assert.ok(Object.isFrozen(transform.keys));
});

test("scoped recompute isolates composition siblings and current hit geometry", () => {
  const p = base(), root = hconcat({ programs: [{ id: "left", program: p }, { id: "right", program: p }] });
  const q = root.filterMarks({ target: { childPath: ["left"], id: "graphPlot" }, ...keep, recompute: true });
  assert.equal(q.children.right, p); assert.deepEqual(keys(q.children.left), ["a", "c", "d"]);
  assert.deepEqual(keys(deserializeProgram(serializeProgram(q)).children.left), keys(q.children.left));
  const restored = q.removeMarkFilter({ target: { childPath: ["left"], id: "graphPlot" } });
  assert.equal(renderToSVG(restored.children.left), renderToSVG(p));
  assert.equal(restored.children.right, p);
  const frame = prepareProgramHitFrame(q);
  for (const child of ["left", "right"]) assert.deepEqual(new Set(frame.entries.filter(entry => entry.metadata.childPath[0] === child).map(entry => entry.metadata.itemKey)),
    new Set(getMarkItems(q, { target: { kind: "mark", childPath: [child], id: "graphPlot" } }).map(item => item.key)));
});

test("retained subset snapshots, independent owners and highlights survive filter replacement and cleanup", () => {
  const source = base().highlightMarks({ id: "chosen", select: { field: "key", op: "eq", value: "c" }, stroke: "red" });
  const q = source.filterMarks({ ...keep, recompute: true });
  assert.equal(q.graphicSpec.objects.graphPlot.items.find(item => item.identity.key === nodeItems(q).find(item => item.fields.key === "c").key).properties.stroke, "red");
  const subset = q.markConfigs.graphPlot.graphPlot.view.recompute.dataset;
  const consumed = q.filterData({ id: "snapshot", source: subset, field: "x", range: { min: 0 } });
  const replaced = consumed.filterMarks({ target: "graphPlot", mode: "replace", field: "key", op: "eq", value: "b" });
  assert.ok(data(replaced, subset)); assert.equal(data(replaced, "snapshot"), data(consumed, "snapshot"));
  assert.deepEqual(keys(replaced.removeMarkFilter()), keys(source));
  const another = q.createInferredGraphData({ id: "other", data: "nodes", ruleId: "other", nodeKey: "id", rule: "sequence", options: { orderField: "x" } })
    .layoutGraph({ id: "otherLayout", graph: "other", method: "circular" }).createGraphPlot({ id: "otherPlot" })
    .filterMarks({ target: "otherPlot", ...keep, recompute: true });
  assert.deepEqual(nodeItems(another, "otherPlot").map(item => item.fields.key), ["a", "c", "d"]);
  assert.throws(() => another.editGraphPlot({ target: "graphPlot", layout: "otherLayout" }), /subset binding|one recompute/);
  const observed = chart().createCanvas().createData({ id: "nodes", values: rows }).createData({ id: "edges", values: [] })
    .createGraphData({ id: "observed", nodes: "nodes", edges: "edges", nodeKey: "id", source: "from", target: "to" })
    .layoutGraph({ id: "layout", method: "circular" }).createGraphPlot();
  assert.throws(() => observed.filterMarks({ ...keep, recompute: true }), /inferred graph/);
});
