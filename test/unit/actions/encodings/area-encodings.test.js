import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";
import { createCarsRegressionScatterplotValues } from
  "../../../charts/regression-scatterplot/reference-values.js";
import { loadCars } from "../../../support/data.js";
import { linearPathCommands } from "../../../support/path.js";

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
      length: child.properties.commands.length,
      closed: child.properties.commands.at(-1).op === "Z",
      fill: child.properties.fill,
      opacity: child.properties.opacity
    })),
    [
      { length: 97, closed: true, fill: "#111111", opacity: 0.18 },
      { length: 51, closed: true, fill: "#111111", opacity: 0.18 }
    ]
  );
});

test("matches primitive confidence-band geometry", () => {
  const expected = createCarsRegressionScatterplotValues(loadCars());
  const program = createBand(regressionBase());
  assert.deepEqual(
    program.graphicSpec.objects.regressionBand.children.map(child => child.properties),
    expected.regressionBands.map(band => ({
      commands: linearPathCommands(band.points, { close: true }),
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

test("stores and reassigns horizontal ranged areas atomically", () => {
  const rows = [
    { Year: "1970-01-01", low: 10, high: 13, nextLow: 9, nextHigh: 14 },
    { Year: "1971-01-01", low: 12, high: 15, nextLow: 14, nextHigh: 18 }
  ];
  const before = chart()
    .createCanvas({ width: 400, height: 300, margin: 30 })
    .createData({ values: rows })
    .createAreaMark()
    .encodeY({ field: "Year", fieldType: "temporal" })
    .encodeXRange({ lower: "low", upper: "high" });
  const after = before.encodeXRange({
    lower: "nextLow",
    upper: "nextHigh"
  });

  assert.deepEqual(before.semanticSpec.layers[0].encoding, {
    y: { field: "Year", fieldType: "temporal", scale: "y" },
    x: { field: "low", fieldType: "quantitative", scale: "x" },
    x2: { field: "high", fieldType: "quantitative", scale: "x" }
  });
  assert.equal(
    before.graphicSpec.objects.area.children[0].properties.commands.at(-1).op,
    "Z"
  );
  assert.equal(after.semanticSpec.layers[0].encoding.x.field, "nextLow");
  assert.equal(after.semanticSpec.layers[0].encoding.x2.field, "nextHigh");
  assert.deepEqual(
    after.trace.children.at(-1).children.map(child => child.op),
    ["encodeX", "encodeX2"]
  );
  assert.notDeepEqual(after.graphicSpec.objects.area, before.graphicSpec.objects.area);
  assert.equal(before.semanticSpec.layers[0].encoding.x.field, "low");
});

test("validates horizontal range prerequisites and shared scales", () => {
  const rows = [
    { Year: "1970-01-01", low: 10, high: 13 },
    { Year: "1971-01-01", low: 12, high: 15 }
  ];
  const area = chart()
    .createCanvas({ width: 400, height: 300, margin: 30 })
    .createData({ values: rows })
    .createAreaMark()
    .encodeY({ field: "Year", fieldType: "temporal" });

  assert.throws(
    () => area.encodeX2({ field: "high" }),
    /existing x encoding/
  );
  assert.throws(
    () => area.encodeXRange({ lower: "low", upper: "missing" }),
    /must contain a finite number/
  );
  assert.throws(
    () => area
      .encodeX({ field: "low", scale: { id: "interval" } })
      .encodeX2({ field: "high", scale: { id: "other" } }),
    /must share one scale/
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
