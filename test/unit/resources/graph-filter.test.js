import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { getMarkItems } from "../../../src/inspection.js";
import { exportAccessibleData } from "../../../src/accessibility.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { encodeValue, decodeValue } from "../../../src/persistence/codec.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { createTransitionScene } from "../../../src/scene.js";

const nodes = [{ id: "a", score: 3, group: "x" }, { id: "b", score: 2, group: "x" }, { id: "c", score: 1, group: "y" }];
const edges = [{ id: "ab", from: "a", to: "b" }, { id: "parallel", from: "a", to: "b" }, { id: "bc", from: "b", to: "c" }, { id: "loop", from: "a", to: "a" }];
const base = () => chart().createCanvas({ width: 400, height: 300, margin: 0 })
  .createData({ id: "nodes", values: nodes, keyField: "id" }).createData({ id: "edges", values: edges, keyField: "id" })
  .createGraphData({ id: "g", nodes: "nodes", edges: "edges", nodeKey: "id", source: "from", target: "to", edgeKey: "id", attributes: ["score", "group"], directed: true, selfLoops: true })
  .layoutGraph({ id: "positions", method: "circular", options: { radius: 50 } }).createGraphPlot({ labels: {} });
const graphics = p => p.graphicSpec.objects.graphPlot.items;
const nodeKeys = p => getMarkItems(p).filter(item => item.fields.kind === "node").map(item => item.fields.key);
const keepAB = { field: "attribute:score", op: "gte", value: 2 };

test("graph node filters preserve full topology, position, identity and induced multigraph edges", () => {
  const p = base(), snapshot = serializeProgram(p), q = p.filterMarks(keepAB);
  assert.deepEqual(nodeKeys(q), ["a", "b"]);
  assert.equal(q.semanticSpec, p.semanticSpec);
  assert.equal(q.semanticSpec.resources, p.semanticSpec.resources);
  assert.equal(getMarkItems(q).filter(item => item.fields.kind === "edge").length, 3);
  const retained = new Set(getMarkItems(q).map(item => item.key));
  assert.deepEqual(graphics(q).map(({ id: _id, ...item }) => item), graphics(p).filter(item => retained.has(item.identity.key)).map(({ id: _id, ...item }) => item));
  assert.deepEqual(getMarkItems(q).filter(item => item.fields.kind === "node").map(item => item.fields.degree), [4, 3]);
  assert.equal(serializeProgram(p), snapshot);
  assert.deepEqual(q.trace.children.at(-1).children.map(item => item.op), ["filterGraphPlotView"]);
  assert.equal(exportAccessibleData(q).views[0].rows.length, 5);
  assert.equal(graphics(q).filter(item => item.identity.role === "arrow").length, 3);
  assert.equal(graphics(q).filter(item => item.identity.role === "label").length, 2);
});

test("graph filter replace, compose, idempotence and removal use the existing lifecycle", () => {
  const p = base(), q = p.filterMarks(keepAB);
  assert.equal(q.filterMarks(keepAB).graphicSpec, q.graphicSpec);
  assert.throws(() => q.filterMarks({ field: "key", op: "eq", value: "c" }), /mode/);
  const composed = q.filterMarks({ mode: "compose", field: "key", op: "eq", value: "c" });
  assert.deepEqual(graphics(composed), []);
  assert.deepEqual(nodeKeys(q.filterMarks({ mode: "replace", field: "key", op: "eq", value: "c" })), ["c"]);
  assert.deepEqual(q.removeMarkFilter().graphicSpec, p.graphicSpec);
  assert.deepEqual(composed.removeMarkFilter().graphicSpec, p.graphicSpec);
  assert.equal(Object.hasOwn(q.removeMarkFilter().markConfigs.graphPlot.graphPlot, "view"), false);
  assert.throws(() => p.removeMarkFilter(), /filter/);
});

test("node row, grouped rank and body property selectors exclude edges before evaluation", () => {
  const p = base();
  assert.deepEqual(nodeKeys(p.filterMarks({ rows: { data: "nodes", indices: [1, 2] } })), ["b", "c"]);
  assert.deepEqual(nodeKeys(p.filterMarks({ field: "degree", op: "max", count: 1 })), ["a"]);
  assert.deepEqual(nodeKeys(p.filterMarks({ field: "attribute:score", op: "max", count: 1, groupBy: "attribute:group" })), ["a", "c"]);
  const x = graphics(p).find(item => item.type === "circle").properties.x;
  assert.deepEqual(nodeKeys(p.filterMarks({ property: "x", op: "eq", value: x })), ["a"]);
  assert.throws(() => p.filterMarks({ rows: { data: "edges", indices: [0] } }), /lineage/);
  assert.throws(() => p.filterMarks({ rows: { data: "nodes", indices: [3] } }), /index|indices/i);
});

test("induced views replay on source and layout edits without changing source graph meaning", () => {
  const p = base().filterMarks(keepAB);
  const q = p.reviseData({ source: "nodes", id: "nodes2", values: nodes.map(row => ({ ...row, score: 4 - row.score })) });
  assert.deepEqual(nodeKeys(q), ["b", "c"]);
  assert.equal(q.semanticSpec.resources.find(resource => resource.kind === "graph").revision, 1);
  assert.equal(q.semanticSpec.resources.find(resource => resource.kind === "graph").result.model.nodes.length, 3);
  assert.deepEqual(nodeKeys(q.editLayout({ options: { radius: 80 } }).editCanvas({ width: 600 })), ["b", "c"]);
  assert.deepEqual(nodeKeys(q.editGraphPlot({ nodes: { radius: 12 } })), ["b", "c"]);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
});

