import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/core/ChartProgram.js";
import { createCarsRegressionScatterplotValues } from
  "../../../fixtures/carsRegressionScatterplotValues.js";
import { loadCars } from "../../../support/data.js";

function regressionBase() {
  const cars = loadCars();
  return chart()
    .createCanvas({
      width: 760,
      height: 480,
      margin: { top: 40, right: 190, bottom: 70, left: 80 }
    })
    .createData({ id: "cars", values: cars })
    .filterData({
      id: "selectedCars",
      field: "Origin",
      oneOf: ["Japan", "USA"]
    })
    .createPointMark({ id: "points" })
    .encodeX({ field: "Displacement", scale: { nice: true, zero: false } })
    .encodeY({ field: "Acceleration", scale: { nice: true, zero: false } })
    .createRegressionData({
      id: "regressionData",
      source: "selectedCars",
      x: "Displacement",
      y: "Acceleration",
      groupBy: "Origin"
    });
}

function createBand(program) {
  return program
    .createAreaMark({
      id: "regressionBand",
      data: "regressionData",
      fill: "#111111",
      opacity: 0.18
    })
    .encodeX({ field: "Displacement" })
    .encodeYRange({
      lower: "__regression_ci_lower",
      upper: "__regression_ci_upper"
    })
    .encodeGroup({ field: "Origin" });
}

test("stores ranged area semantics and grouped closed paths", () => {
  const program = createBand(regressionBase());
  const layer = program.semanticSpec.layers.find(item => item.id === "regressionBand");
  assert.deepEqual(layer.encoding, {
    x: { field: "Displacement", fieldType: "quantitative", scale: "x" },
    y: {
      field: "__regression_ci_lower",
      fieldType: "quantitative",
      scale: "y"
    },
    y2: {
      field: "__regression_ci_upper",
      fieldType: "quantitative",
      scale: "y"
    },
    group: { field: "Origin", fieldType: "nominal" }
  });
  assert.deepEqual(program.resolvedScales.y.domain, [6, 24]);
  assert.deepEqual(
    program.graphicSpec.objects.regressionBand.children.map(child => ({
      length: child.properties.points.length,
      closed: child.properties.closed,
      fill: child.properties.fill,
      opacity: child.properties.opacity
    })),
    [
      { length: 96, closed: true, fill: "#111111", opacity: 0.18 },
      { length: 50, closed: true, fill: "#111111", opacity: 0.18 }
    ]
  );
});

test("matches primitive confidence-band geometry", () => {
  const expected = createCarsRegressionScatterplotValues(loadCars());
  const program = createBand(regressionBase());
  assert.deepEqual(
    program.graphicSpec.objects.regressionBand.children.map(child => child.properties),
    expected.regressionBands.map(band => ({
      points: band.points,
      closed: band.closed,
      fill: band.fill,
      opacity: band.opacity
    }))
  );
});

test("records atomic range and group action hierarchies", () => {
  const withX = regressionBase()
    .createAreaMark({ id: "band", data: "regressionData" })
    .encodeX({ field: "Displacement" });
  const ranged = withX.encodeYRange({
    lower: "__regression_ci_lower",
    upper: "__regression_ci_upper"
  });
  const rangeNode = ranged.trace.children.at(-1);
  assert.deepEqual(rangeNode.children.map(child => child.op), ["encodeY", "encodeY2"]);
  const grouped = ranged.encodeGroup({ field: "Origin" });
  assert.deepEqual(
    grouped.trace.children.at(-1).children.map(child => child.op),
    ["editSemantic", "editSemantic", "rematerializeAreaMark"]
  );
});

test("rematerializes area geometry after Canvas edits and validates contracts", () => {
  const before = createBand(regressionBase());
  const after = before.editCanvas({ width: 860 });
  assert.notDeepEqual(
    after.graphicSpec.objects.regressionBand,
    before.graphicSpec.objects.regressionBand
  );
  assert.equal(
    after.trace.children.at(-1).children.some(
      child => child.op === "rematerializeAreaMark"
    ),
    true
  );
  assert.throws(
    () => regressionBase().createAreaMark({ id: "band", opacity: 2 }),
    /from 0 to 1/
  );
  assert.throws(
    () => regressionBase()
      .createAreaMark({ id: "band", data: "regressionData" })
      .encodeY2({ field: "__regression_ci_upper" }),
    /existing y encoding/
  );
});
