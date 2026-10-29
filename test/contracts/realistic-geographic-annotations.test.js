import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { realisticRecordView } from "../support/scenarios/realistic-data.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";

const datasets = ["tt-penguins", "tt-london-marathon-winners", "tt-astronauts", "tt-us-births", "tt-chocolate-ratings"];
const witnessed = new Map(["createGeoAnnotation", "editGeoAnnotation"].map(action => [action, new Map()]));
const feature = row => ({ type: "Feature", id: row.key, properties: { measurement: row.value, sourceRowIndex: row.sourceRowIndex },
  geometry: { type: "Point", coordinates: [row.orderNumeric, row.value] } });
for (const dataset of datasets) for (const recipe of ["projected-anchor", "source-reorder", "original-level"]) {
  test(`${dataset} ${recipe} annotations retain authentic measurements and original feature identity`, () => {
    try {
      const view = realisticRecordView(dataset, { rowLimit: 16, groupLimit: 4 });
      const rows = view.rows.filter(row => Number.isFinite(row.orderNumeric) && Number.isFinite(row.value));
      assert.ok(rows.length >= 4); assert.equal(view.provenance.sourceDataset, dataset);
      const values = { type: "FeatureCollection", features: rows.map(feature) }, first = rows[0];
      const p = chart().createCanvas({ width: 400, height: 300, margin: 0 })
        .createGeometryData({ id: "fine", format: "geojson", coordinateKind: "planar", featureKey: "id", values })
        .createGeometryData({ id: "coarse", format: "geojson", coordinateKind: "planar", featureKey: "id", values: feature(first) })
        .createGeoLODData({ id: "details", zoom: 5, levels: [{ id: "group", geometry: "coarse" },
          { id: "record", geometry: "fine", enterZoom: 4.2, exitZoom: 3.8, parents: rows.map(row => ({ key: row.key, parent: first.key })) }] })
        .createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" })
        .createGeoAnnotation({ id: "note", anchor: { type: "feature", geometry: "details", key: first.key }, text: String(first.category) })
        .editGeoAnnotation({ target: "note", text: `${first.category}: ${first.value}`, dx: 3, dy: -4 });
      const original = getMarkItems(p)[0], saved = serializeProgram(p); let q;
      assert.equal(original.fields.measurement, first.value); assert.equal(original.fields.sourceRowIndex, first.sourceRowIndex);
      assert.ok(view.provenance.sourceRowIndexes.includes(first.sourceRowIndex));
      const properties = program => program.graphicSpec.objects.note.items[0].properties;
      assert.deepEqual([properties(p).x, properties(p).y], [first.orderNumeric + 3, first.value - 4]);
      if (recipe === "projected-anchor") {
        q = p.editProjection({ scalePx: 2, translatePx: [10, 20] });
        assert.deepEqual([properties(q).x, properties(q).y], [first.orderNumeric * 2 + 13, first.value * 2 + 16]);
      } else if (recipe === "source-reorder") {
        q = p.editGeometryData({ target: "fine", values: { ...values, features: [...values.features].reverse() } });
        assert.deepEqual([properties(q).x, properties(q).y], [properties(p).x, properties(p).y]);
      } else {
        q = p.editGeoLODData({ target: "details", zoom: 0 });
        assert.equal(q.semanticSpec.layers[0].geoBinding.anchor.level, "record");
        assert.deepEqual([properties(q).x, properties(q).y], [properties(p).x, properties(p).y]);
      }
      assert.equal(getMarkItems(q)[0].key, original.key); assert.equal(serializeProgram(p), saved);
      assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
      for (const entry of p.trace.children) if (witnessed.has(entry.op)) {
        const counts = witnessed.get(entry.op); if (!counts.has(dataset)) counts.set(dataset, new Set()); counts.get(dataset).add(recipe);
      }
    } finally { releaseTidyTuesdaySourceCache(dataset); }
  });
}
test("geographic annotation actions have five authentic datasets and three direct recipes", () => {
  for (const [action, evidence] of witnessed) { assert.equal(evidence.size, 5, action); for (const recipes of evidence.values()) assert.equal(recipes.size, 3, action); }
});
