import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/core/ChartProgram.js";
import { createCarsDensityAreaValues } from
  "../../../fixtures/carsDensityAreaValues.js";
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
  assert.deepEqual(program.resolvedScales.color.domain, expected.groupDomain);
  assert.deepEqual(
    program.graphicSpec.objects.densities.children.map(child => child.properties.fill),
    expected.areas.map(area => area.fill)
  );
  assert.deepEqual(
    program.graphicSpec.objects.densities.children.map(child => child.properties.points),
    before.graphicSpec.objects.densities.children.map(child => child.properties.points)
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
    program.graphicSpec.objects.densities.children.map(child => child.properties.fill),
    ["blue", "green", "red"]
  );
});

test("rematerializes colored area paths after Canvas edits", () => {
  const before = densityArea().encodeColor({ field: "Origin" });
  const after = before.editCanvas({ width: 820, height: 540 });

  assert.notDeepEqual(
    after.graphicSpec.objects.densities.children[0].properties.points,
    before.graphicSpec.objects.densities.children[0].properties.points
  );
  assert.deepEqual(
    after.graphicSpec.objects.densities.children.map(child => child.properties.fill),
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
    program.graphicSpec.objects.firstArea.children[0].properties.fill,
    "#4c78a8"
  );
  assert.equal(
    program.graphicSpec.objects.secondArea.children[0].properties.fill,
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
