import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { getMarkItems } from "../../src/inspection.js";
import { realisticRecordView } from "../support/scenarios/realistic-data.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
const datasets = ["tt-penguins", "tt-london-marathon-winners", "tt-astronauts", "tt-us-births", "tt-chocolate-ratings"];
const actions = ["createFlowData", "editFlowData", "layoutFlow", "createFlowNodes", "editFlowNodes", "createFlowLinks", "editFlowLinks"];
const witnesses = new Map(actions.map(name => [name, new Map()]));
for (const dataset of datasets) for (const recipe of ["dag", "vertical", "cyclic"]) test(`${dataset} ${recipe} flow preserves observed values, identity and all edges`, () => {
  try {
    const view = realisticRecordView(dataset, { rowLimit: 20, groupLimit: 4 });
    const rows = view.rows.filter(row => row.value >= 0);
    assert.ok(rows.length >= 4); assert.equal(view.provenance.sourceDataset, dataset);
    assert.ok(rows.every(row => view.provenance.sourceRowIndexes.includes(row.sourceRowIndex)));
    const categories = [...new Set(rows.map(row => String(row.category)))];
    const nodes = [...rows.map(row => ({ role: "record", name: row.key })), ...categories.map(name => ({ role: "category", name }))];
    // These are observed membership quantities. The cyclic recipe explicitly
    // models the equal return leg; it makes no inferred causal claim.
    const edges = rows.flatMap(row => [{ id: `${row.key}:out`, sourceRole: "record", sourceName: row.key, targetRole: "category", targetName: String(row.category), value: row.value, sourceRowIndex: row.sourceRowIndex },
      ...(recipe === "cyclic" ? [{ id: `${row.key}:back`, sourceRole: "category", sourceName: String(row.category), targetRole: "record", targetName: row.key, value: row.value, sourceRowIndex: row.sourceRowIndex }] : [])]);
    const p = chart().createCanvas({ width: 600, height: 450, margin: 30 })
      .createData({ id: "nodes", values: nodes, keyFields: ["role", "name"] }).createData({ id: "edges", values: edges, keyField: "id" })
      .createFlowData({ id: "flow", nodes: "nodes", edges: "edges", nodeKey: ["role", "name"], source: ["sourceRole", "sourceName"], target: ["targetRole", "targetName"], edgeKey: "id", value: "value", attributes: ["role", "name"], balance: "strict" })
      .layoutFlow({ id: "layout", method: recipe === "cyclic" ? "cyclic" : "dag", options: { orientation: recipe === "vertical" ? "vertical" : "horizontal", iterations: 2, nodePadding: 2,
        order: recipe === "cyclic" ? nodes.map(node => [node.role, node.name]) : recipe === "vertical" ? "barycentric" : "input" } })
      .createFlowLinks({ links: { overrides: [{ key: edges[0].id, fill: "#c2410c" }] } })
      .createFlowNodes({ labels: { content: { field: "name" } } })
      .editFlowNodes({ nodes: { opacity: .9 } }).editFlowLinks({ links: { opacity: .4 } });
    const original = serializeProgram(p), graph = p.semanticSpec.resources.find(r => r.kind === "graph"), layout = p.semanticSpec.resources.find(r => r.kind === "layout");
    assert.equal(layout.result.edges.length, edges.length);
    layout.result.edges.forEach((edge, i) => { assert.equal(edge.value, edges[i].value); assert.equal(edge.thickness, edge.value * layout.result.scale); });
    assert.equal(layout.result.edges.filter(edge => edge.route === "feedback").length, recipe === "cyclic" ? edges.length : 0);
    assert.deepEqual(getMarkItems(p, { target: "flowLinks" }).map(item => item.fields.value), edges.map(edge => edge.value));
    const nodeKeys = getMarkItems(p, { target: "flowNodes" }).map(item => item.key), linkKeys = getMarkItems(p, { target: "flowLinks" }).map(item => item.key);
    const updated = p.editFlowData({ definition: { balance: "allow" } }).editLayout({ options: { laneGap: 4 } });
    assert.deepEqual(getMarkItems(updated, { target: "flowNodes" }).map(item => item.key), nodeKeys);
    const changed = deserializeProgram(serializeProgram(updated)).reviseData({ source: "edges", id: "reordered", values: [...edges].reverse() });
    assert.deepEqual(getMarkItems(changed, { target: "flowLinks" }).map(item => item.key), [...linkKeys].reverse());
    assert.deepEqual(changed.semanticSpec.resources.find(r => r.kind === "graph").result.model.edges.map(edge => edge.key), [...graph.result.model.edges].reverse().map(edge => edge.key));
    assertGraphicIntegrity(changed, `${dataset}/${recipe}`); assertSvgIntegrity(renderToSVG(changed), `${dataset}/${recipe}`);
    assert.equal(serializeProgram(p), original);
    assert.equal(serializeProgram(deserializeProgram(serializeProgram(changed))), serializeProgram(changed));
    const removed = changed.removeMark({ target: "flowNodes" }).removeMark({ target: "flowLinks" }).removeResource({ kind: "layout", id: "layout" }).removeResource({ kind: "graph", id: "flow" });
    assert.deepEqual(removed.semanticSpec.resources, []);
    for (const entry of updated.trace.children) if (witnesses.has(entry.op)) {
      const sets = witnesses.get(entry.op); if (!sets.has(dataset)) sets.set(dataset, new Set()); sets.get(dataset).add(recipe);
    }
  } finally { releaseTidyTuesdaySourceCache(dataset); }
});
test("every flow action has five authentic datasets and three distinct direct recipe witnesses", () => {
  for (const [action, entries] of witnesses) {
    assert.equal(entries.size, 5, action); for (const recipes of entries.values()) assert.equal(recipes.size, 3, action);
  }
});
