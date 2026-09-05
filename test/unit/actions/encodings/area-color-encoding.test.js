import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";
import { createCarsDensityAreaValues } from
  "../../../charts/cars-density-area/reference-values.js";
import { loadCars } from "../../../support/data.js";

function densityArea() {
  return chart()
    .createCanvas({
      width: 720,
      height: 500,
      margin: { top: 130, right: 40, bottom: 70, left: 80 }
    })
    .createData({ id: "cars", values: loadCars() })
    .createAreaMark({ id: "densities", opacity: 0.5 })
    .encodeDensity({
      field: "Acceleration",
      groupBy: "Origin",
      bandwidth: 0.6
    });
}

const CENTER_ROWS = Object.freeze([
  Object.freeze({ x: 0, group: "A", value: 2 }),
  Object.freeze({ x: 1, group: "A", value: 4 }),
  Object.freeze({ x: 0, group: "B", value: 1 }),
  Object.freeze({ x: 1, group: "B", value: 2 })
]);

function rawArea(rows = CENTER_ROWS) {
  return chart()
    .createCanvas({
      width: 120,
      height: 130,
      margin: { top: 20, right: 10, bottom: 10, left: 10 }
    })
    .createData({ id: "series", values: rows })
    .createAreaMark({ id: "stream", opacity: 1 })
    .encodeX({ target: "stream", field: "x" })
    .encodeY({ target: "stream", field: "value" });
}

test("colors density paths in the group domain order", () => {
  const before = densityArea();
  const program = before.encodeColor({
    field: "Origin",
    scale: { palette: "tableau10" }
  });
  const expected = createCarsDensityAreaValues(loadCars());

  assert.deepEqual(program.semanticSpec.layers[0].encoding.color, {
    field: "Origin",
    fieldType: "nominal",
    scale: "color"
  });
  assert.equal(program.semanticSpec.layers[0].layout.mode, "overlay");
  assert.deepEqual(program.resolvedScales.color.domain, expected.groupDomain);
  assert.deepEqual(
    program.graphicSpec.objects.densities.items.map(child => child.properties.fill),
    expected.areas.map(area => area.fill)
  );
  assert.deepEqual(
    program.graphicSpec.objects.densities.items.map(child => child.properties.commands),
    before.graphicSpec.objects.densities.items.map(child => child.properties.commands)
  );
});

test("supports explicit area color domains and ranges", () => {
  const program = densityArea().encodeColor({
    field: "Origin",
    scale: {
      domain: ["Japan", "USA", "Europe"],
      range: ["red", "blue", "green"]
    }
  });

  assert.deepEqual(
    program.graphicSpec.objects.densities.items.map(child => child.properties.fill),
    ["blue", "green", "red"]
  );
});

test("materializes stacked and normalized vertical density areas", () => {
  const stacked = densityArea().encodeColor({
    field: "Origin",
    layout: "stack"
  });
  const filled = densityArea().encodeColor({
    field: "Origin",
    layout: "fill"
  });
  const centered = densityArea().encodeColor({
    field: "Origin",
    layout: "center"
  });

  assert.equal(stacked.semanticSpec.layers[0].layout.mode, "stack");
  assert.equal(stacked.resolvedScales.y.domain[1] > 0.25, true);
  assert.equal(filled.semanticSpec.layers[0].layout.mode, "fill");
  assert.deepEqual(filled.resolvedScales.y.domain, [0, 1]);
  assert.equal(centered.semanticSpec.layers[0].layout.mode, "center");
  assert.equal(centered.resolvedScales.y.domain[0] < 0, true);
  assert.equal(centered.resolvedScales.y.domain[1] > 0, true);
  assert.equal(
    centered.resolvedScales.y.domain[0],
    -centered.resolvedScales.y.domain[1]
  );
  assert.equal(stacked.graphicSpec.objects.densities.items.length, 3);
  assert.equal(filled.graphicSpec.objects.densities.items.length, 3);
  assert.equal(centered.graphicSpec.objects.densities.items.length, 3);
});

