import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { chart as basicChart } from "../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { encodeValue, decodeValue } from "../../../src/persistence/codec.js";
import { resolveLayoutResource } from "../../../src/selectors/layouts.js";

const nodes = [{ key: "a", parent: null, value: 1 }, { key: "b", parent: "a", value: 2 }];
const source = () => chart().createData({ id: "nodes", values: nodes, keyField: "key" })
  .createData({ id: "edges", values: [{ source: "a", target: "b" }] })
  .createGraphData({ id: "network", nodes: "nodes", edges: "edges", nodeKey: "key", source: "source", target: "target" });
const resource = (program, id) => program.semanticSpec.resources.find(item => item.kind === "layout" && item.id === id);
const positions = [{ key: "a", x: 10, y: 20 }, { key: "b", x: 30, y: 40 }];

test("public graph layouts store resolved intent and restore exact results for all methods", () => {
  const before = source(), snapshot = serializeProgram(before);
  for (const input of [{ method: "fixed", options: { positions } }, { method: "circular" },
    { method: "force", options: { iterations: 8, pinned: [{ key: "a", fx: 3, fy: 4 }] } }]) {
    const after = before.layoutGraph({ id: "placement", ...input }), layout = resource(after, "placement");
    assert.deepEqual(layout.inputs, [{ kind: "graph", id: "network", revision: 0 }]);
    assert.equal(layout.options.method, input.method);
    assert.equal(layout.result.nodes.length, 2);
    assert.equal(after.graphicSpec, before.graphicSpec);
    assert.equal(after.trace.children.at(-1).op, "layoutGraph");
    assert.equal(after.trace.children.at(-1).children[0].op, "editSemantic");
    assert.deepEqual(deserializeProgram(serializeProgram(after)).semanticSpec, after.semanticSpec);
  }
  assert.equal(serializeProgram(before), snapshot);
  assert.equal(typeof basicChart().layoutGraph, "undefined");
});

test("layout edits retain method and merge options while graph revisions refresh each dependent layout once", () => {
  const before = source().layoutGraph({ id: "circle", method: "circular" })
    .layoutGraph({ id: "fixed", method: "fixed", options: { positions } });
  const edited = before.editLayout({ target: "circle", options: { radius: 40 } });
  assert.equal(resource(edited, "circle").revision, 1);
  assert.equal(resource(edited, "circle").options.options.startAngle, 0);
  assert.equal(resource(edited, "fixed"), resource(before, "fixed"));
  const revised = edited.reviseData({ source: "nodes", id: "updated", values: nodes.map(node => ({ ...node, value: node.value + 1 })) });
  assert.equal(resource(revised, "circle").revision, 2);
  assert.equal(resource(revised, "fixed").revision, 1);
  for (const id of ["circle", "fixed"]) {
    assert.equal(resource(revised, id).inputs[0].revision, 1);
    assert.equal(resource(revised, id).provenance.sourceRows[0].data, "updated");
  }
  const explicit = revised.editGraphData({ definition: { directed: true } });
  assert.equal(resource(explicit, "circle").revision, 3);
  assert.equal(resource(explicit, "fixed").revision, 2);
  assert.deepEqual(deserializeProgram(serializeProgram(explicit)).semanticSpec, explicit.semanticSpec);
});

test("shared layout selectors preserve hierarchy routing and reject ambiguous eligible layouts", () => {
  const program = source().layoutGraph({ id: "circle", method: "circular" })
    .createHierarchyData({ id: "tree", data: "nodes", key: "key", parent: "parent", value: "value" })
    .layoutHierarchy({ id: "partition", method: "partition" });
  assert.equal(resource(program.editLayout({ options: { maxNodes: 25 } }), "partition").revision, 1);
  assert.equal(resource(program.editLayout({ target: "circle", options: { radius: 10 } }), "circle").revision, 1);
  const ambiguous = program._clone({ context: { ...program.context, currentResources: {} } });
  assert.throws(() => ambiguous.editLayout({ options: { maxNodes: 25 } }), /explicit layout/);
  assert.equal(resolveLayoutResource(ambiguous, undefined, "graph").id, "circle");
  assert.throws(() => resolveLayoutResource(program, "partition", "graph"), /incompatible/);
  assert.throws(() => resolveLayoutResource(source()), /explicit layout/);
});

test("invalid graph layouts and stale dependent coordinates fail without state or trace changes", () => {
  const before = source().layoutGraph({ id: "fixed", method: "fixed", options: { positions } });
  const snapshot = serializeProgram(before), trace = before.trace;
  for (const run of [
    () => before.layoutGraph({ id: "fixed", method: "circular" }),
    () => before.layoutGraph({ id: "invalid", method: "fixed", options: { positions: positions.slice(0, 1) } }),
    () => before.layoutGraph({ id: "invalid", method: "force", options: undefined }),
    () => before.editLayout({}),
    () => before.editLayout({ options: {} }),
    () => before.editLayout({ options: undefined }),
    () => before.editLayout({ options: { positions: undefined } }),
    () => before.editLayout({ order: "input" }),
    () => before.editLayout({ options: { method: "force" } }),
    () => before.reviseData({ source: "nodes", id: "expanded", values: [...nodes, { key: "c", parent: "a", value: 3 }] })
  ]) {
    assert.throws(run);
    assert.equal(serializeProgram(before), snapshot);
    assert.equal(before.trace, trace);
  }
});

test("editable restore rejects altered layout references, fixed coordinates, and force membership", () => {
  const before = source().layoutGraph({ id: "fixed", method: "fixed", options: { positions } })
    .layoutGraph({ id: "force", method: "force", options: { iterations: 2 } });
  const envelope = JSON.parse(serializeProgram(before)), state = decodeValue(envelope.payload);
  for (const mutate of [
    state => { resource(state, "fixed").inputs[0].revision = 1; },
    state => { resource(state, "fixed").result.nodes[0].x += 1; },
    state => { resource(state, "force").result.packing.components[0].nodeIndices = [0]; },
    state => { resource(state, "force").provenance.sourceRows[0].rowKey = "forged"; }
  ]) {
    const changed = structuredClone(state); mutate(changed);
    assert.throws(() => deserializeProgram(JSON.stringify({ ...envelope, payload: encodeValue(changed) })));
  }
});

test("composition layout targets revise only the explicit child", () => {
  const child = source().layoutGraph({ id: "circle", method: "circular" }).createCanvas({ width: 200, height: 160 });
  const before = hconcat({ programs: [{ id: "left", program: child }, { id: "right", program: child }] });
  const after = before.editLayout({ target: { childPath: ["left"], id: "circle" }, options: { radius: 5 } });
  assert.equal(resource(after.children.left, "circle").revision, 1);
  assert.equal(after.children.right, child);
});
