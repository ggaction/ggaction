import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";

const rows = Object.freeze([
  Object.freeze({ x: 2, y: 20, lower: 18, upper: 22, year: 2000, group: "A" }),
  Object.freeze({ x: 1, y: 10, lower: 8, upper: 12, year: 2010, group: "A" }),
  Object.freeze({ x: 2, y: 30, lower: 28, upper: 32, year: 1990, group: "A" }),
  Object.freeze({ x: 4, y: 40, lower: 38, upper: 42, year: 2000, group: "B" }),
  Object.freeze({ x: 3, y: 35, lower: 33, upper: 37, year: 1990, group: "B" })
]);

function lineBase(values = rows) {
  return chart()
    .createCanvas({ width: 300, height: 220, margin: 30 })
    .createData({ id: "data", values })
    .createLineMark({ id: "paths" })
    .encodeX({ target: "paths", field: "x" })
    .encodeY({ target: "paths", field: "y" })
    .encodeGroup({ target: "paths", field: "group" });
}

function areaBase() {
  return chart()
    .createCanvas({ width: 300, height: 220, margin: 30 })
    .createData({ id: "data", values: rows })
    .createAreaMark({ id: "band" })
    .encodeX({ target: "band", field: "x" })
    .encodeYRange({ target: "band", lower: "lower", upper: "upper" })
    .encodeGroup({ target: "band", field: "group" });
}

test("stores explicit order and preserves every grouped line row", () => {
  const automatic = lineBase();
  const ordered = automatic.encodePathOrder({ field: "year" });
  const layer = ordered.semanticSpec.layers.find(item => item.id === "paths");

  assert.deepEqual(layer.encoding.pathOrder, {
    field: "year",
    fieldType: "quantitative",
    order: "ascending"
  });
  assert.deepEqual(
    automatic.graphicSpec.objects.paths.items.map(item =>
      item.properties.commands.length
    ),
    [2, 2]
  );
  assert.deepEqual(
    ordered.graphicSpec.objects.paths.items.map(item =>
      item.properties.commands.length
    ),
    [3, 2]
  );
  assert.deepEqual(
    ordered.trace.children.at(-1).children.map(child => child.op),
    ["editSemantic", "editSemantic", "editSemantic", "rematerializeLineMark"]
  );
  assert.equal(automatic.semanticSpec.layers[0].encoding.pathOrder, undefined);
});

test("reassigns direction and removes order without mutating earlier programs", () => {
  const ascending = lineBase().encodePathOrder({ field: "year" });
  const descending = ascending.encodePathOrder({
    field: "year",
    order: "descending"
  });
  const restored = descending.removePathOrder({ target: "paths" });
  const inferred = ascending.removePathOrder();

  assert.notDeepEqual(
    descending.graphicSpec.objects.paths,
    ascending.graphicSpec.objects.paths
  );
  assert.equal(
    descending.semanticSpec.layers[0].encoding.pathOrder.order,
    "descending"
  );
  assert.equal(restored.semanticSpec.layers[0].encoding.pathOrder, undefined);
  assert.equal(inferred.semanticSpec.layers[0].encoding.pathOrder, undefined);
  assert.deepEqual(restored.graphicSpec, lineBase().graphicSpec);
  assert.equal(
    ascending.semanticSpec.layers[0].encoding.pathOrder.order,
    "ascending"
  );
  assert.deepEqual(
    restored.trace.children.at(-1).children.map(child => child.op),
    ["editSemantic", "rematerializeLineMark"]
  );
});

test("converges when path order is assigned before Cartesian positions", () => {
  const early = chart()
    .createCanvas({ width: 300, height: 220, margin: 30 })
    .createData({ id: "data", values: rows })
    .createLineMark({ id: "paths" })
    .encodePathOrder({ field: "year" })
    .encodeX({ target: "paths", field: "x" })
    .encodeY({ target: "paths", field: "y" })
    .encodeGroup({ target: "paths", field: "group" });
  const late = lineBase().encodePathOrder({ field: "year" });

  assert.deepEqual(early.semanticSpec, late.semanticSpec);
  assert.deepEqual(early.graphicSpec, late.graphicSpec);
  assert.deepEqual(early.resolvedScales, late.resolvedScales);
});

test("orders ordinary ranged area rows and retains closed paths", () => {
  const ascending = areaBase().encodePathOrder({ field: "year" });
  const descending = ascending.encodePathOrder({
    field: "year",
    order: "descending"
  });

  assert.equal(ascending.graphicSpec.objects.band.items.length, 2);
  assert.equal(
    ascending.graphicSpec.objects.band.items.every(item =>
      item.properties.commands.at(-1).op === "Z"
    ),
    true
  );
  assert.notDeepEqual(
    descending.graphicSpec.objects.band,
    ascending.graphicSpec.objects.band
  );
});

