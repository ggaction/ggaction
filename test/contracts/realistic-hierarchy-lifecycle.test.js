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
const witnesses = new Map(["createHierarchyData", "editHierarchyData", "layoutHierarchy", "editLayout", "removeResource", "createTreePlot", "editTreePlot", "createTreemapPlot", "editTreemapPlot"].map(name => [name, new Set()]));
for (const dataset of datasets) for (const recipe of ["vertical", "radial", "treemap"]) {
  test(`${dataset} ${recipe} hierarchy retains source contributions through edits and removal`, () => {
    try {
      const view = realisticRecordView(dataset, { rowLimit: 24, groupLimit: 4 });
      const rows = view.rows.filter(row => row.value >= 0).map(row => ({ id: row.key, category: row.category, value: row.value, sourceRowIndex: row.sourceRowIndex }));
      assert.ok(rows.length >= 4, `${dataset}: nonnegative observed measures`);
      assert.ok(rows.every(row => view.provenance.sourceRowIndexes.includes(row.sourceRowIndex)));
      const options = recipe === "treemap" ? { size: [420, 300], padding: 4, method: "squarify" }
        : { nodeSize: [12, 12], siblingGap: 4, depthGap: 70, orientation: recipe,
          ...(recipe === "radial" ? { radius: 120, startAngle: 0, sweep: 360 } : {}) };
      const base = chart().createCanvas({ width: 520, height: 400, margin: 30 }).createData({ id: "rows", values: rows, keyField: "id" })
        .createHierarchyData({ id: "hierarchy", groupFields: ["category", "id"], value: "value" })
        .layoutHierarchy({ id: "layout", method: recipe === "treemap" ? "treemap" : "tree", options });
      const p = recipe === "treemap" ? base.createTreemapPlot({ id: "plot", labels: {} }).editTreemapPlot({ cells: { opacity: .8 } })
        : base.createTreePlot({ id: "plot", labels: {} }).editTreePlot({ nodes: { radius: 5 }, links: { strokeWidth: 2 } });
      const original = serializeProgram(p), total = rows.reduce((sum, row) => sum + row.value, 0);
      const h = p.semanticSpec.resources.find(resource => resource.kind === "hierarchy");
      assert.ok(Math.abs(h.result.totalValue - total) <= Math.max(1, total) * 1e-12);
      assert.deepEqual(h.result.nodes.filter(node => !node.childrenKeys.length).flatMap(node => node.sourceRows).sort((a, b) => a - b), rows.map((_, index) => index));
      const ids = getMarkItems(p, { target: "plot" }).map(item => item.key).sort();
      const edited = p.editHierarchyData({ target: "hierarchy", maxNodes: 500 })
        .editLayout({ target: "layout", order: { by: "value", direction: "descending" } });
      assert.deepEqual(getMarkItems(edited, { target: "plot" }).map(item => item.key).sort(), ids);
      const restored = deserializeProgram(serializeProgram(edited));
      const revised = restored.reviseData({ source: "rows", id: "next", values: rows.map(row => ({ ...row, value: row.value * 2 })) });
      assert.ok(Math.abs(revised.semanticSpec.resources.find(resource => resource.kind === "hierarchy").result.totalValue - total * 2) <= Math.max(1, total) * 2e-12);
      assertGraphicIntegrity(revised, `${dataset}/${recipe}`); assertSvgIntegrity(renderToSVG(revised), `${dataset}/${recipe}`);
      assert.equal(serializeProgram(deserializeProgram(serializeProgram(revised))), serializeProgram(revised));
      assert.equal(serializeProgram(p), original);
      const removed = revised.removeMark({ target: "plot" }).removeResource({ kind: "layout", id: "layout" }).removeResource({ kind: "hierarchy", id: "hierarchy" });
      assert.deepEqual(removed.semanticSpec.resources, []);
      for (const entry of removed.trace.children) if (witnesses.has(entry.op)) witnesses.get(entry.op).add(dataset);
    } finally { releaseTidyTuesdaySourceCache(dataset); }
  });
}
test("every hierarchy public action has at least five direct authentic dataset witnesses", () => {
  for (const [action, ids] of witnesses) assert.equal(ids.size, 5, action);
});
