import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { resolveArcItems } from
  "../../../../src/materialization/selection/items/arc.js";

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

const familyRows = Object.freeze(["A", "B"].flatMap((panel, panelIndex) =>
  ["X", "Y"].flatMap(column => ["a", "b", "c"].map((angle, index) =>
    Object.freeze({
      panel,
      column,
      angle,
      theta: index + 1,
      radius: 1 + panelIndex * 9 + index,
      value: 1 + panelIndex * index,
      series: column
    })
  ))
));

function familySource() {
  return chart()
    .createCanvas({ width: 280, height: 260, margin: 45 })
    .createData({ id: "values", values: familyRows });
}

test("facets and grids every Polar Line, direct Arc, Pie, Rose, and Radar family", () => {
  const programs = [
    ["line", familySource().createPolarLinePlot({
      id: "mark", theta: { field: "angle", fieldType: "ordinal" },
      radius: "radius", groupBy: "series", line: { closed: true }, guides: false
    }), 2, 1],
    ["arc", familySource().createArcMark({ id: "mark" })
      .encodeTheta({ field: "angle", fieldType: "nominal" })
      .encodeR({ field: "radius", scale: { zero: true } }), 6, 3],
    ["pie", familySource().createPiePlot({
      id: "mark", category: "angle", value: "value", aggregate: "sum", guides: false
    }), 3, 3],
    ["rose", familySource().createRosePlot({
      id: "mark", category: "angle", value: "value", aggregate: "sum", guides: false
    }), 3, 3],
    ["radar", familySource().createRadarPlot({
      id: "mark", category: "angle", value: "radius", groupBy: ["panel", "series"],
      order: ["a", "b", "c"], guides: false
    }), 2, 1]
  ];
  for (const [name, program, facetItems, gridItems] of programs) {
    const faceted = program.facet({ field: "panel" });
    const grid = program.facetGrid({
      rows: { field: "panel" }, columns: { field: "column" }
    });
    assert.deepEqual(Object.values(faceted.children).map(child =>
      child.graphicSpec.objects.mark.items.length), [facetItems, facetItems], name);
    assert.deepEqual(Object.values(grid.children).map(child =>
      child.graphicSpec.objects.mark.items.length),
    [gridItems, gridItems, gridItems, gridItems], name);
    if (name === "line" || name === "radar") {
      assert.equal(Object.values(grid.children).every(child =>
        child.graphicSpec.objects.mark.items[0].properties.commands.at(-1).op === "Z"), true);
    }
  }
});

test("normalizes each Pie partition by its local denominator", () => {
  const values = [
    { panel: "A", category: "one", value: 1 },
    { panel: "A", category: "two", value: 1 },
    { panel: "B", category: "one", value: 1 },
    { panel: "B", category: "two", value: 3 }
  ];
  const faceted = chart().createCanvas({ width: 240, height: 240, margin: 40 })
    .createData({ values })
    .createPiePlot({ id: "pie", category: "category", value: "value",
      aggregate: "sum", guides: false })
    .facet({ field: "panel" });
  const spans = Object.values(faceted.children).map(child => {
    const layer = child.semanticSpec.layers[0];
    const dataset = child.semanticSpec.datasets.find(value => value.id === layer.data);
    return resolveArcItems(child, layer, dataset).map(item =>
      item.geometry.endTheta - item.geometry.startTheta);
  });
  assert.deepEqual(spans, [[180, 180], [90, 270]]);
});
