import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { realisticRecordView } from "../support/scenarios/realistic-data.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";

const datasets = ["tt-penguins", "tt-london-marathon-winners", "tt-astronauts", "tt-us-births", "tt-chocolate-ratings"];
const witnesses = new Map();
for (const dataset of datasets) for (const recipe of ["categorical", "continuous", "threshold"]) {
  test(`${dataset} ${recipe} geographic fields preserve authentic measurements through source revision`, () => {
    try {
      const view = realisticRecordView(dataset, { rowLimit: 16, groupLimit: 3 });
      const rows = view.rows.filter(row => Number.isFinite(row.orderNumeric) && Number.isFinite(row.value));
      assert.ok(rows.length >= 4); assert.equal(view.provenance.sourceDataset, dataset);
      const features = rows.map(row => ({ type: "Feature", id: row.key, properties: { value: row.value, category: row.category, sourceRowIndex: row.sourceRowIndex },
        geometry: { type: "Point", coordinates: [row.orderNumeric, row.value] } }));
      const minimum = Math.min(...rows.map(row => row.value)), maximum = Math.max(...rows.map(row => row.value));
      assert.ok(maximum > minimum);
      const color = recipe === "categorical" ? { field: "category", scale: { id: "color", range: ["red", "blue", "green"] } }
        : { field: "value", fieldType: "quantitative", scale: recipe === "threshold"
          ? { id: "color", type: "threshold", domain: [(minimum + maximum) / 2], range: ["red", "blue"] }
          : { id: "color", domain: [minimum, maximum], range: ["white", "black"] } };
      const p = chart().createCanvas({ width: 800, height: 600, margin: { left: 20, right: 240, top: 20, bottom: 20 } })
        .createGeometryData({ id: "points", format: "geojson", coordinateKind: "planar", featureKey: "id", values: { type: "FeatureCollection", features } })
        .createProjection({ id: "map", type: "identity", fit: { geometry: "points", width: 500, height: 500, padding: 20 } })
        .createCoordinate({ type: "geo" }).createGeoPointMark({ id: "places" })
        .encodeColor(color).encodeSize({ field: "value", scale: { id: "size", domain: [minimum, maximum], range: [Math.PI, 25 * Math.PI] } }).createLegend();
      const before = serializeProgram(p), original = getMarkItems(p), graphics = p.graphicSpec.objects.places.items;
      assert.deepEqual(original.map(item => item.fields.sourceRowIndex), rows.map(row => row.sourceRowIndex));
      graphics.forEach((item, i) => {
        const expectedArea = Math.PI * (1 + 24 * (rows[i].value - minimum) / (maximum - minimum));
        assert.ok(Math.abs(item.properties.radius ** 2 * Math.PI - expectedArea) < 1e-8);
      });
      if (recipe === "threshold") assert.deepEqual(graphics.map(item => item.properties.fill), rows.map(row => row.value < (minimum + maximum) / 2 ? "red" : "blue"));
      if (recipe === "categorical") assert.deepEqual(p.resolvedScales.color.domain, [...new Set(rows.map(row => row.category))]);
      const q = p.editGeometryData({ target: "points", values: { type: "FeatureCollection", features: [...features].reverse() } });
      assert.deepEqual(getMarkItems(q).map(item => item.key), original.map(item => item.key).reverse());
      assert.deepEqual(getMarkItems(q).map(item => item.channels.size), rows.map(row => row.value).reverse());
      assert.equal(renderToSVG(deserializeProgram(serializeProgram(q))), renderToSVG(q));
      assert.equal(serializeProgram(p), before);
      assert.deepEqual(p.trace.children.filter(node => ["encodeColor", "encodeSize"].includes(node.op)).map(node => node.op), ["encodeColor", "encodeSize"]);
      if (!witnesses.has(dataset)) witnesses.set(dataset, new Set()); witnesses.get(dataset).add(recipe);
    } finally { releaseTidyTuesdaySourceCache(dataset); }
  });
}
test("geographic field encoders each have five authentic datasets and three direct recipes", () => {
  assert.equal(witnesses.size, 5); for (const observed of witnesses.values()) assert.equal(observed.size, 3);
});