test("rejects unsupported area layouts and supports valid layout transitions", () => {
  const before = densityArea();
  assert.throws(
    () => before.encodeColor({ field: "Origin", layout: "group" }),
    /does not support "group"/
  );
  const overlay = before.encodeColor({ field: "Origin" });
  assert.equal(overlay.encodeColor({ field: "Origin", layout: "stack" }).semanticSpec.layers[0].layout.mode, "stack");
  assert.equal(before.semanticSpec.layers[0].encoding.color, undefined);
  assert.equal(overlay.semanticSpec.layers[0].layout.mode, "overlay");
});

test("rematerializes colored area paths after Canvas edits", () => {
  const before = densityArea().encodeColor({ field: "Origin" });
  const after = before.editCanvas({ width: 820, height: 540 });

  assert.notDeepEqual(
    after.graphicSpec.objects.densities.items[0].properties.commands,
    before.graphicSpec.objects.densities.items[0].properties.commands
  );
  assert.deepEqual(
    after.graphicSpec.objects.densities.items.map(child => child.properties.fill),
    ["#4c78a8", "#f58518", "#e45756"]
  );
});

test("rematerializes every area consumer of a shared color scale", () => {
  const program = chart()
    .createCanvas({ width: 300, height: 200, margin: 20 })
    .createData({ id: "first", values: [
      { value: 1, group: "A" }, { value: 2, group: "A" }
    ] })
    .createAreaMark({ id: "firstArea" })
    .encodeDensity({ field: "value", groupBy: "group", bandwidth: 1 })
    .encodeColor({ field: "group" })
    .createData({ id: "second", values: [
      { value: 1, group: "B" }, { value: 2, group: "B" }
    ] })
    .createAreaMark({ id: "secondArea" })
    .encodeDensity({ field: "value", groupBy: "group", bandwidth: 1 })
    .encodeColor({ field: "group" });

  assert.deepEqual(program.resolvedScales.color.domain, ["A", "B"]);
  assert.equal(
    program.graphicSpec.objects.firstArea.items[0].properties.fill,
    "#4c78a8"
  );
  assert.equal(
    program.graphicSpec.objects.secondArea.items[0].properties.fill,
    "#f58518"
  );
});

test("requires area color to match existing grouping", () => {
  const area = densityArea();
  assert.throws(
    () => area.encodeColor({ field: "Acceleration_value" }),
    /must match an existing group encoding/
  );
  const ungrouped = chart()
    .createCanvas()
    .createData({ id: "data", values: [{ value: 1 }, { value: 2 }] })
    .createAreaMark({ id: "area" })
    .encodeDensity({ field: "value", bandwidth: 1 });
  assert.throws(
    () => ungrouped.encodeColor({ field: "value_value" }),
    /must match an existing group encoding/
  );
});

test("authors a raw centered area through one color layout assignment", () => {
  const before = rawArea();
  const program = before.encodeColor({
    target: "stream",
    field: "group",
    layout: "center"
  });
  const layer = program.semanticSpec.layers[0];
  const colorTrace = program.trace.children.at(-1);

  assert.deepEqual(layer.encoding.group, {
    field: "group",
    fieldType: "nominal",
    inferredFrom: "color"
  });
  assert.deepEqual(layer.encoding.y, {
    field: "value",
    fieldType: "quantitative",
    scale: "y"
  });
  assert.deepEqual(layer.encoding.color, {
    field: "group",
    fieldType: "nominal",
    scale: "color"
  });
  assert.deepEqual(program.resolvedScales.y.domain, [-3, 3]);
  assert.deepEqual(program.resolvedScales.color.domain, ["A", "B"]);
  assert.equal(program.graphicSpec.objects.stream.items.length, 2);
  assert.deepEqual(
    program.graphicSpec.objects.stream.items.map(item => item.properties.fill),
    ["#4c78a8", "#f58518"]
  );
  assert.equal(before.semanticSpec.layers[0].encoding.group, undefined);
  assert.deepEqual(
    colorTrace.children.filter(node => ["layoutSeries"].includes(node.op))
      .map(node => node.op),
    ["layoutSeries"]
  );
});

