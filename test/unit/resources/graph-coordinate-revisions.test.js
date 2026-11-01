import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { getMarkItems } from "../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { encodeValue, decodeValue } from "../../../src/persistence/codec.js";
import { encodeRowKey } from "../../../src/core/itemIdentity.js";
import { graphLayoutKernelOptions, GRAPH_COORDINATE_FIELDS } from "../../../src/grammar/graph/layoutOptions.js";

const rows = [{ id: "a", group: "one" }, { id: "b", group: "one" }, { id: "c", group: "one" }];
const positions = [{ key: "a", x: 30, y: 40 }, { key: "b", x: 80, y: 60 }, { key: "c", x: 120, y: 100 }];
const layout = p => p.semanticSpec.resources.find(r => r.kind === "layout");
const base = method => chart().createCanvas({ width: 400, height: 300, margin: 0 })
  .createData({ id: "nodes", values: rows, keyField: "id" })
  .createInferredGraphData({ id: "graph", nodeKey: "id", ruleId: "group", rule: "group", options: { fields: ["group"] } })
  .layoutGraph({ id: "layout", method, options: method === "fixed" ? { positions }
    : { iterations: 0, initialPositions: positions, pinned: [{ key: "b", fx: 80, fy: 60 }] } })
  .createGraphPlot({ id: "plot" });

test("fixed and force source revisions preserve dormant coordinate intent and restore returning typed identities", () => {
  for (const method of ["fixed", "force"]) {
    const original = base(method), snapshot = serializeProgram(original);
    const reduced = original.reviseData({ source: "nodes", id: "reduced", values: [rows[0], rows[2]] });
    assert.deepEqual(layout(reduced).options, layout(original).options);
    assert.deepEqual(layout(reduced).result.nodes.map(n => n.key), [encodeRowKey("a"), encodeRowKey("c")]);
    assert.equal(layout(reduced).revision, 1);
    assert.equal(getMarkItems(reduced).filter(item => item.fields.kind === "node").length, 2);
    const restored = deserializeProgram(serializeProgram(reduced));
    assert.deepEqual(restored.graphicSpec, reduced.graphicSpec);
    const returning = restored.reviseData({ source: "reduced", id: "returned", values: rows });
    assert.deepEqual(layout(returning).result, layout(original).result);
    assert.deepEqual(getMarkItems(returning).map(item => item.key), getMarkItems(original).map(item => item.key));
    assert.equal(serializeProgram(original), snapshot);
  }
});

test("layout edits retain only unchanged dormant coordinates in explicit replacement arrays", () => {
  for (const method of ["fixed", "force"]) {
    const reduced = base(method).reviseData({ source: "nodes", id: "reduced", values: [rows[0], rows[2]] });
    const edited = reduced.editLayout({ options: { maxNodes: 10 } });
    assert.deepEqual(layout(edited).options.options.positions ?? layout(edited).options.options.initialPositions, positions);
    const snapshot = serializeProgram(edited);
    const coordinateField = method === "fixed" ? "positions" : "initialPositions";
    const retained = edited.editLayout({ options: { [coordinateField]: positions } });
    assert.deepEqual(layout(retained).options.options[coordinateField], positions);
    assert.throws(() => edited.editLayout({ options: { [coordinateField]: positions.map(p => p.key === "b" ? { ...p, x: 1 } : p) } }), /position|key|node/i);
    if (method === "force") assert.throws(() => edited.editLayout({ options: { pinned: [{ key: "b", fx: 1, fy: 2 }] } }), /pin|key|node/i);
    const reset = edited.editLayout({ options: { [coordinateField]: [positions[0], positions[2]], ...(method === "force" ? { pinned: [] } : {}) } });
    assert.throws(() => reset.reviseData({ source: "reduced", id: "expanded", values: rows }), /position|node/i);
    assert.equal(serializeProgram(edited), snapshot);
  }
});

test("empty source revisions retain finite unique dormant positions without fabricating new node coordinates", () => {
  for (const method of ["fixed", "force"]) {
    const original = base(method), empty = original.reviseData({ source: "nodes", id: "empty", values: [] });
    assert.deepEqual(layout(empty).result.nodes, []);
    assert.deepEqual(layout(empty).options, layout(original).options);
    assert.deepEqual(deserializeProgram(serializeProgram(empty)).graphicSpec, empty.graphicSpec);
    assert.throws(() => empty.reviseData({ source: "empty", id: "new", values: [{ id: "new", group: "one" }] }), /position|node/i);
    assert.deepEqual(layout(empty.reviseData({ source: "empty", id: "returned", values: rows })).result, layout(original).result);
  }
});

test("dormant intent remains validated during codec restoration", () => {
  const p = base("fixed").reviseData({ source: "nodes", id: "reduced", values: [rows[0], rows[2]] });
  const envelope = JSON.parse(serializeProgram(p)), state = decodeValue(envelope.payload);
  for (const mutate of [
    options => { options.positions[1].x = Infinity; },
    options => { options.positions[1].key = "a"; },
    options => { options.positions = options.positions.filter(position => position.key !== "c"); }
  ]) {
    const invalid = structuredClone(state); mutate(layout(invalid).options.options);
    assert.throws(() => deserializeProgram(JSON.stringify({ ...envelope, payload: encodeValue(invalid) })));
  }
});

test("coordinate projection distinguishes string, numeric and compound keys and never mutates authored arrays", () => {
  const values = [1, "1", [1, "1"]].map((key, index) => ({ key, x: index, y: index }));
  const intent = { options: { positions: values } }, snapshot = structuredClone(intent);
  assert.deepEqual(graphLayoutKernelOptions(intent).positions.map(item => item.key), values.map(item => encodeRowKey(item.key)));
  const projected = graphLayoutKernelOptions(intent, { nodeKeys: [encodeRowKey(1), encodeRowKey([1, "1"])], retainedCoordinates: GRAPH_COORDINATE_FIELDS });
  assert.deepEqual(projected.positions.map(item => item.key), [encodeRowKey(1), encodeRowKey([1, "1"])]);
  assert.deepEqual(graphLayoutKernelOptions(intent, { nodeKeys: [] }).positions.length, 3);
  assert.deepEqual(intent, snapshot);
});
