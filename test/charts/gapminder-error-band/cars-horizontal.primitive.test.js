import assert from "node:assert/strict";
import test from "node:test";

import { loadCars } from "../../support/data.js";
import { linearPathCommands } from "../../support/path.js";
import { createCarsHorizontalErrorBandPrimitives } from
  "./cars-horizontal.primitive.program.js";
import {
  CARS_HORIZONTAL_FIELDS,
  createCarsHorizontalErrorBandReferenceValues
} from "./cars-horizontal.reference-values.js";

function flattenActions(node) {
  return [node, ...(node.children ?? []).flatMap(flattenActions)];
}

test("locks independent year-wise Acceleration confidence intervals", () => {
  const values = createCarsHorizontalErrorBandReferenceValues(loadCars());

  assert.equal(values.rows.length, 12);
  assert.equal(values.validCars.length, 406);
  assert.deepEqual(values.scales.x.domain, [10, 20]);
  assert.deepEqual(values.scales.y.domain, [
    Date.UTC(1970, 0, 1),
    Date.UTC(1982, 0, 1)
  ]);
  assert.deepEqual(values.axes.x.ticks.map(tick => tick.value), [
    10, 12, 14, 16, 18, 20
  ]);
  assert.deepEqual(values.axes.y.ticks.map(tick => tick.label), [
    "1970", "1972", "1974", "1976", "1978", "1980", "1982"
  ]);

  const year1970 = values.intervals.find(row => row.Year === "1970-01-01");
  assert.equal(year1970.count, 35);
  assert.ok(Math.abs(year1970.mean - 12.714285714285714) < 1e-12);
  assert.ok(Math.abs(year1970.lower - 11.581641170092634) < 1e-12);
  assert.ok(Math.abs(year1970.upper - 13.846930258478793) < 1e-12);

  const year1982 = values.intervals.find(row => row.Year === "1982-01-01");
  assert.equal(year1982.count, 61);
  assert.ok(Math.abs(year1982.mean - 16.460655737704922) < 1e-12);
  assert.ok(Math.abs(year1982.lower - 15.86676915406075) < 1e-12);
  assert.ok(Math.abs(year1982.upper - 17.054542321349096) < 1e-12);

  assert.deepEqual(
    values.ordered.map(row => row.time),
    [...values.ordered.map(row => row.time)].sort((left, right) => left - right)
  );
  for (const row of values.rows) {
    assert.ok(row[CARS_HORIZONTAL_FIELDS.lower] <= row[CARS_HORIZONTAL_FIELDS.center]);
    assert.ok(row[CARS_HORIZONTAL_FIELDS.center] <= row[CARS_HORIZONTAL_FIELDS.upper]);
  }
});

test("normalizes ISO-like string years without accepting arbitrary date strings", () => {
  const values = createCarsHorizontalErrorBandReferenceValues([
    { Year: "1970-01-01", Acceleration: 10 },
    { Year: "1970-01-01", Acceleration: 12 },
    { Year: "1971/01/01", Acceleration: 100 },
    { Year: "not-a-date", Acceleration: 100 }
  ]);

  assert.equal(values.validCars.length, 2);
  assert.deepEqual(values.normalizedTimes, [
    Date.UTC(1970, 0, 1),
    Date.UTC(1970, 0, 1)
  ]);
  assert.equal(values.rows[0][CARS_HORIZONTAL_FIELDS.center], 11);
});

test("authors the Cars horizontal error band with raw primitives", () => {
  const cars = loadCars();
  const values = createCarsHorizontalErrorBandReferenceValues(cars);
  const program = createCarsHorizontalErrorBandPrimitives(cars);
  const area = program.semanticSpec.layers.find(item => item.id === "errorBand");
  const lower = program.semanticSpec.layers.find(
    item => item.id === "errorBandLowerBoundary"
  );
  const upper = program.semanticSpec.layers.find(
    item => item.id === "errorBandUpperBoundary"
  );
  const dataset = program.semanticSpec.datasets.find(
    item => item.id === "errorBandIntervalData"
  );

  assert.equal(area.mark.type, "area");
  assert.equal(area.data, "errorBandIntervalData");
  assert.equal(area.encoding.y.field, "Year");
  assert.equal(area.encoding.y.fieldType, "temporal");
  assert.equal(area.encoding.x.field, CARS_HORIZONTAL_FIELDS.lower);
  assert.equal(area.encoding.x2.field, CARS_HORIZONTAL_FIELDS.upper);
  assert.equal(area.encoding.x.scale, area.encoding.x2.scale);
  assert.equal(lower.mark.type, "line");
  assert.equal(lower.encoding.x.field, CARS_HORIZONTAL_FIELDS.lower);
  assert.equal(upper.mark.type, "line");
  assert.equal(upper.encoding.x.field, CARS_HORIZONTAL_FIELDS.upper);
  assert.deepEqual(dataset.transform, [values.transform]);
  assert.deepEqual(dataset.values, values.rows);

  assert.deepEqual(
    program.graphicSpec.objects.errorBand.children[0].properties.commands,
    linearPathCommands(values.band.points, { close: true })
  );
  assert.deepEqual(
    program.graphicSpec.objects.errorBandLowerBoundary.children[0].properties.commands,
    linearPathCommands(values.boundaries.lower.points)
  );
  assert.deepEqual(
    program.graphicSpec.objects.errorBandUpperBoundary.children[0].properties.commands,
    linearPathCommands(values.boundaries.upper.points)
  );

  const order = program.graphicSpec.order;
  assert.ok(order.indexOf("verticalGridLines") < order.indexOf("errorBand"));
  assert.ok(order.indexOf("errorBand") < order.indexOf("errorBandLowerBoundary"));
  assert.ok(
    order.indexOf("errorBandLowerBoundary") <
      order.indexOf("errorBandUpperBoundary")
  );
  assert.ok(order.indexOf("errorBandUpperBoundary") < order.indexOf("xAxisLine"));
  assert.deepEqual(values.grid.horizontal, []);
  assert.equal(values.grid.vertical.length, values.axes.x.ticks.length);

  const operations = flattenActions(program.trace).map(node => node.op);
  assert.equal(operations.includes("createErrorBand"), false);
  assert.equal(operations.includes("createIntervalData"), false);
  assert.equal(operations.includes("encodeXRange"), false);
  assert.equal(operations.includes("createErrorBandBoundary"), false);
});

test("owns valid rows and rejects a dataset without valid Cars values", () => {
  const cars = loadCars();
  const values = createCarsHorizontalErrorBandReferenceValues(cars);
  const original = structuredClone(values.validCars[0]);

  cars[0].Acceleration = 999;
  assert.deepEqual(values.validCars[0], original);
  assert.throws(
    () => createCarsHorizontalErrorBandReferenceValues([
      { Year: "1970/01/01", Acceleration: 10 }
    ]),
    /at least one valid car row/
  );
});
