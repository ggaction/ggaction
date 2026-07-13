import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/core/ChartProgram.js";
import { createCarsRegressionScatterplotValues } from
  "../../../fixtures/carsRegressionScatterplotValues.js";
import { loadCars } from "../../../support/data.js";

function pointProgram() {
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
    .encodeColor({ field: "Origin", scale: { palette: "tableau10" } })
    .encodeSize({ field: "Acceleration" })
    .encodeShape({ field: "Origin" })
    .encodeOpacity({ value: 0.27 });
}

test("infers a complete grouped regression from the current point mark", () => {
  const before = pointProgram();
  const program = before.createRegression();

  assert.deepEqual(
    program.semanticSpec.layers.map(layer => [layer.id, layer.mark.type]),
    [
      ["points", "point"],
      ["pointsRegressionBands", "area"],
      ["pointsRegressionLines", "line"]
    ]
  );
  assert.deepEqual(program.graphicSpec.order, [
    "canvas", "points", "pointsRegressionBands", "pointsRegressionLines"
  ]);
  assert.equal(program.semanticSpec.datasets[2].source, "selectedCars");
  assert.equal(program.semanticSpec.datasets[2].transform[0].x, "Displacement");
  assert.equal(program.semanticSpec.datasets[2].transform[0].y, "Acceleration");
  assert.equal(program.semanticSpec.datasets[2].transform[0].groupBy, "Origin");
  assert.equal(before.semanticSpec.datasets.length, 2);
  assert.equal(before.graphicSpec.objects.pointsRegressionBands, undefined);
});

test("matches primitive band and line graphics exactly", () => {
  const expected = createCarsRegressionScatterplotValues(loadCars());
  const program = pointProgram().createRegression({
    confidence: 0.95,
    band: { color: "#111111", opacity: 0.18 },
    line: { strokeWidth: 3 }
  });

  assert.deepEqual(
    program.graphicSpec.objects.pointsRegressionBands.children.map(
      child => child.properties
    ),
    expected.regressionBands.map(band => ({
      points: band.points,
      closed: true,
      fill: band.fill,
      opacity: band.opacity
    }))
  );
  assert.deepEqual(
    program.graphicSpec.objects.pointsRegressionLines.children.map(
      child => child.properties
    ),
    expected.regressionLines.map(line => ({
      points: line.points,
      stroke: line.stroke,
      strokeWidth: line.strokeWidth,
      strokeDash: line.strokeDash
    }))
  );
});

test("records the regression aggregate and component hierarchy", () => {
  const program = pointProgram().createRegression();
  const node = program.trace.children.at(-1);
  assert.deepEqual(node.children.map(child => child.op), [
    "createRegressionData",
    "createRegressionBand",
    "createRegressionLine"
  ]);
  assert.deepEqual(node.children[1].children.map(child => child.op), [
    "createAreaMark",
    "encodeX",
    "encodeYRange",
    "encodeGroup",
    "rematerializeAreaMark"
  ]);
  assert.deepEqual(node.children[2].children.map(child => child.op), [
    "createLineMark",
    "encodeX",
    "encodeY",
    "encodeColor",
    "encodeGroup",
    "rematerializeLineMark"
  ]);
});

test("rematerializes every regression layer after Canvas edits", () => {
  const before = pointProgram().createRegression();
  const after = before.editCanvas({ width: 860 });
  assert.notDeepEqual(after.graphicSpec.objects.points, before.graphicSpec.objects.points);
  assert.notDeepEqual(
    after.graphicSpec.objects.pointsRegressionBands,
    before.graphicSpec.objects.pointsRegressionBands
  );
  assert.notDeepEqual(
    after.graphicSpec.objects.pointsRegressionLines,
    before.graphicSpec.objects.pointsRegressionLines
  );
});

test("supports explicit ungrouped regression without series encodings", () => {
  const program = pointProgram().createRegression({
    target: "points",
    x: "Displacement",
    y: "Acceleration",
    groupBy: undefined,
    band: { color: "#222222", opacity: 0.25 },
    line: { strokeWidth: 2 }
  });
  const band = program.semanticSpec.layers[1];
  const line = program.semanticSpec.layers[2];

  assert.equal(program.semanticSpec.datasets[2].transform[0].groupBy, undefined);
  assert.equal(band.encoding.group, undefined);
  assert.equal(line.encoding.group, undefined);
  assert.equal(line.encoding.color, undefined);
  assert.equal(
    program.graphicSpec.objects.pointsRegressionBands.children.length,
    1
  );
  assert.equal(
    program.graphicSpec.objects.pointsRegressionLines.children.length,
    1
  );
  assert.equal(
    program.graphicSpec.objects.pointsRegressionBands.children[0].properties.fill,
    "#222222"
  );
  assert.equal(
    program.graphicSpec.objects.pointsRegressionLines.children[0].properties.strokeWidth,
    2
  );
});

test("namespaces regression resources by point mark", () => {
  const program = pointProgram()
    .createPointMark({ id: "other", data: "selectedCars" })
    .encodeX({ target: "other", field: "Displacement" })
    .encodeY({ target: "other", field: "Acceleration" })
    .createRegression({ target: "points" })
    .createRegression({ target: "other", groupBy: undefined });

  assert.deepEqual(
    program.semanticSpec.datasets.slice(2).map(dataset => dataset.id),
    ["pointsRegressionData", "otherRegressionData"]
  );
  assert.deepEqual(
    program.semanticSpec.layers.slice(2).map(layer => layer.id),
    [
      "pointsRegressionBands",
      "pointsRegressionLines",
      "otherRegressionBands",
      "otherRegressionLines"
    ]
  );
});

test("requires explicit choices for ambiguous targets and groups", () => {
  const twoPoints = pointProgram()
    .createPointMark({ id: "other", data: "selectedCars" })
    .encodeX({ field: "Displacement" })
    .encodeY({ field: "Acceleration" })
    ._withContext({ currentMark: undefined });
  assert.throws(() => twoPoints.createRegression(), /target is ambiguous/);

  const ambiguousGroup = chart()
    .createCanvas({ width: 200, height: 120, margin: 10 })
    .createData({ id: "data", values: [
      { x: 0, y: 0, a: "A", b: "X" },
      { x: 1, y: 1, a: "A", b: "Y" },
      { x: 2, y: 2, a: "B", b: "X" },
      { x: 3, y: 3, a: "B", b: "Y" }
    ] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "a" })
    .encodeShape({ field: "b" });
  assert.throws(() => ambiguousGroup.createRegression(), /groupBy is ambiguous/);
  assert.throws(
    () => pointProgram().createRegression({ band: { extra: true } }),
    /Unknown regression band option/
  );
  assert.throws(
    () => chart().createRegression(),
    /eligible quantitative point mark/
  );
  assert.throws(
    () => pointProgram().createRegression({ target: "missing" }),
    /Unknown regression point target/
  );
  assert.throws(
    () => pointProgram().createRegression({ x: "" }),
    /Regression x must be a non-empty string/
  );
  assert.throws(
    () => pointProgram().createRegression({ line: [] }),
    /Regression line must be a plain object/
  );
});
