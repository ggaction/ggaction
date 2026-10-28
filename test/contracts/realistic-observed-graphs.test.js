import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { realisticRecordView } from "../support/scenarios/realistic-data.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";

const datasets = ["tt-penguins", "tt-london-marathon-winners", "tt-astronauts", "tt-us-births", "tt-chocolate-ratings"];

for (const dataset of datasets) test(`observed category membership graph retains ${dataset} records through revisions`, () => {
  try {
    const view = realisticRecordView(dataset, { rowLimit: 32, groupLimit: 8 });
    assert.ok(view.rows.length >= 4);
    assert.equal(view.provenance.sourceDataset, dataset);
    // This projection records observed row-to-category membership. It makes no
    // similarity or causal claim about relationships among the source records.
    const categories = [...new Set(view.rows.map(row => String(row.category)))];
    const nodes = [
      ...categories.map(category => ({ role: "category", name: category, category })),
      ...view.rows.map(row => ({ role: "record", name: row.key, category: String(row.category) }))
    ];
    const edges = view.rows.map(row => ({ id: row.key, fromRole: "record", fromName: row.key,
      toRole: "category", toName: String(row.category), value: row.value, sourceRowIndex: row.sourceRowIndex }));
    const source = chart().createData({ id: "nodes", values: nodes, keyFields: ["role", "name"] })
      .createData({ id: "memberships", values: edges, keyField: "id" })
      .createGraphData({ id: "membership", nodes: "nodes", edges: "memberships", nodeKey: ["role", "name"],
        source: ["fromRole", "fromName"], target: ["toRole", "toName"], weight: "value", attributes: ["role", "name", "category"] });
    const resource = program => program.semanticSpec.resources.find(item => item.kind === "graph");
    const model = resource(source).result.model;
    assert.equal(model.nodes.length, categories.length + view.rows.length);
    assert.equal(model.edges.length, view.rows.length);
    const indexed = new Map(model.nodes.map(node => [node.key, node]));
    model.edges.forEach((edge, index) => {
      assert.deepEqual([indexed.get(edge.sourceKey).attributes.role, indexed.get(edge.targetKey).attributes.role], ["record", "category"]);
      assert.equal(indexed.get(edge.sourceKey).attributes.name, edges[index].id);
      assert.equal(indexed.get(edge.targetKey).attributes.name, edges[index].toName);
      assert.equal(edge.weight, edges[index].value);
      assert.deepEqual(edge.sourceRows, [index]);
    });
    const saved = serializeProgram(source);
    const directed = source.editGraphData({ target: "membership", definition: { directed: true } });
    assert.equal(resource(directed).result.model.directed, true);
    const revised = directed.reviseData({ source: "memberships", id: "reordered", values: [...edges].reverse() });
    assert.deepEqual(resource(revised).result.model.edges.map(edge => edge.key), model.edges.map(edge => edge.key).reverse());
    assert.deepEqual(resource(revised).result.model.edges.map(edge => edge.weight), edges.map(edge => edge.value).reverse());
    assert.equal(resource(revised).revision, 2);
    const restored = deserializeProgram(serializeProgram(revised));
    assert.deepEqual(resource(restored), resource(revised));
    assert.ok(resource(restored).provenance.sourceRows.filter(row => row.role === "edge").every(row => row.data === "reordered"));
    assert.equal(serializeProgram(source), saved);
    assert.equal(source.trace.children.at(-1).op, "createGraphData");
    assert.equal(directed.trace.children.at(-1).op, "editGraphData");
  } finally { releaseTidyTuesdaySourceCache(dataset); }
});
