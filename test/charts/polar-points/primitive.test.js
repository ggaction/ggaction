import assert from "node:assert/strict";
import test from "node:test";

import { loadCars, loadFashionTsne } from "../../support/data.js";
import { visualVariants } from "./variants/manifest.js";
import {
  createCarsPolarScatterplotPrimitives,
  createFashionTsnePolarPointPrimitives
} from "./primitive.program.js";
import {
  createPolarPointPrimitiveValues,
  polarToCartesian,
  resolvePolarFrame
} from "./reference-values.js";

function approximately(actual, expected, epsilon = 1e-9) {
  assert.equal(Math.abs(actual - expected) <= epsilon, true, `${actual} ≈ ${expected}`);
}

function nestedOperations(node) {
  return node.children.flatMap(child => [child.op, ...nestedOperations(child)]);
}

test("locks the degree orientation and rectangular Polar frame", () => {
  const frame = resolvePolarFrame({
    width: 600,
    height: 400,
    margin: { top: 20, right: 40, bottom: 60, left: 80 }
  });
  assert.deepEqual(frame.center, { x: 320, y: 180 });
  assert.equal(frame.availableRadius, 160);
  assert.deepEqual(polarToCartesian({ center: frame.center, theta: 0, radius: 100 }), {
    x: 320,
    y: 80
  });
  assert.deepEqual(polarToCartesian({ center: frame.center, theta: 90, radius: 100 }), {
    x: 420,
    y: 180
  });
  approximately(
    polarToCartesian({ center: frame.center, theta: 180, radius: 100 }).y,
    280
  );
  approximately(
    polarToCartesian({ center: frame.center, theta: 270, radius: 100 }).x,
    220
  );
});

test("validates Polar range boundaries before constructing geometry", () => {
  const rows = [{ theta: 0, radius: 1, group: "A" }, { theta: 1, radius: 2, group: "B" }];
  const options = {
    thetaField: "theta",
    radiusField: "radius",
    colorField: "group",
    width: 200,
    height: 200,
    margin: 20,
    pointRadius: 2
  };
  assert.throws(
    () => createPolarPointPrimitiveValues(rows, { ...options, thetaRange: [0, 361] }),
    /must not exceed 360/
  );
  assert.throws(
    () => createPolarPointPrimitiveValues(rows, { ...options, radiusRange: [0, 81] }),
    /must fit/
  );
  const reversed = createPolarPointPrimitiveValues(rows, {
    ...options,
    thetaRange: [360, 0],
    radiusRange: [80, 0]
  });
  assert.deepEqual(reversed.theta, [360, 0]);
  assert.deepEqual(reversed.radius, [80, 0]);
});

test("locks Cars Polar semantic and concrete geometry", () => {
  const cars = loadCars();
  const values = createPolarPointPrimitiveValues(cars, {
    thetaField: "Acceleration",
    radiusField: "Horsepower",
    colorField: "Origin",
    width: 520,
    height: 520,
    margin: 48,
    pointRadius: 3
  });
  const program = createCarsPolarScatterplotPrimitives(cars);
  const layer = program.semanticSpec.layers.find(candidate => candidate.id === "point");
  assert.equal(values.validRows.length, 400);
  assert.deepEqual(values.thetaDomain, [8, 24.8]);
  assert.deepEqual(values.radiusDomain, [46, 230]);
  assert.deepEqual(values.frame.center, { x: 260, y: 260 });
  assert.equal(values.frame.availableRadius, 212);
  assert.deepEqual(values.colorDomain, ["USA", "Europe", "Japan"]);
  assert.equal(layer.coordinate, "polar");
  assert.equal(layer.encoding.theta.scale, "theta");
  assert.equal(layer.encoding.radius.scale, "radius");
  assert.equal(program.semanticSpec.coordinates[0].type, "polar");
  assert.equal(program.graphicSpec.objects.point.items.length, 400);
  assert.deepEqual(program.graphicSpec.objects.canvas.children, ["plot-main"]);
  for (let index = 0; index < values.x.length; index += 1) {
    const distance = Math.hypot(values.x[index] - 260, values.y[index] - 260);
    assert.equal(distance <= 212 + 1e-9, true);
  }
});

test("locks dense Fashion negative-domain Polar coverage", () => {
  const rows = loadFashionTsne();
  const values = createPolarPointPrimitiveValues(rows, {
    thetaField: "x_pos",
    radiusField: "y_pos",
    colorField: "label_name",
    width: 560,
    height: 560,
    margin: 40,
    pointRadius: 1.4,
    opacity: 0.42
  });
  const program = createFashionTsnePolarPointPrimitives(rows);
  assert.equal(rows.length, 498);
  assert.deepEqual(values.thetaDomain, [-56.95741, 52.48218]);
  assert.deepEqual(values.radiusDomain, [-59.3083, 51.20051]);
  assert.equal(values.colorDomain.length, 10);
  assert.equal(Math.min(...values.radius), 0);
  assert.equal(Math.max(...values.radius), 240);
  assert.equal(program.graphicSpec.objects.point.items.length, 498);
  assert.equal(program.graphicSpec.objects.point.items[0].properties.opacity, 0.42);
  assert.equal(program.semanticSpec.scales.find(scale => scale.id === "radius").zero, false);
});

test("keeps the approved primitive as an independent baseline", () => {
  assert.equal(visualVariants.length, 2);
  for (const variant of visualVariants) {
    assert.equal(typeof variant.userFacing, "function");
    const operations = nestedOperations(variant.primitive().trace);
    for (const action of ["encodeTheta", "encodeR", "encodePointRadius"]) {
      assert.equal(operations.includes(action), false, `${variant.chart}: ${action}`);
    }
  }
});
