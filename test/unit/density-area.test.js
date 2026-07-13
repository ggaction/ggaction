import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../src/core/ChartProgram.js";
import { createCarsDensityAreaValues } from
  "../fixtures/carsDensityAreaValues.js";
import { loadCars } from "../fixtures/data.js";

function densityData({ groupBy = "Origin" } = {}) {
  return chart()
    .createCanvas({
      width: 720,
      height: 500,
      margin: { top: 130, right: 40, bottom: 70, left: 80 }
    })
    .createData({ id: "cars", values: loadCars() })
    .createDensityData({
      id: "density",
      field: "Acceleration",
      ...(groupBy === null ? {} : { groupBy }),
      bandwidth: 0.6
    });
}

function yDensityArea() {
  return densityData()
    .createAreaMark({ id: "densities", data: "density", opacity: 0.5 })
    .encodeX({
      field: "Acceleration_value",
      scale: { nice: false, zero: false }
    })
    .encodeY({
      field: "Acceleration_density",
      scale: { nice: true, zero: true }
    })
    .encodeGroup({ field: "Origin" });
}

test("materializes grouped y-density paths against a zero baseline", () => {
  const expected = createCarsDensityAreaValues(loadCars());
  const program = yDensityArea();
  const paths = program.graphicSpec.objects.densities.children;

  assert.deepEqual(
    paths.map(child => child.properties.points),
    expected.areas.map(area => area.points)
  );
  assert.deepEqual(
    paths.map(child => ({
      closed: child.properties.closed,
      fill: child.properties.fill,
      opacity: child.properties.opacity
    })),
    expected.areas.map(() => ({
      closed: true,
      fill: "#4c78a8",
      opacity: 0.5
    }))
  );
});

test("materializes an ungrouped x-density path against a zero baseline", () => {
  const program = densityData({ groupBy: null })
    .createAreaMark({ id: "density", data: "density" })
    .encodeX({
      field: "Acceleration_density",
      scale: { nice: true, zero: true }
    })
    .encodeY({
      field: "Acceleration_value",
      scale: { nice: false, zero: false }
    });
  const points = program.graphicSpec.objects.density.children[0].properties.points;
  const baseline = program.resolvedScales.x.range[0];

  assert.equal(points.length, 102);
  assert.equal(points[0].x, baseline);
  assert.equal(points.at(-1).x, baseline);
  assert.ok(points.slice(1, -1).some(point => point.x > baseline));
  assert.ok(points[0].y > points.at(-1).y);
});

test("rematerializes density paths after Canvas edits", () => {
  const before = yDensityArea();
  const after = before.editCanvas({ width: 820 });

  assert.notDeepEqual(
    after.graphicSpec.objects.densities,
    before.graphicSpec.objects.densities
  );
  assert.equal(
    after.trace.children.at(-1).children.some(
      child => child.op === "rematerializeAreaMark"
    ),
    true
  );
});

test("validates density area fields, grouping, samples, and zero domains", () => {
  assert.throws(
    () => densityData()
      .createAreaMark({ id: "densities", data: "density" })
      .encodeX({ field: "Acceleration_value" })
      .encodeY({ field: "Acceleration_value" })
      .encodeGroup({ field: "Origin" }),
    /must encode its value and density fields/
  );
  assert.throws(
    () => densityData()
      .createAreaMark({ id: "densities", data: "density" })
      .encodeX({ field: "Acceleration_value" })
      .encodeY({ field: "Acceleration_density", scale: { zero: true } })
      .encodeGroup({ field: "Acceleration_value" }),
    /must group by "Origin"/
  );
  assert.throws(
    () => densityData({ groupBy: null })
      .createAreaMark({ id: "density", data: "density" })
      .encodeX({ field: "Acceleration_value" })
      .encodeY({
        field: "Acceleration_density",
        scale: { domain: [0.01, 0.3], zero: true }
      }),
    /domain containing zero/
  );
  const tooShort = chart()
    .createCanvas()
    .createData({ id: "source", values: [{ value: 1 }, { value: 2 }] })
    .createDerivedData({
      id: "density",
      source: "source",
      transform: [{
        type: "density",
        field: "value",
        bandwidth: 1,
        extent: [0, 2],
        steps: 2,
        as: ["sample", "estimate"],
        resolve: "shared"
      }]
    })
    .editSemantic({ property: "dataset[density].values", value: [
      { sample: 1, estimate: 0.2 }
    ] })
    .createAreaMark({ id: "density", data: "density" })
    .encodeX({ field: "sample", scale: { zero: false } });
  assert.throws(
    () => tooShort.encodeY({ field: "estimate", scale: { zero: true } }),
    /at least two points/
  );
});
