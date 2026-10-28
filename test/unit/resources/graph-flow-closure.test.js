import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { getMarkItems } from "../../../src/inspection.js";

const nodes = [{ id: "a", label: "A", group: 1 }, { id: "b", label: "B", group: 1 }];
const resource = (p, id) => p.semanticSpec.resources.find(value => value.id === id);
const base = () => chart().createCanvas({ width: 400, height: 240, margin: 0 })
  .createData({ id: "nodes", values: nodes, keyField: "id" })
  .createData({ id: "edges", values: [{ id: "ab", from: "a", to: "b", amount: 3 }], keyField: "id" })
  .createFlowData({ id: "flow", nodes: "nodes", edges: "edges", nodeKey: "id", source: "from", target: "to", edgeKey: "id", value: "amount", attributes: ["label"] })
  .layoutFlow({ id: "sankey", graph: "flow", method: "dag" })
  .createFlowLinks({ id: "links", layout: "sankey" }).createFlowNodes({ id: "boxes", layout: "sankey", labels: { content: { field: "label" } } })
  .layoutGraph({ id: "circular", graph: "flow", method: "circular", options: { radius: 50 } })
  .createGraphPlot({ id: "network", layout: "circular", labels: { field: "label" } })
  .createInferredGraphData({ id: "inferred", data: "nodes", nodeKey: "id", ruleId: "groups", rule: "group", options: { fields: ["group"] } })
  .layoutGraph({ id: "inferredLayout", graph: "inferred", method: "circular", options: { radius: 20 } })
  .createGraphPlot({ id: "inferredPlot", layout: "inferredLayout" });

test("shared graph source revisions refresh flow, observed and inferred plots exactly once", () => {
  const p = base(), snapshot = serializeProgram(p);
  const q = p.reviseData({ source: "nodes", id: "nextNodes", values: nodes.map(row => ({ ...row, label: `${row.label}!` })) });
  for (const id of ["flow", "sankey", "circular", "inferred", "inferredLayout"]) assert.equal(resource(q, id).revision, 1, id);
  for (const id of ["boxes", "network"]) {
    assert.deepEqual(q.graphicSpec.objects[id].items.filter(item => item.type === "text").map(item => item.properties.text), ["A!", "B!"]);
    assert.ok(getMarkItems(q, { target: id }).filter(item => item.fields.kind === "node").every(item => item.rows.every(row => row.data === "nextNodes")));
  }
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
  assert.equal(serializeProgram(p), snapshot);
});

test("flow edits refresh both graph-layout consumers and reject invalid downstream labels atomically", () => {
  const p = base(), snapshot = serializeProgram(p), unchanged = resource(p, "inferredLayout");
  const q = p.reviseData({ source: "edges", id: "nextEdges", values: [{ id: "ab", from: "a", to: "b", amount: 8 }] });
  for (const id of ["flow", "sankey", "circular"]) assert.equal(resource(q, id).revision, 1, id);
  assert.equal(getMarkItems(q, { target: "links" })[0].fields.value, 8);
  assert.equal(getMarkItems(q, { target: "network" }).find(item => item.fields.kind === "edge").fields.weight, 8);
  assert.equal(resource(q, "inferredLayout"), unchanged);
  assert.throws(() => p.editFlowData({ target: "flow", definition: { attributes: [] } }), /label|field|attribute/i);
  assert.equal(serializeProgram(p), snapshot);
});
