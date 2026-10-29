import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { realisticRecordView } from "../support/scenarios/realistic-data.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";

const datasets = ["tt-penguins", "tt-london-marathon-winners", "tt-astronauts", "tt-us-births", "tt-chocolate-ratings"];
const witnesses = new Map(["createProjection", "editProjection"].map(action => [action, new Map()]));
const projection = program => program.semanticSpec.resources.find(resource => resource.kind === "projection");
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) <= 1e-8 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);

// A planar point fit is an affine box calculation independent of projection code.
function assertFit(resource, points) {
  const { width, height, padding } = resource.options.fit;
  const reflected = points.map(([x, y]) => [resource.options.reflectX ? -x : x, resource.options.reflectY ? -y : y]);
  const lower = [0, 1].map(axis => Math.min(...reflected.map(point => point[axis])));
  const upper = [0, 1].map(axis => Math.max(...reflected.map(point => point[axis])));
  const span = upper.map((value, axis) => value - lower[axis]);
  assert.ok(span.every(value => value > 0));
  const scale = Math.min((width - 2 * padding) / span[0], (height - 2 * padding) / span[1]);
  const translate = [width, height].map((size, axis) => size / 2 - (lower[axis] + upper[axis]) / 2 * scale);
  near(resource.result.scalePx, scale);
  resource.result.translatePx.forEach((value, axis) => near(value, translate[axis]));
  resource.result.bounds.forEach((value, index) => near(value, (index < 2 ? lower : upper)[index % 2] * scale + translate[index % 2]));
}

for (const dataset of datasets) for (const recipe of ["viewport", "reflection", "detach"]) {
  test(`${dataset} ${recipe} projection preserves authentic planar measurements and fit lifecycle`, () => {
    try {
      const view = realisticRecordView(dataset, { rowLimit: 24, groupLimit: 4 });
      const rows = view.rows.filter(row => Number.isFinite(row.orderNumeric) && Number.isFinite(row.value));
      assert.ok(rows.length >= 4);
      assert.equal(view.provenance.sourceDataset, dataset);
      assert.ok(rows.every(row => view.provenance.sourceRowIndexes.includes(row.sourceRowIndex)));
      const points = rows.map(row => [row.orderNumeric, row.value]);
      const values = coordinates => ({ type: "FeatureCollection", features: rows.map((row, index) => ({
        type: "Feature", id: row.key, properties: { sourceDataset: dataset, sourceRowIndex: row.sourceRowIndex },
        geometry: { type: "Point", coordinates: coordinates[index] }
      })) });
      const initial = chart().createGeometryData({ id: "measurements", format: "geojson", coordinateKind: "planar", featureKey: "id", values: values(points) })
        .createProjection({ id: "plane", type: "identity", reflectX: recipe === "reflection",
          fit: { geometry: "measurements", width: 200, height: 120, padding: 10 } });
      assertFit(projection(initial), points);
      const before = serializeProgram(initial);
      const edited = recipe === "viewport" ? initial.editProjection({ fit: { width: 300, height: 180, padding: 20 } }) :
        recipe === "reflection" ? initial.editProjection({ reflectY: true }) : initial.editProjection({ scalePx: 2, translatePx: [10, 20] });
      const expanded = points.map(([x, y]) => [x * 2, y * 2]);
      const next = deserializeProgram(serializeProgram(edited)).editGeometryData({ target: "measurements", values: values(expanded) });
      assert.equal(projection(edited).revision, 1);
      if (recipe === "detach") {
        assert.deepEqual(projection(next), projection(edited));
        assert.deepEqual(projection(next).inputs, []);
        assert.equal(projection(next).options.scalePx, 2);
        assert.deepEqual(projection(next).options.translatePx, [10, 20]);
      } else {
        assertFit(projection(edited), points);
        assertFit(projection(next), expanded);
        assert.equal(projection(next).revision, 2);
        assert.deepEqual(projection(next).inputs, [{ kind: "geometry", id: "measurements", revision: 1 }]);
      }
      assert.equal(serializeProgram(initial), before);
      assert.deepEqual(deserializeProgram(serializeProgram(next)).semanticSpec, next.semanticSpec);
      assert.equal(Object.keys(next.graphicSpec.objects).length, 0);
      for (const entry of edited.trace.children) if (witnesses.has(entry.op)) {
        const observed = witnesses.get(entry.op);
        if (!observed.has(dataset)) observed.set(dataset, new Set());
        observed.get(dataset).add(recipe);
      }
    } finally { releaseTidyTuesdaySourceCache(dataset); }
  });
}
test("each projection action has five authentic datasets and three direct lifecycle recipes", () => {
  for (const [action, observed] of witnesses) {
    assert.equal(observed.size, 5, action);
    for (const recipes of observed.values()) assert.equal(recipes.size, 3, action);
  }
});
