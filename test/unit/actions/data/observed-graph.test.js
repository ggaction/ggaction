import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { encodeValue, decodeValue } from "../../../../src/persistence/codec.js";
import { collectResourceReferences } from "../../../../src/core/resourceReferences.js";
import { validateProgramState } from "../../../../src/persistence/validation.js";
import { encodeRowKey } from "../../../../src/core/itemIdentity.js";
import { resolveGraphResource } from "../../../../src/selectors/graphs.js";

const nodeValues = [{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }];
const edgeValues = [{ id: "first", from: "a", to: "b", weight: 0 }, { id: "second", from: "a", to: "b", weight: 2 }];
const create = { id: "network", nodes: "nodes", edges: "edges", nodeKey: "id", source: "from", target: "to", weight: "weight", attributes: ["label"] };
const base = () => chart().createData({ id: "nodes", values: nodeValues, keyField: "id" }).createData({ id: "edges", values: edgeValues, keyField: "id" });
const graph = program => program.semanticSpec.resources.find(resource => resource.kind === "graph");

test("observed graph authorship stores exact data roles and a frozen common model without graphics", () => {
  const before = base(), next = before.createGraphData(create), resource = graph(next);
  assert.equal(resource.kind, "graph"); assert.equal(resource.revision, 0);
  assert.deepEqual(resource.options.roles, { nodes: 0, edges: 1 });
  assert.equal(resource.result.diagnostics, null);
  assert.deepEqual(resource.result.model.edges.map(edge => [edge.weight, edge.origin, edge.ruleId]), [[0, "observed", null], [2, "observed", null]]);
  assert.deepEqual(resource.result.model.nodes.map(node => node.attributes.label), ["Alpha", "Beta"]);
  assert.deepEqual(resource.provenance.sourceRows.map(row => [row.data, row.role]), [["nodes", "node"], ["nodes", "node"], ["edges", "edge"], ["edges", "edge"]]);
  assert.equal(next.graphicSpec, before.graphicSpec);
  assert.equal(before.semanticSpec.resources.length, 0);
  assert.ok(Object.isFrozen(resource.result.model.edges[0]));
  assert.equal(next.trace.children.at(-1).op, "createGraphData");
  assert.equal(next.trace.children.at(-1).children[0].op, "editSemantic");
  validateProgramState(next, "program");
  assert.equal(typeof basicChart().createGraphData, "undefined");
  assert.throws(() => basicChart().editSemantic({ property: "resource[graph:network]", value: resource }), /not registered/);
});

test("observed graph edits preserve existing programs and explicit edge identity across table revisions", () => {
  const before = base().createGraphData({ ...create, edgeKey: "id" }), snapshot = serializeProgram(before);
  const after = before.editGraphData({ definition: { directed: true, attributes: [] } });
  assert.equal(graph(after).revision, 1);
  assert.equal(graph(before).revision, 0);
  assert.equal(graph(before).result.model.directed, false);
  assert.equal(graph(after).result.model.directed, true);
  assert.deepEqual(graph(after).result.model.edges.map(edge => edge.key), graph(before).result.model.edges.map(edge => edge.key));
  assert.equal(serializeProgram(before), snapshot);
  const revised = before.reviseData({ source: "edges", id: "newEdges", values: [edgeValues[1], { ...edgeValues[0], weight: 3 }] });
  assert.equal(graph(revised).revision, 1);
  assert.equal(graph(revised).inputs[1].id, "newEdges");
  assert.deepEqual(graph(revised).result.model.edges.map(edge => [edge.key, edge.weight]), [[encodeRowKey("second"), 2], [encodeRowKey("first"), 3]]);
  validateProgramState(revised, "program");
});

