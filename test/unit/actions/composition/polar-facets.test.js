import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ panel: "A", column: "one", angle: "a", radius: 1 }),
  Object.freeze({ panel: "A", column: "two", angle: "b", radius: 2 }),
  Object.freeze({ panel: "B", column: "one", angle: "b", radius: 10 }),
  Object.freeze({ panel: "B", column: "two", angle: "c", radius: 20 })
]);

function source() {
  return chart()
    .createCanvas({ width: 240, height: 240, margin: 40 })
    .createData({ id: "values", values: rows })
    .createPolarScatterPlot({
      id: "points",
      theta: { field: "angle", fieldType: "nominal" },
      radius: { field: "radius", scale: { zero: false, nice: false } },
      guides: false
    });
}

test("facets Polar points with shared or independent theta/r domains", () => {
  const base = source();
  const before = JSON.stringify(base);
  const shared = base.facet({ field: "panel" });
  const independent = base.facet({
    field: "panel", scales: { theta: "independent", r: "independent" }
  });

  assert.deepEqual(Object.values(shared.children).map(child =>
    child.resolvedScales.theta.domain), [["a", "b", "c"], ["a", "b", "c"]]);
  assert.deepEqual(Object.values(shared.children).map(child =>
    child.resolvedScales.radius.domain), [[1, 20], [1, 20]]);
  assert.deepEqual(Object.values(independent.children).map(child =>
    child.resolvedScales.theta.domain), [["a", "b"], ["b", "c"]]);
  assert.deepEqual(Object.values(independent.children).map(child =>
    child.resolvedScales.radius.domain), [[1, 2], [10, 20]]);
  assert.deepEqual(Object.values(shared.children).map(child =>
    child.graphicSpec.objects.points.items.length), [2, 2]);
  assert.equal(JSON.stringify(base), before);
});

test("facets Polar points on a grid and rejects outer Polar axes atomically", () => {
  const base = source();
  const graphics = base.graphicSpec;
  const grid = base.facetGrid({
    rows: { field: "panel" }, columns: { field: "column" },
    combinations: "full"
  });
  assert.equal(grid.compositionSpec.children.length, 4);
  assert.deepEqual(Object.values(grid.children).map(child =>
    child.graphicSpec.objects.points.items.length), [1, 1, 1, 1]);
  assert.throws(
    () => base.facet({ field: "panel", guides: { axes: "outer" } }),
    /do not support outer axes/
  );
  assert.equal(base.graphicSpec, graphics);
});