test("filtering inferred graphs keeps original inference and exact surviving edge metadata", () => {
  const p = chart().createCanvas().createData({ id: "nodes", values: nodes, keyField: "id" })
    .createInferredGraphData({ id: "g", data: "nodes", nodeKey: "id", rule: "knn", ruleId: "near", features: ["score"], metric: "euclidean", attributes: ["score"] })
    .layoutGraph({ id: "positions", method: "circular" }).createGraphPlot();
  const q = p.filterMarks(keepAB), selected = getMarkItems(q), retained = new Set(selected.map(item => item.key));
  assert.equal(q.semanticSpec.resources, p.semanticSpec.resources);
  assert.deepEqual(selected.map(item => item.fields), getMarkItems(p).filter(item => retained.has(item.key)).map(item => item.fields));
  assert.ok(selected.every(item => item.fields.origin === "inferred" && item.fields.ruleId === "near" && item.fields.metric === "euclidean"));
  assert.ok(selected.every(item => item.rows.some(row => row.data === "nodes")));
});

test("graph highlights survive hidden items and restoration without neighbor reassignment", () => {
  const p = base().highlightMarks({ id: "picked", target: "graphPlot", select: { rows: { data: "edges", indices: [2] } }, stroke: "red", strokeWidth: 4 });
  const q = p.filterMarks(keepAB);
  assert.equal(graphics(q).some(item => item.properties.stroke === "red" || item.properties.fill === "red"), false);
  assert.deepEqual(q.removeMarkFilter().graphicSpec, p.graphicSpec);
  assert.equal(graphics(q.removeMarkFilter()).filter(item => item.properties.stroke === "red" || item.properties.fill === "red").length, 2);
});

test("scoped filtering updates one composition child and renderer snapshots round trip", () => {
  const p = base(), composite = hconcat({ programs: [{ id: "left", program: p }, { id: "right", program: p }] });
  const q = composite.filterMarks({ target: { childPath: ["left"], id: "graphPlot" }, ...keepAB });
  assert.equal(q.children.right, p); assert.deepEqual(nodeKeys(q.children.left), ["a", "b"]);
  const restored = deserializeProgram(serializeProgram(q));
  assert.equal(renderToSVG(restored), renderToSVG(q));
  assert.deepEqual(createTransitionScene(restored, { format: "canvas" }), createTransitionScene(q, { format: "canvas" }));
  assert.deepEqual(q.removeMarkFilter({ target: { childPath: ["left"], id: "graphPlot" } }).graphicSpec, composite.graphicSpec);
});

test("graph filter errors and malformed stored views leave earlier programs untouched", () => {
  const p = base(), snapshot = serializeProgram(p);
  for (const args of [
    { ...keepAB, grain: "stack" }, { ...keepAB, mode: "unknown" }, { field: "weight", op: "gte", value: 1 },
    { channel: "x", op: "gt", value: 0 }, { ...keepAB, target: "missing" }, { field: "degree", op: "unknown" }
  ]) { assert.throws(() => p.filterMarks(args)); assert.equal(serializeProgram(p), snapshot); }
  const q = p.filterMarks(keepAB), envelope = JSON.parse(serializeProgram(q)), state = decodeValue(envelope.payload);
  for (const view of [null, {}, { selectors: [] }, { selectors: [keepAB], extra: true }, { selectors: [{ ...keepAB, grain: "stack" }] },
    { selectors: [{ rows: { data: "nodes", indices: [9] } }] }, { selectors: [{ channel: "x", op: "gt", value: 0 }] }]) {
    const changed = structuredClone(state); changed.materializationConfigs.marks.graphPlot.graphPlot.view = view;
    assert.throws(() => deserializeProgram(JSON.stringify({ ...envelope, payload: encodeValue(changed) })));
  }
});

test("typed node keys remain distinct and compound-key nodes select through exact source rows", () => {
  const rows = [{ id: 1 }, { id: "1" }, { id: 1n }];
  const p = chart().createCanvas().createData({ id: "nodes", values: rows })
    .createData({ id: "edges", values: [] }).createGraphData({ id: "g", nodes: "nodes", edges: "edges", nodeKey: "id", source: "from", target: "to" })
    .layoutGraph({ id: "l", method: "circular" }).createGraphPlot();
  assert.deepEqual(nodeKeys(p.filterMarks({ field: "key", op: "eq", value: 1 })), [1]);
  assert.deepEqual(nodeKeys(p.filterMarks({ field: "key", op: "eq", value: "1" })), ["1"]);
  const filtered = p.filterMarks({ field: "key", op: "eq", value: 1n });
  assert.deepEqual(nodeKeys(filtered), [1n]);
  assert.equal(filtered.filterMarks({ field: "key", op: "eq", value: 1n }).graphicSpec, filtered.graphicSpec);
  assert.deepEqual(nodeKeys(deserializeProgram(serializeProgram(filtered))), [1n]);
  const compound = p.editGraphData({ definition: { nodeKey: ["id"] } });
  assert.deepEqual(nodeKeys(compound.filterMarks({ rows: { data: "nodes", indices: [1] } })), [["1"]]);
});