test("persisted occurrence identity follows row keys through reorder and graph provenance follows both data roles", () => {
  const before = base().createGraphData(create), keys = graph(before).result.model.edges.map(edge => edge.key);
  const revisedEdges = before.reviseData({ source: "edges", id: "reordered", values: [...edgeValues].reverse() });
  assert.deepEqual(graph(revisedEdges).result.model.edges.map(edge => edge.key), [...keys].reverse());
  const revised = revisedEdges.reviseData({ source: "nodes", id: "renamed", values: nodeValues.map(row => ({ ...row, label: row.label + "!" })) });
  assert.equal(graph(revised).revision, 2);
  assert.deepEqual(graph(revised).result.model.nodes.map(node => node.attributes.label), ["Alpha!", "Beta!"]);
  assert.ok(graph(revised).provenance.sourceRows.every(row => ["renamed", "reordered"].includes(row.data)));
  assert.equal(collectResourceReferences(revised, { kind: "data", id: "renamed" }).length > 0, true);
  assert.throws(() => revised.removeData({ id: "renamed" }), /referenced|depend|resource/i);
});

test("one dataset can explicitly fill both observed graph input roles without duplicate dependencies", () => {
  const data = [{ id: "a", from: "a", to: "b" }, { id: "b", from: "b", to: "a" }];
  const program = chart().createData({ id: "rows", values: data, keyField: "id" }).createGraphData({ id: "both", nodes: "rows", edges: "rows", nodeKey: "id", source: "from", target: "to" });
  assert.equal(graph(program).inputs.length, 1);
  assert.deepEqual(graph(program).options.roles, { nodes: 0, edges: 0 });
  const revised = program.reviseData({ source: "rows", id: "next", values: [...data].reverse() });
  assert.equal(graph(revised).revision, 1);
  assert.equal(graph(revised).inputs.length, 1);
  validateProgramState(revised, "program");
});

test("compound endpoint fields stay data values while the editor uses a separate graph target", () => {
  const program = chart().createData({ id: "nodes", values: [{ family: "x", number: 1 }, { family: "y", number: 2 }] })
    .createData({ id: "edges", values: [{ sf: "x", sn: 1, tf: "y", tn: 2, alternate: "x", alternateNumber: 1 }] })
    .createGraphData({ id: "network", nodes: "nodes", edges: "edges", nodeKey: ["family", "number"], source: ["sf", "sn"], target: ["tf", "tn"], selfLoops: true });
  assert.equal(graph(program).result.model.edges[0].targetKey, encodeRowKey(["y", 2]));
  const edited = program.editGraphData({ target: "network", definition: { target: ["alternate", "alternateNumber"] } });
  assert.equal(graph(edited).result.model.edges[0].targetKey, encodeRowKey(["x", 1]));
  assert.equal(graph(program).result.model.edges[0].targetKey, encodeRowKey(["y", 2]));
});

test("observed graph snapshots restore with checked source bindings and support subsequent edits", () => {
  const before = base().createGraphData(create), text = serializeProgram(before), restored = deserializeProgram(text);
  assert.deepEqual(restored.semanticSpec, before.semanticSpec);
  assert.equal(graph(restored.editGraphData({ definition: { directed: true } })).revision, 1);
  const envelope = JSON.parse(text), state = decodeValue(envelope.payload);
  const mutations = [
    resource => { resource.options.roles.edges = 0; },
    resource => { resource.result.diagnostics = {}; },
    resource => { resource.result.model.nodes[0].attributes.label = "forged"; },
    resource => { resource.result.model.edges[0].weight = 100; },
    resource => { resource.provenance.sourceRows[0].role = "edge"; },
    resource => { delete resource.options.definition.selfLoops; },
    resource => { resource.result.model.nodes[0].sourceRows = [1]; },
    resource => { resource.provenance.origin = "inferred"; },
    resource => { resource.ownership = { mode: "generated", owner: resource.inputs[0] }; },
    resource => { resource.options.roles.extra = 0; },
    resource => { resource.options = {}; },
    resource => { resource.inputs = []; },
    resource => { resource.result.model.selfLoops = true; },
    resource => {
      resource.result.model.edges = [];
      resource.result.model.adjacency.forEach(node => { node.incoming = []; node.outgoing = []; node.neighbors = []; });
    }
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(state); mutate(changed.semanticSpec.resources[0]);
    assert.throws(() => deserializeProgram(JSON.stringify({ ...envelope, payload: encodeValue(changed) })));
  }
});

