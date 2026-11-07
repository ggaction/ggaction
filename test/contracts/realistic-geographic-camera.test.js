import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../src/index.js";
import { getProjectionView, getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { realisticRecordView } from "../support/scenarios/realistic-data.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
const datasets = ["tt-penguins", "tt-london-marathon-winners", "tt-astronauts", "tt-us-births", "tt-chocolate-ratings"];
const witness = new Map();
for (const dataset of datasets) for (const recipe of ["pointers", "viewport", "rotation"]) test(`${dataset} ${recipe} camera operations preserve authentic feature records`, () => {
  try {
    const view = realisticRecordView(dataset, { rowLimit: 16, groupLimit: 3 });
    const rows = view.rows.filter(row => Number.isFinite(row.orderNumeric) && Number.isFinite(row.value));
    assert.ok(rows.length >= 4); assert.equal(view.provenance.sourceDataset, dataset);
    const xMin = Math.min(...rows.map(r => r.orderNumeric)), xSpan = Math.max(...rows.map(r => r.orderNumeric)) - xMin;
    const yMin = Math.min(...rows.map(r => r.value)), ySpan = Math.max(...rows.map(r => r.value)) - yMin;
    // The rotation recipe explicitly maps observed extents to a valid [-60,60]×[-30,30] coordinate frame.
    const features = rows.map(row => ({ type: "Feature", id: row.key, properties: { value: row.value, sourceRowIndex: row.sourceRowIndex },
      geometry: { type: "Point", coordinates: recipe === "rotation"
        ? [xSpan === 0 ? 0 : (row.orderNumeric - xMin) / xSpan * 120 - 60, ySpan === 0 ? 0 : (row.value - yMin) / ySpan * 60 - 30]
        : [row.orderNumeric, row.value] } }));
    const p = chart().createCanvas({ width: 600, height: 400, margin: 0 })
      .createGeometryData({ id: "places", format: "geojson", coordinateKind: recipe === "rotation" ? "geographic" : "planar", featureKey: "id", values: { type: "FeatureCollection", features } })
      .createProjection(recipe === "rotation" ? { id: "map", type: "equirectangular", scalePx: 150, translatePx: [300, 200] }
        : { id: "map", type: "identity", fit: { geometry: "places", width: 600, height: 400, padding: 30 } })
      .createCoordinate({ type: "geo" }).createGeoPointMark({ id: "points" });
    const saved = serializeProgram(p), initial = getProjectionView(p), original = getMarkItems(p), extent = [initial.parameters.scalePx / 4, initial.parameters.scalePx * 4];
    let q;
    if (recipe === "pointers") {
      q = p.navigateProjection({ operation: { type: "pan", deltaPx: [10, 5] } })
        .navigateProjection({ operation: { type: "zoom", anchorPx: [300, 200], factor: 1.1, scaleExtent: extent } })
        .navigateProjection({ operation: { type: "pinch", fromPx: [[290, 200], [310, 200]], toPx: [[278, 202], [322, 202]], scaleExtent: extent } });
    } else if (recipe === "viewport") {
      q = p.navigateProjection({ operation: { type: "resize", canvas: { width: 800, height: 600 }, scaling: "fit" } })
        .navigateProjection({ operation: { type: "fit", fit: { geometry: "places", width: 800, height: 600, padding: 30 } } })
        .navigateProjection({ operation: { type: "reset", initial: initial.parameters } });
      assert.deepEqual(getProjectionView(q).parameters, initial.parameters);
    } else {
      q = p.navigateProjection({ operation: { type: "rotate", rotateDeg: [15, 5, 10] } });
      assert.deepEqual(q.graphicSpec, p.editProjection({ rotateDeg: [15, 5, 10] }).graphicSpec);
    }
    const items = getMarkItems(q);
    assert.deepEqual(items.map(item => item.fields.sourceRowIndex), rows.map(row => row.sourceRowIndex));
    assert.deepEqual(items.map(item => item.fields.value), rows.map(row => row.value));
    assert.deepEqual(items.map(item => item.key), original.map(item => item.key));
    assert.equal(getProjectionView(q).projection.revision, recipe === "rotation" ? 1 : 3);
    assert.equal(renderToSVG(deserializeProgram(serializeProgram(q))), renderToSVG(q));
    assert.equal(serializeProgram(p), saved);
    assert.equal(q.trace.children.filter(node => node.op === "navigateProjection").length, recipe === "rotation" ? 1 : 3);
    if (!witness.has(dataset)) witness.set(dataset, new Set()); witness.get(dataset).add(recipe);
  } finally { releaseTidyTuesdaySourceCache(dataset); }
});
test("camera navigation has five authentic datasets and three explicit operation recipes", () => {
  assert.equal(witness.size, 5); for (const recipes of witness.values()) assert.equal(recipes.size, 3);
});
