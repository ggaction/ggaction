import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { getMarkItems } from "../../src/inspection.js";
import { realisticRecordView } from "../support/scenarios/realistic-data.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";

const datasets = ["tt-penguins", "tt-london-marathon-winners", "tt-astronauts", "tt-us-births", "tt-chocolate-ratings"];
const route = p => p.semanticSpec.resources.find(resource => resource.kind === "edge-route");
for (const dataset of datasets) test(`three route recipes preserve observed record membership for ${dataset}`, () => {
  try {
    const view = realisticRecordView(dataset, { rowLimit: 32, groupLimit: 4 }), rows = view.rows;
    assert.equal(view.provenance.sourceDataset, dataset); assert.ok(rows.length >= 4);
    // Every selected source row contributes to one observed category/dataset
    // membership. Summary provenance retains the complete original membership.
    const categories = [...new Set(rows.map(row => String(row.category)))];
    const nodes = [{ role: "dataset", key: dataset }, ...categories.map(key => ({ role: "category", key }))];
    const records = rows.map(row => ({ ...row, fromRole: "category", from: String(row.category), toRole: "dataset", to: dataset }));
    const base = chart().createCanvas({ width: 400, height: 300 })
      .createData({ id: "nodes", values: nodes, keyFields: ["role", "key"] })
      .createData({ id: "records", values: records, keyField: "key" })
      .createSummaryData({ id: "edges", source: "records", groupBy: ["fromRole", "from", "toRole", "to"], aggregates: [{ op: "sum", field: "value", as: "value" }, { op: "count", as: "count" }] })
      .createGraphData({ id: "memberships", nodes: "nodes", edges: "edges", nodeKey: ["role", "key"], source: ["fromRole", "from"], target: ["toRole", "to"], edgeKey: "from", weight: "value" })
      .layoutGraph({ id: "layout", method: "fixed", options: { positions: nodes.map((node, index) => ({ key: [node.role, node.key], x: node.role === "dataset" ? 200 : 40 + index * 60, y: node.role === "dataset" ? 60 : 220 })) } });
    const edges = base.semanticSpec.datasets.find(value => value.id === "edges").values;
    assert.equal(edges.reduce((sum, edge) => sum + edge.count, 0), rows.length);
    for (const edge of edges) assert.equal(edge.value, rows.filter(row => String(row.category) === edge.from).reduce((sum, row) => sum + row.value, 0));
    const graph = base.semanticSpec.resources.find(resource => resource.kind === "graph"), snapshot = serializeProgram(base);
    for (const method of ["edge-path", "force-directed", "density"]) {
      const p = base.bundleGraphEdges({ id: "routes", method }).createGraphPlot({ routes: "routes", nodes: { radius: 3 }, edges: { arrows: false } });
      assert.deepEqual(route(p).result.routes.map(value => value.edgeKey), graph.result.model.edges.map(edge => edge.key));
      assert.equal(p.semanticSpec.resources.find(resource => resource.kind === "graph"), graph);
      const items = getMarkItems(p).filter(item => item.fields.kind === "edge");
      assert.equal(items.length, categories.length); assert.deepEqual(items.map(item => item.fields.weight), edges.map(edge => edge.value));
      const q = p.reviseData({ source: "records", id: "reordered", values: [...records].reverse() });
      assert.equal(route(q).revision, 1);
      assert.deepEqual(new Set(route(q).result.routes.map(value => value.edgeKey)), new Set(route(p).result.routes.map(value => value.edgeKey)));
      assert.ok(getMarkItems(q).filter(item => item.fields.kind === "edge").every(item => item.rows.every(row => row.data === "reordered" || row.data.startsWith("edges"))));
      assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
      const selected = q.highlightMarks({ id: "picked", target: "graphPlot", select: { rows: { data: "reordered", indices: [0] } }, stroke: "red" });
      assert.equal(selected.graphicSpec.objects.graphPlot.items.filter(item => item.properties.stroke === "red").length, 1);
    }
    assert.equal(serializeProgram(base), snapshot);
  } finally { releaseTidyTuesdaySourceCache(dataset); }
});
