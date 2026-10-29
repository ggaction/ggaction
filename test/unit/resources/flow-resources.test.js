import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { chart as basicChart } from "../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { encodeValue, decodeValue } from "../../../src/persistence/codec.js";

const values = [{ id: "a" }, { id: "b" }, { id: "c" }];
const links = [{ id: "ab", source: "a", target: "b", value: 4 }, { id: "bc", source: "b", target: "c", value: 4 }];
const tables = () => chart().createData({ id: "nodes", values, keyField: "id" }).createData({ id: "links", values: links, keyField: "id" });
const flow = () => tables().createFlowData({ id: "flow", nodes: "nodes", edges: "links", nodeKey: "id", source: "source", target: "target", value: "value" });
const get = (program, kind, id) => program.semanticSpec.resources.find(resource => resource.kind === kind && resource.id === id);

test("flow creation keeps graph identity and stores explicit conservation diagnostics", () => {
  const input = tables(), before = serializeProgram(input);
  const program = input.createFlowData({ id: "flow", nodes: "nodes", edges: "links", nodeKey: "id", source: "source", target: "target", value: "value", balance: "strict" });
  const graph = get(program, "graph", "flow");
  assert.deepEqual(graph.options.flow, { balance: "strict" });
  assert.equal(graph.options.definition.weight, "value"); assert.equal(graph.result.model.directed, true);
  assert.deepEqual(graph.result.diagnostics.flow.nodes.map(node => [node.incoming, node.outgoing, node.throughput, node.imbalance]), [[0, 4, 4, -4], [4, 4, 4, 0], [4, 0, 4, 4]]);
  assert.deepEqual(graph.inputs.map(ref => ref.id), ["nodes", "links"]);
  assert.equal(program.graphicSpec, input.graphicSpec);
  assert.equal(program.trace.children.at(-1).op, "createFlowData");
  assert.equal(program.trace.children.at(-1).children[0].op, "editSemantic");
  assert.equal(serializeProgram(input), before);
  assert.deepEqual(deserializeProgram(serializeProgram(program)).semanticSpec, program.semanticSpec);
  for (const method of ["createFlowData", "editFlowData", "layoutFlow"]) assert.equal(typeof basicChart()[method], "undefined");
});

test("both flow layout modes store exact graph refs and survive restore then edit", () => {
  for (const method of ["dag", "cyclic"]) for (const orientation of ["horizontal", "vertical"]) {
    const program = flow().layoutFlow({ id: "layout", method, options: { orientation, width: 200, height: 120 } });
    const layout = get(program, "layout", "layout");
    assert.deepEqual(layout.inputs, [{ kind: "graph", id: "flow", revision: 0 }]);
    assert.equal(layout.result.nodes.length, 3); assert.equal(layout.result.edges.length, 2);
    const restored = deserializeProgram(serializeProgram(program));
    assert.deepEqual(restored.semanticSpec, program.semanticSpec);
    const edited = restored.editLayout({ options: { nodeWidth: 20 } });
    assert.equal(get(edited, "layout", "layout").revision, 1);
    assert.equal(get(edited, "layout", "layout").options.method, method);
  }
});

test("source revisions update flow diagnostics and each dependent layout once", () => {
  const program = flow().layoutFlow({ id: "dag", method: "dag" }).layoutFlow({ id: "cyclic", method: "cyclic" });
  const snapshot = serializeProgram(program), edgeKeys = get(program, "graph", "flow").result.model.edges.map(edge => edge.key);
  const revised = program.reviseData({ source: "links", id: "updated", values: links.map(row => ({ ...row, value: 6 })) });
  assert.equal(get(revised, "graph", "flow").revision, 1);
  assert.deepEqual(get(revised, "graph", "flow").result.model.edges.map(edge => edge.key), edgeKeys);
  for (const id of ["dag", "cyclic"]) {
    const layout = get(revised, "layout", id);
    assert.equal(layout.revision, 1); assert.equal(layout.inputs[0].revision, 1);
    assert.equal(layout.result.edges[0].value, 6);
  }
  const edited = revised.editFlowData({ definition: { balance: "strict" } });
  assert.equal(get(edited, "graph", "flow").revision, 2);
  assert.equal(get(edited, "layout", "dag").revision, 2);
  assert.deepEqual(deserializeProgram(serializeProgram(edited)).semanticSpec, edited.semanticSpec);
  assert.equal(serializeProgram(program), snapshot);
});

test("invalid flow changes and new cycles reject atomically without losing existing graph APIs", () => {
  const program = flow().layoutFlow({ id: "dag", method: "dag" }), snapshot = serializeProgram(program), trace = program.trace;
  for (const run of [
    () => program.editFlowData({}), () => program.editFlowData({ definition: { value: undefined } }),
    () => program.editFlowData({ definition: { directed: false } }), () => program.editGraphData({ target: "flow", definition: { weight: "value" } }),
    () => program.layoutGraph({ id: "wrong", method: "dag" }), () => program.layoutFlow({ id: "wrong", method: "fixed" }),
    () => program.reviseData({ source: "links", id: "negative", values: links.map(row => ({ ...row, value: -1 })) }),
    () => program.reviseData({ source: "links", id: "cycle", values: [...links, { id: "ca", source: "c", target: "a", value: 0 }] }),
    () => program.removeResource({ kind: "graph", id: "flow" })
  ]) { assert.throws(run); assert.equal(serializeProgram(program), snapshot); assert.equal(program.trace, trace); }
  const ordinary = tables().createGraphData({ id: "ordinary", nodes: "nodes", edges: "links", nodeKey: "id", source: "source", target: "target", weight: "value", directed: true });
  assert.equal(get(ordinary.layoutFlow({ id: "flow", method: "dag" }), "layout", "flow").result.edges.length, 2);
});