test("invalid graph creation, edits and data revisions fail atomically", () => {
  const before = base().createGraphData(create), snapshot = serializeProgram(before), trace = before.trace;
  for (const operation of [
    () => before.createGraphData(create),
    () => before.editGraphData({}),
    () => before.editGraphData({ definition: {} }),
    () => before.editGraphData({ definition: undefined }),
    () => before.editGraphData({ target: "missing", definition: { directed: true } }),
    () => before.editGraphData({ definition: { directed: undefined } }),
    () => before.editGraphData({ definition: { source: "missing" } }),
    () => before.editGraphData({ nodes: "missing" }),
    () => before.editGraphData({ definition: { attributes: null } }),
    () => before.reviseData({ source: "nodes", id: "incomplete", values: [nodeValues[0]] }),
    () => before.reviseData({ source: "edges", id: "invalid", values: [{ ...edgeValues[0], weight: Infinity }] })
  ]) { assert.throws(operation); assert.equal(serializeProgram(before), snapshot); assert.equal(before.trace, trace); }
  assert.throws(() => base().createGraphData({ ...create, nodes: undefined }));
  const two = before.createGraphData({ ...create, id: "other" });
  const noCurrent = two._clone({ context: { ...two.context, currentResources: {} } });
  assert.throws(() => noCurrent.editGraphData({ definition: { directed: true } }), /explicit graph/);
  assert.equal(noCurrent.editGraphData({ target: "network", definition: { directed: true } }).semanticSpec.resources[0].revision, 1);
});

test("graph target inference uses a current or unique eligible resource and rejects wrong origins", () => {
  assert.throws(() => base().editGraphData({ definition: { directed: true } }), /explicit graph/);
  const before = base().createGraphData(create), resource = graph(before);
  const noCurrent = before._clone({ context: { ...before.context, currentResources: {} } });
  assert.equal(resolveGraphResource(noCurrent), resource);
  assert.equal(resolveGraphResource(noCurrent, undefined, "observed"), resource);
  assert.throws(() => resolveGraphResource(before, "network", "inferred"), /origin/);
});

test("graph edits use explicit child scope and preserve same-named siblings", () => {
  const left = base().createGraphData(create).createCanvas({ width: 120, height: 100 });
  const right = base().createGraphData(create).createCanvas({ width: 120, height: 100 });
  const original = hconcat({ programs: [{ id: "left", program: left }, { id: "right", program: right }] });
  assert.throws(() => original.editGraphData({ target: "network", definition: { directed: true } }), /composition|scope/);
  const revised = original.editGraphData({ target: { childPath: ["left"], id: "network" }, definition: { directed: true } });
  assert.equal(graph(revised.children.left).result.model.directed, true);
  assert.equal(graph(original.children.left).result.model.directed, false);
  assert.equal(revised.children.right, right);
  assert.deepEqual(deserializeProgram(serializeProgram(revised)).semanticSpec, revised.semanticSpec);
});

test("graphs follow materialized derived owners after source revision", () => {
  const before = base().filterData({ source: "edges", id: "selected", field: "weight", range: { min: 0, max: 10 } })
    .createGraphData({ ...create, edges: "selected", edgeKey: "id" });
  const revised = before.reviseData({ source: "edges", id: "revisedEdges", values: [{ ...edgeValues[0], weight: 4 }, edgeValues[1]] });
  const resource = graph(revised);
  assert.equal(resource.revision, 1);
  assert.notEqual(resource.inputs[1].id, graph(before).inputs[1].id);
  assert.deepEqual(resource.result.model.edges.map(edge => edge.weight), [4, 2]);
  validateProgramState(revised, "program");
});
