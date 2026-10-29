import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { createInteractionSession } from "../../src/interaction.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { resolveStoredSelection } from "../../src/materialization/selection/state.js";
import { realisticRecordView } from "../support/scenarios/realistic-data.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";

const datasets = ["tt-penguins", "tt-london-marathon-winners", "tt-astronauts", "tt-us-births", "tt-chocolate-ratings"];
const witnessed = new Map(["createGeoLODData", "editGeoLODData"].map(action => [action, new Map()]));
for (const dataset of datasets) for (const recipe of ["hysteresis", "selection-representation", "source-reorder"]) {
  test(`${dataset} ${recipe} geographic detail preserves authentic measurements and source grouping`, () => {
    try {
      const view = realisticRecordView(dataset, { rowLimit: 16, groupLimit: 4 });
      const rows = view.rows.filter(row => Number.isFinite(row.orderNumeric) && Number.isFinite(row.value));
      assert.ok(rows.length >= 4); assert.equal(view.provenance.sourceDataset, dataset);
      const feature = (id, row) => ({ type: "Feature", id, properties: { measurement: row.value, sourceRowIndex: row.sourceRowIndex },
        geometry: { type: "Point", coordinates: [row.orderNumeric, row.value] } });
      const categories = [...new Map(rows.map(row => [row.category, row])).entries()];
      const fine = { type: "FeatureCollection", features: rows.map(row => feature(row.key, row)) };
      const p = chart().createCanvas({ width: 400, height: 300, margin: 0 })
        .createGeometryData({ id: "coarse", format: "geojson", coordinateKind: "planar", featureKey: "id",
          values: { type: "FeatureCollection", features: categories.map(([category, row]) => feature(category, row)) } })
        .createGeometryData({ id: "fine", format: "geojson", coordinateKind: "planar", featureKey: "id", values: fine })
        .createGeoLODData({ id: "detail", zoom: 5, levels: [{ id: "group", geometry: "coarse" },
          { id: "record", geometry: "fine", parents: rows.map(row => ({ key: row.key, parent: row.category })), enterZoom: 4.2, exitZoom: 3.8 }] })
        .createProjection({ id: "map", type: "identity", fit: { width: 360, height: 260, padding: 10 } })
        .createCoordinate({ type: "geo" }).createGeoPointMark({ id: "points" }).editGeoLODData({ zoom: 4 });
      const original = getMarkItems(p); assert.equal(original.length, rows.length);
      original.forEach((item, i) => { assert.equal(item.fields.measurement, rows[i].value); assert.ok(view.provenance.sourceRowIndexes.includes(item.fields.sourceRowIndex)); });
      const saved = serializeProgram(p); let q;
      if (recipe === "hysteresis") {
        q = p.editGeoLODData({ zoom: 3.8 }); assert.equal(getMarkItems(q).length, rows.length);
        q = q.editGeoLODData({ zoom: 3.7 }); assert.equal(getMarkItems(q).length, categories.length);
      } else if (recipe === "selection-representation") {
        q = p.selectMarks({ id: "selected", target: "points", items: [original[0].key] }).editGeoLODData({ zoom: 3 });
        const [key] = resolveStoredSelection(q, "selected").keys;
        assert.ok(getMarkItems(q).find(item => item.key === key).representationKeys.includes(original[0].key));
        q = q.editGeoLODData({ zoom: 5 }); assert.deepEqual(resolveStoredSelection(q, "selected").keys, [original[0].key]);
      } else {
        q = p.editGeometryData({ target: "fine", values: { ...fine, features: [...fine.features].reverse() } });
        assert.deepEqual(getMarkItems(q).map(item => item.key), original.map(item => item.key).reverse());
      }
      for (const selectionPolicy of ["keep-hidden", "drop"]) {
        const start = p.selectMarks({ id: "logical", target: "points", items: [original[0].key] });
        const session = createInteractionSession({ program: start, selectionPolicy, bindings: [] }), events = [];
        session.subscribe(event => events.push(event));
        session.updateProgram(start.editGeoLODData({ target: "detail", zoom: 3 }));
        assert.deepEqual(events[0].selectionChanges, []);
        const coarse = session.getState().program, selected = resolveStoredSelection(coarse, "logical").keys;
        assert.ok(getMarkItems(coarse).find(item => selected.includes(item.key)).representationKeys.includes(original[0].key));
        session.updateProgram(deserializeProgram(serializeProgram(coarse)).editGeoLODData({ target: "detail", zoom: 5 }));
        assert.deepEqual(events[1].selectionChanges, []);
        assert.deepEqual(resolveStoredSelection(session.getState().program, "logical").keys, [original[0].key]);
        session.destroy();
      }
      assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec); assert.equal(serializeProgram(p), saved);
      for (const entry of p.trace.children) if (witnessed.has(entry.op)) {
        const counts = witnessed.get(entry.op); if (!counts.has(dataset)) counts.set(dataset, new Set()); counts.get(dataset).add(recipe);
      }
    } finally { releaseTidyTuesdaySourceCache(dataset); }
  });
}
test("geographic detail actions have five authentic datasets and three direct recipes", () => {
  for (const [action, evidence] of witnessed) { assert.equal(evidence.size, 5, action); for (const recipes of evidence.values()) assert.equal(recipes.size, 3, action); }
});