test("validates values, options, target inference, and compatibility atomically", () => {
  const base = lineBase();
  assert.throws(
    () => base.encodePathOrder({ field: "missing" }),
    /finite number at row 0/
  );
  assert.throws(
    () => base.encodePathOrder({ field: "year", fieldType: "temporal" }),
    /quantitative field/
  );
  assert.throws(
    () => base.encodePathOrder({ field: "year", order: "forward" }),
    /Unsupported path order/
  );
  assert.throws(
    () => base.encodePathOrder({ field: "year", unknown: true }),
    /Unknown encodePathOrder option/
  );
  assert.throws(
    () => base.removePathOrder(),
    /has no path order encoding/
  );
  assert.deepEqual(base.semanticSpec.layers[0].encoding.group, {
    field: "group",
    fieldType: "nominal"
  });

  const ambiguous = base
    .createLineMark({ id: "second", data: "data" })
    .encodeX({ target: "second", field: "x", scale: { id: "x" } })
    .encodeY({ target: "second", field: "y", scale: { id: "y" } })
    .createPointMark({ id: "point", data: "data" });
  assert.throws(
    () => ambiguous.encodePathOrder({ field: "year" }),
    /target is ambiguous/
  );

  const aggregate = chart()
    .createCanvas()
    .createData({ values: [
      { year: 2000, value: 1 },
      { year: 2001, value: 2 }
    ] })
    .createLineMark()
    .encodeX({ field: "year", fieldType: "temporal" })
    .encodeY({ field: "value", aggregate: "mean" });
  assert.throws(
    () => aggregate.encodePathOrder({ field: "year" }),
    /does not support aggregate lines/
  );

  const polar = chart()
    .createCanvas()
    .createData({ values: [
      { angle: "A", radius: 1, order: 1 },
      { angle: "B", radius: 2, order: 2 }
    ] })
    .createLineMark()
    .encodeTheta({ field: "angle", fieldType: "nominal" })
    .encodeR({ field: "radius" });
  assert.throws(
    () => polar.encodePathOrder({ field: "order" }),
    /does not support Polar paths/
  );

  const generated = chart()
    .createCanvas()
    .createData({ values: [
      { value: 1, group: "A" },
      { value: 2, group: "A" },
      { value: 3, group: "B" }
    ] })
    .createAreaMark()
    .encodeDensity({ field: "value", groupBy: "group", steps: 8 });
  assert.throws(
    () => generated.encodePathOrder({ field: "value" }),
    /raw or row-preserving source data/
  );
});

test("reapplies ordered topology after Canvas, scale, filter, and highlight changes", () => {
  const ordered = lineBase().encodePathOrder({ field: "year" });
  const resized = ordered.editCanvas({ width: 420 });
  const rescaled = ordered.editScale({ id: "x", domain: [0, 5] });
  const highlighted = ordered.highlightMarks({
    target: "paths",
    select: { field: "group", op: "eq", value: "A" },
    strokeWidth: 5,
    dimOthers: { opacity: 0.2 }
  });
  const reordered = highlighted.encodePathOrder({
    target: "paths",
    field: "year",
    order: "descending"
  });

  assert.notDeepEqual(
    resized.graphicSpec.objects.paths,
    ordered.graphicSpec.objects.paths
  );
  assert.notDeepEqual(
    rescaled.graphicSpec.objects.paths,
    ordered.graphicSpec.objects.paths
  );
  assert.deepEqual(
    reordered.graphicSpec.objects.paths.items.map(item =>
      item.properties.strokeWidth
    ),
    [2, 5]
  );
  assert.deepEqual(
    reordered.graphicSpec.objects.paths.items.map(item => item.properties.opacity),
    [0.2, undefined]
  );

  const filtered = chart()
    .createCanvas({ width: 300, height: 220, margin: 30 })
    .createData({ id: "source", values: rows })
    .filterData({ id: "selected", field: "group", oneOf: ["A"] })
    .createLineMark({ id: "filtered", data: "selected" })
    .encodePathOrder({ field: "year" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
  assert.equal(filtered.graphicSpec.objects.filtered.items.length, 1);
  assert.equal(
    filtered.graphicSpec.objects.filtered.items[0].properties.commands.length,
    3
  );
});

test("replays explicit order inside each compatible facet child", () => {
  const facetedRows = [
    { panel: "A", x: 2, y: 2, year: 2000 },
    { panel: "B", x: 4, y: 4, year: 2000 },
    { panel: "A", x: 1, y: 1, year: 2010 },
    { panel: "B", x: 3, y: 3, year: 2010 }
  ];
  const base = chart()
    .createCanvas({ width: 220, height: 180, margin: 25 })
    .createData({ values: facetedRows })
    .createLineMark({ id: "path" })
    .encodePathOrder({ field: "year" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
  const faceted = base.facet({
    field: "panel",
    guides: { legend: false }
  });

  assert.equal(Object.keys(faceted.children).length, 2);
  for (const child of Object.values(faceted.children)) {
    assert.deepEqual(child.semanticSpec.layers[0].encoding.pathOrder, {
      field: "year",
      fieldType: "quantitative",
      order: "ascending"
    });
    assert.equal(
      child.graphicSpec.objects.path.items[0].properties.commands.length,
      2
    );
  }
  assert.equal(base.compositionSpec, undefined);
});
