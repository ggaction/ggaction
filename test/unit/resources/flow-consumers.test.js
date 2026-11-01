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
import { createInteractionSession } from "../../../src/interaction.js";
import { createFlowInspection, flowInspectionEdges, readFlowInspection, describeFlowInspection } from "../../support/flow-inspection.js";
const expression = root => ({ version: 2, registry: "standard@1", root });
const raw = [{ id: "ab", source: "a", target: "b", value: 3 }, { id: "ac", source: "a", target: "c", value: 1 }];
const response = values => ({ text: JSON.stringify(values), mimeType: "application/json", encoding: "utf-8" });
const resource = (p, kind) => p.semanticSpec.resources.find(r => r.kind === kind);

test("flow highlight keeps body strokes separate from label appearance through revisions and restore", () => {
  const original = createFlow();
  const snapshot = serializeProgram(original);
  for (const target of ["flowNodes", "flowLinks"]) {
    const changed = original.highlightMarks({ id: "chosen", target, select: { field: "value", op: "gt", value: 0 },
      stroke: "red", strokeWidth: 4, fill: "green", opacity: 0, offset: { x: 2, y: 3 } });
    const children = changed.graphicSpec.objects[target].items;
    for (const child of children) {
      assert.equal(child.properties.fill, "green");
      assert.equal(child.properties.opacity, 0);
      if (child.identity.role === "label") {
        assert.equal(Object.hasOwn(child.properties, "stroke"), false);
        assert.equal(Object.hasOwn(child.properties, "strokeWidth"), false);
      } else {
        assert.equal(child.properties.stroke, "red");
        assert.equal(child.properties.strokeWidth, 4);
      }
    }
    const restored = deserializeProgram(serializeProgram(changed)).editLayout({ options: { nodeWidth: 20 } });
    assert.equal(renderToSVG(deserializeProgram(serializeProgram(restored))), renderToSVG(restored));
    assert.ok(restored.graphicSpec.objects[target].items.filter(child => child.identity.role === "body")
      .every(child => child.properties.stroke === "red"));
  }
  assert.equal(serializeProgram(original), snapshot);
});

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

for (const method of ["dag", "cyclic"]) test(`flow ${method} inspection keeps tooltip meaning, typed adjacency and exact original rows`, () => {
  const original = createFlowInspection(method), before = serializeProgram(original);
  const session = createInteractionSession({ program: original });
  try {
    session.dispatch({ type: "inspect", point: method === "dag" ? { x: 30, y: 100 } : { x: 92, y: 95 } });
    const node = readFlowInspection(session.getState());
    assert.equal(node.hit.ownerId, "flowNodes"); assert.equal(node.hit.role, "node");
    assert.deepEqual(node.accessible.fields, { id: 1, name: "Input", key: 1, value: 4,
      incoming: method === "dag" ? 0 : 2, outgoing: 4, imbalance: method === "dag" ? -4 : -2 });
    assert.deepEqual(node.adjacency, { incoming: method === "dag" ? [] : ["ba"], outgoing: ["ab", "ac"], neighbors: ["1", "end"] });
    assert.deepEqual(node.originalRows, [{ id: 1, name: "Input" }]);
    assert.equal(node.item.rows[0].data, "nodes"); assert.equal(node.item.rows[0].index, 0);
    assert.equal(node.item.rows[0].rowKey, '["scalar",[["number",1]]]');
    assert.equal(describeFlowInspection(node), `Input: flow 4; incoming ${method === "dag" ? 0 : 2}; outgoing 4; neighbors ["1","end"].`);

    session.dispatch({ type: "inspect", point: method === "dag" ? { x: 120, y: 78 } : { x: 120, y: 35 } });
    const link = readFlowInspection(session.getState());
    assert.equal(link.hit.ownerId, "flowLinks"); assert.equal(link.hit.role, "link");
    assert.equal(link.hit.itemKey, link.item.key); assert.equal(link.item.key, link.accessible.key);
    assert.deepEqual(link.accessible.fields, { id: "ab", s: 1, t: "1", amount: 3, note: "primary", source: 1, target: "1", value: 3 });
    assert.deepEqual(link.adjacency, { source: 1, target: "1" });
    assert.deepEqual(link.originalRows, [flowInspectionEdges[0]]);
    assert.equal(link.item.rows[0].data, "edges"); assert.equal(link.item.rows[0].index, 0);
    assert.equal(link.item.rows[0].rowKey, '["scalar",[["string","ab"]]]');
    assert.deepEqual(link.hit.resourceRefs, [{ kind: "layout", id: "layout", revision: 0 }]);
    assert.equal(describeFlowInspection(link), 'ab: 1 to "1"; flow 3.');

    if (method === "cyclic") {
      session.dispatch({ type: "inspect", point: { x: 92, y: 169 } });
      const reverse = readFlowInspection(session.getState());
      assert.deepEqual(reverse.adjacency, { source: "1", target: 1 });
      assert.deepEqual(reverse.originalRows, [{ id: "ba", s: "1", t: 1, amount: 2, note: "return" }]);
      assert.equal(describeFlowInspection(reverse), 'ba: "1" to 1; flow 2.');
    }
    assert.equal(serializeProgram(original), before);
  } finally { session.destroy(); }
});

test("flow tooltip source lookup follows reordered revisions and editable restore without retaining old values", () => {
  const original = createFlowInspection(), before = serializeProgram(original);
  const session = createInteractionSession({ program: original });
  try {
    session.dispatch({ type: "inspect", point: { x: 120, y: 78 } });
    const key = readFlowInspection(session.getState()).item.key;
    const revised = original.reviseData({ source: "edges", id: "nextEdges",
      values: [...flowInspectionEdges].reverse().map(row => ({ ...row, amount: row.amount * 2 })) });
    const restored = deserializeProgram(serializeProgram(revised));
    session.updateProgram(restored);
    const link = getMarkItems(restored, { target: "flowLinks" }).find(item => item.fields.id === "ab");
    // The ribbon starts at x=40. Its source-side interval supplies an interior point
    // after the authored edge order changed; no key or endpoint is rewritten.
    const commands = link.geometry[0].properties.commands;
    const upper = commands[0].y, lower = commands.at(-2).y;
    session.dispatch({ type: "inspect", point: { x: 50, y: (upper + lower) / 2 } });
    const current = readFlowInspection(session.getState());
    assert.equal(current.item.key, key);
    assert.equal(current.accessible.fields.value, 6);
    assert.deepEqual(current.originalRows, [{ ...flowInspectionEdges[0], amount: 6 }]);
    assert.equal(current.item.rows[0].data, "nextEdges"); assert.equal(current.item.rows[0].index, 1);
    assert.equal(current.item.rows[0].revision, 1);
    assert.deepEqual(current.hit.resourceRefs, [{ kind: "layout", id: "layout", revision: 1 }]);
    assert.equal(describeFlowInspection(current), 'ab: 1 to "1"; flow 6.');
    assert.equal(serializeProgram(original), before);
  } finally { session.destroy(); }
});
