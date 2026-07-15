import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";
import { createCarsRegressionScatterplot } from
  "../../../../examples/cars-regression-scatterplot/program.js";
import { loadCars } from "../../../support/data.js";

const cars = loadCars();

test("edits regression components through nested generic mark actions", () => {
  const baseline = createCarsRegressionScatterplot(cars);
  const program = baseline
    .editRegressionBand({
      color: "#475569",
      opacity: 0.12,
      stroke: "#111827",
      strokeWidth: 1.5
    })
    .editRegressionLine({ strokeWidth: 5, curve: "step" });

  assert.ok(program.graphicSpec.objects.pointsRegressionBands.children.every(
    child => child.properties.fill === "#475569" &&
      child.properties.opacity === 0.12 &&
      child.properties.stroke === "#111827" &&
      child.properties.strokeWidth === 1.5
  ));
  assert.ok(program.graphicSpec.objects.pointsRegressionLines.children.every(
    child => child.properties.strokeWidth === 5
  ));
  assert.equal(program.markConfigs.pointsRegressionLines.curve, "step");
  assert.deepEqual(
    program.trace.children.at(-2).children.map(child => child.op),
    ["editAreaMark"]
  );
  assert.deepEqual(
    program.trace.children.at(-1).children.map(child => child.op),
    ["editLineMark"]
  );
  assert.notDeepEqual(
    program.graphicSpec.objects.pointsRegressionBands,
    baseline.graphicSpec.objects.pointsRegressionBands
  );
  assert.equal(
    baseline.graphicSpec.objects.pointsRegressionBands.children[0].properties.stroke,
    undefined
  );
});

test("forwards create-time regression component appearance", () => {
  const points = createCarsRegressionScatterplot(cars);
  const extra = points
    .createPointMark({ id: "other", data: "selectedCars" })
    .encodeX({ target: "other", field: "Displacement" })
    .encodeY({ target: "other", field: "Acceleration" })
    .createRegression({
      target: "other",
      groupBy: undefined,
      band: { stroke: "#222222", strokeWidth: 2 },
      line: { curve: "step" }
    });

  assert.equal(extra.markConfigs.otherRegressionBands.stroke, "#222222");
  assert.equal(extra.markConfigs.otherRegressionBands.strokeWidth, 2);
  assert.equal(extra.markConfigs.otherRegressionLines.curve, "step");
});

test("rejects non-regression targets and invalid component edits", () => {
  const program = createCarsRegressionScatterplot(cars);
  assert.throws(() => program.editRegressionBand({}), /requires color, opacity/);
  assert.throws(() => program.editRegressionLine({}), /requires strokeWidth or curve/);
  assert.throws(
    () => program.editRegressionBand({ target: "densities", opacity: 0.2 }),
    /Unknown regression band target/
  );
  assert.throws(
    () => program.editRegressionLine({ target: "points", strokeWidth: 2 }),
    /Unknown regression line target/
  );
  assert.throws(
    () => program.editRegressionBand({ stroke: false, strokeWidth: 2 }),
    /while removing stroke/
  );
  assert.throws(
    () => program.editRegressionLine({ curve: "smooth" }),
    /Unsupported curve/
  );
  assert.throws(
    () => program.editRegressionBand({ extra: true }),
    /Unknown editRegressionBand option/
  );
  assert.throws(
    () => chart().editRegressionLine({ strokeWidth: 2 }),
    /requires an eligible layer/
  );
});
