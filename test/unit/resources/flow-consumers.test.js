import assert from "node:assert/strict";
import test from "node:test";
import { chart, prepareDataUpdate } from "../../../src/index.js";
import { createFlow } from "../../../examples/flow-layouts/program.js";
import { inspectProgram, comparePrograms, getMarkItems, describeAction } from "../../../src/inspection.js";
import { exportAccessibleData } from "../../../src/accessibility.js";
import { createTransitionScene } from "../../../src/scene.js";
import { resolveMarkSourceItems } from "../../../src/materialization/selection/policies/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
const expression = root => ({ version: 2, registry: "standard@1", root });
const raw = [{ id: "ab", source: "a", target: "b", value: 3 }, { id: "ac", source: "a", target: "c", value: 1 }];
const response = values => ({ text: JSON.stringify(values), mimeType: "application/json", encoding: "utf-8" });
const resource = (p, kind) => p.semanticSpec.resources.find(r => r.kind === kind);

async function preparedFlow() {
  let p = chart().createCanvas().createData({ id: "nodes", values: [{ id: "a" }, { id: "b" }, { id: "c" }], keyField: "id" })
    .createParameter({ id: "gain", value: 2 });
  const prepared = await prepareDataUpdate(p, { kind: "create", id: "raw", keyField: "id", source: { kind: "url", url: "https://example.test/flows.json", format: "json" } },
    { requestToken: "initial", load: async () => response(raw) });
  p = p.applyDataUpdate({ prepared, requestToken: "initial" })
    .createComputedData({ id: "weighted", source: "raw", as: "amount", expression: expression({ type: "binary", op: "multiply", left: { type: "field", name: "value" }, right: { type: "parameter", id: "gain" } }) })
    .createFlowData({ id: "flow", nodes: "nodes", edges: "weighted", nodeKey: "id", source: "source", target: "target", value: "amount" })
    .layoutFlow({ id: "layout", method: "dag" }).createFlowLinks().createFlowNodes({ labels: { content: "value" } });
  return p.highlightMarks({ id: "picked", target: "flowLinks", select: { field: "target", op: "eq", value: "c" }, fill: "red" });
}

test("flow prepared sources and parameter computations refresh one exact closure after offline restore", async () => {
  const original = await preparedFlow(), snapshot = serializeProgram(original), restored = deserializeProgram(snapshot);
  const prepared = await prepareDataUpdate(restored, { kind: "revise", target: "raw", id: "raw2" },
    { requestToken: "next", load: async () => response(raw.map(row => ({ ...row, value: row.value * 2 }))) });
  const changed = restored.applyDataUpdate({ prepared, requestToken: "next" });
  assert.equal(resource(changed, "graph").revision, 1); assert.equal(resource(changed, "layout").revision, 1);
  assert.deepEqual(getMarkItems(changed, { target: "flowLinks" }).map(item => item.fields.value), [12, 4]);
  assert.equal(getMarkItems(changed, { target: "flowLinks" })[1].geometry[0].properties.fill, "red");
  const adjusted = changed.editParameter({ target: "gain", value: 3 });
  assert.deepEqual(getMarkItems(adjusted, { target: "flowLinks" }).map(item => item.fields.value), [18, 6]);
  assert.equal(resource(adjusted, "layout").revision, 2);
  assert.equal(renderToSVG(deserializeProgram(serializeProgram(adjusted))), renderToSVG(adjusted));
  assert.equal(serializeProgram(original), snapshot); assert.equal(serializeProgram(restored), snapshot);
});

test("flow invalid prepared and parameter revisions preserve previous state and trace", async () => {
  const original = await preparedFlow(), snapshot = serializeProgram(original), trace = original.trace;
  const prepared = await prepareDataUpdate(original, { kind: "revise", target: "raw", id: "invalid" },
    { requestToken: "bad", load: async () => response(raw.map(row => ({ ...row, target: "missing" }))) });
  assert.throws(() => original.applyDataUpdate({ prepared, requestToken: "bad" }), /endpoint/);
  assert.throws(() => original.editParameter({ target: "gain", value: -1 }), /nonnegative/);
  assert.equal(serializeProgram(original), snapshot); assert.equal(original.trace, trace);
});

test("flow inspection and accessible rows distinguish final nodes, links and labels", () => {
  const p = createFlow(), report = inspectProgram(p), nodes = report.views.find(v => v.owner.id === "flowNodes"), links = report.views.find(v => v.owner.id === "flowLinks");
  assert.equal(nodes.logicalDataItems, 3); assert.equal(nodes.drawablePrimitives, 6); assert.equal(nodes.rawRows, 3);
  assert.equal(links.logicalDataItems, 2); assert.equal(links.drawablePrimitives, 2);
  assert.deepEqual(nodes.sourceRefs.map(r => r.kind), ["layout", "graph", "data"]);
  assert.equal(describeAction(p, { action: "editFlowNodes", target: { kind: "mark", id: "flowNodes" }, options: { labels: false } }).applicability, "supported");
  const source = resolveMarkSourceItems(p, "flowLinks"), concrete = getMarkItems(p, { target: "flowLinks" });
  assert.deepEqual(source.map(item => item.rows), concrete.map(item => item.rows));
  assert.deepEqual(concrete.map(item => [item.fields.source, item.fields.target, item.fields.value]), [["Supply A", "Total", 6], ["Supply B", "Total", 4]]);
  const accessible = exportAccessibleData(p);
  assert.ok(accessible.views.some(view => view.rows.some(row => Object.values(row.values).includes(10))));
  assert.ok(comparePrograms(p, p.editLayout({ options: { nodeWidth: 25 } })).changes.some(change => change.resource.kind === "layout"));
  for (const format of ["svg", "canvas"]) {
    const scene = createTransitionScene(p, { format });
    assert.deepEqual(structuredClone(scene), scene);
    assert.deepEqual(createTransitionScene(deserializeProgram(serializeProgram(p)), { format }), scene);
  }
});

test("zero and empty flow retain source semantics and dormant overrides", () => {
  let p = chart().createCanvas().createData({ id: "n", values: [{ id: "a" }, { id: "b" }], keyField: "id" })
    .createData({ id: "e", values: [{ id: "ab", source: "a", target: "b", value: 0 }], keyField: "id" })
    .createFlowData({ id: "f", nodes: "n", edges: "e", nodeKey: "id", edgeKey: "id", source: "source", target: "target", value: "value" })
    .layoutFlow({ id: "l", method: "dag", options: { nodePadding: 0 } })
    .createFlowLinks({ links: { overrides: [{ key: "ab", fill: "red" }] } }).createFlowNodes({ labels: {} });
  assert.equal(getMarkItems(p, { target: "flowLinks" }).length, 1);
  assert.equal(inspectProgram(p).views.find(v => v.owner.id === "flowLinks").flags.find(f => f.reason === "zero-value").count, 1);
  p = p.reviseData({ source: "e", id: "noEdges", values: [] });
  assert.equal(p.graphicSpec.objects.flowLinks.items.length, 0);
  assert.equal(inspectProgram(p).views.find(v => v.owner.id === "flowLinks").flags.find(f => f.reason === "orphan-style").count, 1);
  p = p.reviseData({ source: "n", id: "empty", values: [] });
  assert.equal(p.graphicSpec.objects.flowNodes.items.length, 0);
  assert.equal(renderToSVG(deserializeProgram(serializeProgram(p))), renderToSVG(p));
});
