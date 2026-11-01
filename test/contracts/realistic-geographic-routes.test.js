import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { realisticRecordView } from "../support/scenarios/realistic-data.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";

const datasets = ["tt-penguins", "tt-london-marathon-winners", "tt-astronauts", "tt-us-births", "tt-chocolate-ratings"];
const witnesses = new Map(["createGeoRouteData", "editGeoRouteData"].map(name => [name, new Map()]));
for (const dataset of datasets) for (const recipe of ["source-revision", "screen-resize", "geographic-interpretation"]) {
  test(`${dataset} ${recipe} route geometry preserves actual measurement rows and edge order`, () => {
    try {
      const view = realisticRecordView(dataset, { rowLimit: 16, groupLimit: 4 });
      const nodes = view.rows.filter(row => Number.isFinite(row.orderNumeric) && Number.isFinite(row.value));
      assert.ok(nodes.length >= 4); assert.equal(view.provenance.sourceDataset, dataset);
      const edges = nodes.slice(1).map((row, i) => ({ key: i % 2 ? String(row.sourceRowIndex) : row.sourceRowIndex, source: nodes[i].key, target: row.key, measurement: row.value, sourceRowIndex: row.sourceRowIndex }));
      const geographic = recipe === "geographic-interpretation";
      const maxX = Math.max(1, ...nodes.map(row => Math.abs(row.orderNumeric))), maxY = Math.max(1, ...nodes.map(row => Math.abs(row.value)));
      const positions = nodes.map(row => ({ key: row.key, x: geographic ? row.orderNumeric / maxX * 140 : row.orderNumeric, y: geographic ? row.value / maxY * 60 : row.value }));
      const p = chart().createCanvas({ width: 320, height: 240, margin: 0 })
        .createData({ id: "nodes", values: nodes, keyField: "key" }).createData({ id: "edges", values: edges, keyField: "key" })
        .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "key", edgeKey: "key", source: "source", target: "target" })
        .layoutGraph({ id: "layout", method: "fixed", options: { positions } })
        .bundleGraphEdges({ id: "routes", method: "edge-path", coordinateSpace: recipe === "screen-resize" ? "screen" : "world" })
        .createGeoRouteData({ id: "mapped", routes: "routes", coordinateKind: geographic ? "geographic" : "planar" })
        .createProjection({ id: "map", type: geographic ? "equirectangular" : "identity", fit: { geometry: "mapped", width: 300, height: 220 } })
        .createCoordinate({ type: "geo" }).createGeoLineMark({ id: "lines" })
        .editGeoRouteData({ target: "mapped", routes: "routes", coordinateKind: geographic ? "geographic" : "planar" });
      const saved = serializeProgram(p);
      const q = recipe === "source-revision" ? p.reviseData({ source: "edges", id: "next", values: [...edges].reverse() }) : recipe === "screen-resize" ? p.editCanvas({ width: 360 }) : p.editProjection({ scalePx: 30 });
      const geometry = q.semanticSpec.resources.find(r => r.id === "mapped"), routes = q.semanticSpec.resources.find(r => r.id === "routes");
      assert.deepEqual(geometry.result.features.map(f => f.geometry.coordinates), routes.result.routes.map(r => r.commands.map(c => [c.x, c.y])));
      assert.equal(geometry.result.features.length, edges.length);
      const expected = recipe === "source-revision" ? [...edges].reverse() : edges;
      const items = getMarkItems(q, { target: "lines" }); assert.equal(items.length, edges.length);
      items.forEach((item, i) => {
        assert.deepEqual([item.fields.sourceKey, item.fields.targetKey], [expected[i].source, expected[i].target]);
        assert.equal(item.rows[0].index, i);
        assert.equal(item.rows[0].data, recipe === "source-revision" ? "next" : "edges");
        assert.ok(view.provenance.sourceRowIndexes.includes(expected[i].sourceRowIndex));
      });
      assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec); assert.equal(serializeProgram(p), saved);
      for (const entry of p.trace.children) if (witnesses.has(entry.op)) {
        assert.equal(entry.args.routes, "routes");
        assert.equal(entry.args.coordinateKind, geographic ? "geographic" : "planar");
        const map = witnesses.get(entry.op); if (!map.has(dataset)) map.set(dataset, new Set()); map.get(dataset).add(recipe);
      }
    } finally { releaseTidyTuesdaySourceCache(dataset); }
  });
}
test("both route geometry actions have five pinned datasets and three actual recipes", () => {
  for (const [name, observed] of witnesses) { assert.equal(observed.size, 5, name); for (const recipes of observed.values()) assert.equal(recipes.size, 3, name); }
});
