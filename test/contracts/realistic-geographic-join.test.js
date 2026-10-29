import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { realisticRecordView } from "../support/scenarios/realistic-data.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";

const datasets = ["tt-penguins", "tt-london-marathon-winners", "tt-astronauts", "tt-us-births", "tt-chocolate-ratings"];
const witnesses = new Map(["createGeoJoinData", "editGeoJoinData"].map(action => [action, new Map()]));
for (const dataset of datasets) for (const recipe of ["source-order", "missing-match", "typed-key"]) {
  test(`${dataset} ${recipe} geographic join preserves authentic table measurements and region correspondence`, () => {
    try {
      const view = realisticRecordView(dataset, { rowLimit: 16, groupLimit: 4 });
      const rows = view.rows.filter(row => Number.isFinite(row.orderNumeric) && Number.isFinite(row.value));
      assert.ok(rows.length >= 4); assert.equal(view.provenance.sourceDataset, dataset);
      const features = rows.map(row => ({ type: "Feature", id: row.key, properties: { code: row.sourceRowIndex },
        geometry: { type: "Point", coordinates: [row.orderNumeric, row.value] } }));
      const table = rows.flatMap((row, i) => recipe === "missing-match" && i % 2 ? [] : [{ code:
        recipe === "typed-key" && i % 2 ? String(row.sourceRowIndex) : row.sourceRowIndex, measurement: row.value, sourceRowIndex: row.sourceRowIndex }]);
      const p = chart().createCanvas({ width: 400, height: 300, margin: 0 }).createData({ id: "table", values: table })
        .createGeometryData({ id: "regions", format: "geojson", coordinateKind: "planar", featureKey: "id", values: { type: "FeatureCollection", features } })
        .createGeoJoinData({ id: "joined", geometry: "regions", data: "table", geometryKey: ["properties", "code"], dataKey: "code" })
        .createProjection({ id: "map", type: "identity", fit: { width: 360, height: 260, padding: 10 } })
        .createCoordinate({ type: "geo" }).createGeoPointMark({ id: "points" })
        .editGeoJoinData({ target: "joined", dataKey: ["code"] });
      const before = serializeProgram(p);
      const q = recipe === "source-order" ? p.editGeometryData({ target: "regions", values: { type: "FeatureCollection", features: [...features].reverse() } }) : p;
      const expected = recipe === "source-order" ? [...rows].reverse() : rows;
      const result = q.semanticSpec.resources.find(resource => resource.id === "joined").result;
      assert.equal(result.features.length, rows.length);
      const items = getMarkItems(q, { target: "points" });
      assert.equal(items.length, rows.length);
      expected.forEach((row, i) => {
        const index = table.findIndex(entry => entry.code === row.sourceRowIndex);
        assert.equal(result.rowMap[i], index < 0 ? null : index);
        assert.equal(items[i].fields.measurement, index < 0 ? undefined : row.value);
        if (index >= 0) assert.ok(view.provenance.sourceRowIndexes.includes(items[i].fields.sourceRowIndex));
      });
      assert.equal(result.diagnostics.matchedCount, result.rowMap.filter(index => index !== null).length);
      assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
      assert.equal(serializeProgram(p), before);
      for (const entry of p.trace.children) if (witnesses.has(entry.op)) {
        const observed = witnesses.get(entry.op);
        if (!observed.has(dataset)) observed.set(dataset, new Set());
        observed.get(dataset).add(recipe);
      }
    } finally { releaseTidyTuesdaySourceCache(dataset); }
  });
}
test("both geographic join actions have five authentic datasets and three direct recipes", () => {
  for (const [action, observed] of witnesses) {
    assert.equal(observed.size, 5, action);
    for (const recipes of observed.values()) assert.equal(recipes.size, 3, action);
  }
});
