import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { realisticRecordView } from "../support/scenarios/realistic-data.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";

const datasets = ["tt-penguins", "tt-london-marathon-winners", "tt-astronauts", "tt-us-births", "tt-chocolate-ratings"];
const actions = ["createGeoShapeMark", "editGeoShapeMark", "createGeoPointMark", "editGeoPointMark", "createGeoLineMark", "editGeoLineMark", "createGraticule", "editGraticule"];
const witnesses = new Map(actions.map(action => [action, new Map()]));
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8 * Math.max(1, Math.abs(b)), `${a} != ${b}`);
for (const dataset of datasets) for (const recipe of ["viewport", "reflection", "source-order"]) {
  test(`${dataset} ${recipe} geographic marks retain authentic measurements and final feature identity`, () => {
    try {
      const view = realisticRecordView(dataset, { rowLimit: 16, groupLimit: 4 });
      const rows = view.rows.filter(row => Number.isFinite(row.orderNumeric) && Number.isFinite(row.value));
      assert.ok(rows.length >= 4);
      assert.equal(view.provenance.sourceDataset, dataset);
      const features = rows.map(row => ({ type: "Feature", id: row.key, properties: { sourceDataset: dataset, sourceRowIndex: row.sourceRowIndex }, geometry: { type: "Point", coordinates: [row.orderNumeric, row.value] } }));
      assert.ok(features.every(feature => view.provenance.sourceRowIndexes.includes(feature.properties.sourceRowIndex)));
      const values = { type: "FeatureCollection", features };
      const p = chart().createCanvas({ width: 400, height: 300, margin: 0 })
        .createGeometryData({ id: "points", format: "geojson", coordinateKind: "planar", featureKey: "id", values })
        .createGeometryData({ id: "series", format: "geojson", coordinateKind: "planar", featureKey: "id", values: { type: "Feature", id: dataset, properties: { sourceDataset: dataset }, geometry: { type: "LineString", coordinates: features.map(feature => feature.geometry.coordinates) } } })
        .createProjection({ id: "plane", type: "identity", fit: { geometry: "points", width: 360, height: 260, padding: 10 } })
        .createCoordinate({ id: "plane", type: "geo" })
        .createGeoShapeMark({ id: "shapes", geometry: "points", fill: "#93c5fd" })
        .editGeoShapeMark({ radiusPx: 5, opacity: .7 })
        .createGeoPointMark({ id: "points", geometry: "points", radiusPx: 3 })
        .editGeoPointMark({ radiusPx: 4, fill: "#dc2626" })
        .createGeoLineMark({ id: "line", geometry: "series", stroke: "#475569" })
        .editGeoLineMark({ strokeWidth: 2, lineCap: "round" })
        .createProjection({ id: "sphere", type: "equirectangular", scalePx: 50, translatePx: [200, 150] })
        .createCoordinate({ id: "sphere", type: "geo" })
        .createGraticule({ extentDeg: [[-40, -20], [40, 20]], stepDeg: [40, 20], precisionDeg: 5 })
        .editGraticule({ opacity: .3, stepDeg: [20, 20] });
      const before = serializeProgram(p);
      const q = recipe === "viewport" ? p.editProjection({ target: "plane", fit: { width: 380, height: 280 } }) : recipe === "reflection" ? p.editProjection({ target: "plane", reflectY: true }) : p.editGeometryData({ target: "points", values: { ...values, features: [...features].reverse() } });
      const projection = q.semanticSpec.resources.find(resource => resource.id === "plane" && resource.kind === "projection");
      const expected = recipe === "source-order" ? [...features].reverse() : features;
      const marks = getMarkItems(q, { target: "points" });
      assert.equal(marks.length, rows.length);
      marks.forEach((item, index) => assert.equal(item.fields.sourceRowIndex, expected[index].properties.sourceRowIndex));
      q.graphicSpec.objects.points.items.forEach((item, index) => {
        const [x, y] = expected[index].geometry.coordinates;
        near(item.properties.x, x * projection.result.scalePx + projection.result.translatePx[0]);
        near(item.properties.y, (projection.options.reflectY ? -y : y) * projection.result.scalePx + projection.result.translatePx[1]);
        assert.equal(item.properties.radius, 4);
      });
      assert.equal(getMarkItems(q, { target: "shapes" }).length, rows.length);
      assert.equal(getMarkItems(q, { target: "line" }).length, 1);
      assert.equal(getMarkItems(q, { target: "graticule" }).length, 8);
      assert.equal(renderToSVG(deserializeProgram(serializeProgram(q))), renderToSVG(q));
      assert.equal(serializeProgram(p), before);
      for (const entry of p.trace.children) if (witnesses.has(entry.op)) {
        const observed = witnesses.get(entry.op);
        if (!observed.has(dataset)) observed.set(dataset, new Set());
        observed.get(dataset).add(recipe);
      }
    } finally { releaseTidyTuesdaySourceCache(dataset); }
  });
}
test("each geographic mark action has five authentic datasets and three direct consumer recipes", () => {
  for (const [action, observed] of witnesses) {
    assert.equal(observed.size, 5, action);
    for (const recipes of observed.values()) assert.equal(recipes.size, 3, action);
  }
});