test("keeps direct center y assignment independent of x/y authoring order", () => {
  const base = chart()
    .createCanvas({ width: 120, height: 120, margin: 10 })
    .createData({ id: "series", values: CENTER_ROWS })
    .createAreaMark({ id: "stream", opacity: 1 })
    .encodeGroup({ target: "stream", field: "group" });
  const yThenX = base
    .encodeY({ target: "stream", field: "value", stack: "center" })
    .encodeX({ target: "stream", field: "x" });
  const xThenY = base
    .encodeX({ target: "stream", field: "x" })
    .encodeY({ target: "stream", field: "value", stack: "center" });

  assert.deepEqual(yThenX.semanticSpec.layers, xThenY.semanticSpec.layers);
  assert.deepEqual(
    [...yThenX.semanticSpec.scales].sort((left, right) => left.id.localeCompare(right.id)),
    [...xThenY.semanticSpec.scales].sort((left, right) => left.id.localeCompare(right.id))
  );
  assert.deepEqual(yThenX.resolvedScales, xThenY.resolvedScales);
  assert.deepEqual(yThenX.graphicSpec, xThenY.graphicSpec);
});

test("replays centered paths across selection, filtering, Canvas, and facets", () => {
  const base = rawArea().encodeColor({ field: "group", layout: "center" });
  const highlighted = base.highlightMarks({
    select: { field: "group", op: "eq", value: "B" },
    fill: "#111111",
    dimOthers: true
  });
  const filtered = base.filterMarks({
    field: "group",
    op: "eq",
    value: "A"
  });
  const resized = base.editCanvas({ width: 180, height: 150 });
  const faceted = base.facet({ field: "group", columns: 2 });

  assert.equal(highlighted.graphicSpec.objects.stream.items.at(-1).properties.fill, "#111111");
  assert.equal(highlighted.graphicSpec.objects.stream.items[0].properties.opacity < 1, true);
  assert.equal(filtered.graphicSpec.objects.stream.items.length, 1);
  assert.deepEqual(filtered.resolvedScales.color.domain, ["A"]);
  assert.notDeepEqual(
    resized.graphicSpec.objects.stream.items[0].properties.commands,
    base.graphicSpec.objects.stream.items[0].properties.commands
  );
  assert.deepEqual(faceted.compositionSpec.children, ["facet-cell-1", "facet-cell-2"]);
  assert.deepEqual(
    Object.values(faceted.children).map(child =>
      child.graphicSpec.objects.stream.items.length
    ),
    [1, 1]
  );
});

test("keeps zero-total center partitions materializable", () => {
  const rows = CENTER_ROWS.map(row => ({ ...row, value: 0 }));
  const program = rawArea(rows).encodeColor({
    field: "group",
    layout: "center"
  });

  assert.equal(program.graphicSpec.objects.stream.items.length, 2);
  assert.equal(program.resolvedScales.y.domain[0] <= 0, true);
  assert.equal(program.resolvedScales.y.domain[1] >= 0, true);
});

test("rejects invalid center topology, clipping domains, and centered bars atomically", () => {
  const negative = CENTER_ROWS.map((row, index) =>
    index === 0 ? { ...row, value: -1 } : row
  );
  const negativeArea = rawArea(negative);
  assert.throws(
    () => negativeArea.encodeColor({ field: "group", layout: "center" }),
    /non-negative values/
  );
  assert.equal(negativeArea.semanticSpec.layers[0].encoding.group, undefined);

  const incomplete = rawArea(CENTER_ROWS.slice(0, -1));
  assert.throws(
    () => incomplete.encodeColor({ field: "group", layout: "center" }),
    /aligned/
  );

  const clipped = chart()
    .createCanvas()
    .createData({ values: CENTER_ROWS })
    .createAreaMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "value", scale: { domain: [-1, 1] } });
  assert.throws(
    () => clipped.encodeColor({ field: "group", layout: "center" }),
    /explicit domain must contain every centered bound/
  );

  const bars = chart()
    .createCanvas()
    .createData({ values: [{ group: "A", value: 2 }] })
    .createBarMark()
    .encodeX({ field: "group", fieldType: "ordinal" });
  assert.throws(
    () => bars.encodeY({ field: "value", aggregate: "sum", stack: "center" }),
    /Centered bars are not supported/
  );
  assert.throws(
    () => bars.encodeY({ field: "value", aggregate: "sum" })
      .encodeColor({ field: "group", layout: "center" }),
    /Centered bars are not supported/
  );

  const overlay = densityArea()
    .encodeColor({ field: "Origin", layout: "overlay" });
  assert.equal(overlay.encodeY({ field: "Acceleration_density", stack: "center" }).semanticSpec.layers[0].layout.mode, "center");
});