test("cyclic layouts retain loops and parallel edges and restore every routed attachment", () => {
  const program = chart().createData({ id: "nodes", values: values.slice(0, 2) })
    .createData({ id: "links", values: [
      { id: "ab1", source: "a", target: "b", value: 1 }, { id: "ab2", source: "a", target: "b", value: 2 },
      { id: "ba", source: "b", target: "a", value: 3 }, { id: "aa", source: "a", target: "a", value: 0 }
    ] }).createFlowData({ id: "flow", nodes: "nodes", edges: "links", nodeKey: "id", edgeKey: "id", source: "source", target: "target", value: "value", selfLoops: true, balance: "strict" })
    .layoutFlow({ id: "layout", method: "cyclic" });
  const result = get(program, "layout", "layout").result;
  assert.deepEqual(result.edges.map(edge => edge.route), ["feedback", "feedback", "feedback", "loop"]);
  assert.equal(result.edges[3].thickness, 0);
  assert.deepEqual(deserializeProgram(serializeProgram(program)).semanticSpec, program.semanticSpec);
});

test("restore rejects forged flow summary, membership, scale, attachment and lane values", () => {
  const program = flow().layoutFlow({ id: "layout", method: "dag" });
  const envelope = JSON.parse(serializeProgram(program)), state = decodeValue(envelope.payload);
  for (const mutate of [
    state => { get(state, "graph", "flow").result.diagnostics.flow.nodes[1].imbalance = 1; },
    state => { get(state, "graph", "flow").options.flow.balance = "auto"; },
    state => { get(state, "layout", "layout").result.nodes[0].y = -10; },
    state => { get(state, "layout", "layout").result.nodes[0].height += 1; },
    state => { get(state, "layout", "layout").result.scale += 1; },
    state => { get(state, "layout", "layout").result.edges[0].source.y += 1; },
    state => { get(state, "layout", "layout").result.edges[0].route = "loop"; },
    state => { get(state, "layout", "layout").result.columns[0].keys = []; },
    state => { get(state, "layout", "layout").result.components.pop(); },
    state => { get(state, "layout", "layout").result.bounds.right += 1; },
    state => { get(state, "layout", "layout").inputs[0].revision += 1; }
  ]) {
    const changed = structuredClone(state); mutate(changed);
    assert.throws(() => deserializeProgram(JSON.stringify({ ...envelope, payload: encodeValue(changed) })));
  }
});

test("flow targets infer only eligible resources and composition edits preserve siblings", () => {
  const child = flow().layoutFlow({ id: "layout", method: "dag" }).createCanvas({ width: 200, height: 160 });
  const composition = hconcat({ programs: [{ id: "left", program: child }, { id: "right", program: child }] });
  const next = composition.editFlowData({ target: { childPath: ["left"], id: "flow" }, definition: { balance: "strict" } });
  assert.equal(get(next.children.left, "graph", "flow").revision, 1);
  assert.equal(next.children.right, child);
  const second = child.createFlowData({ id: "other", nodes: "nodes", edges: "links", nodeKey: "id", source: "source", target: "target", value: "value" });
  assert.equal(get(second.editFlowData({ definition: { balance: "strict" } }), "graph", "other").revision, 1);
  const ambiguous = second._clone({ context: { ...second.context, currentResources: {} } });
  assert.throws(() => ambiguous.editFlowData({ definition: { balance: "strict" } }), /explicit graph/);
});

test("flow input-role edits are explicit and reject duplicate or undefined authoring", () => {
  const program = flow().layoutFlow({ id: "layout", method: "dag" }), before = serializeProgram(program);
  const candidates = [
    () => program.createFlowData({ id: "flow", nodes: "nodes", edges: "links", nodeKey: "id", source: "source", target: "target", value: "value" }),
    () => program.layoutFlow({ id: "layout", method: "dag" }),
    () => program.layoutFlow({ id: "extra", method: "dag", options: undefined }),
    () => program.editFlowData({ target: "flow", nodes: undefined }),
    () => program.createFlowData(), () => program.layoutFlow(), () => program.editFlowData()
  ];
  for (const run of candidates) { assert.throws(run); assert.equal(serializeProgram(program), before); }
  const alternate = program.createData({ id: "newNodes", values, keyField: "id" })
    .createData({ id: "newLinks", values: links.map(row => ({ ...row, value: 2 })), keyField: "id" })
    .editFlowData({ target: "flow", nodes: "newNodes", edges: "newLinks" });
  assert.deepEqual(get(alternate, "graph", "flow").inputs.map(ref => ref.id), ["newNodes", "newLinks"]);
  assert.equal(get(alternate, "layout", "layout").result.edges[0].value, 2);
  assert.equal(serializeProgram(program), before);
});
