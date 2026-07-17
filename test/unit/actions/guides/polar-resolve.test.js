import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";
import {
  mapPolarGuideValues,
  normalizePolarTickMode,
  polarGuideNames,
  resolvePolarGuideResources
} from "../../../../src/actions/guides/polar/resolve.js";

function polarProgram() {
  return chart()
    .createCanvas({ width: 300, height: 300, margin: 30 })
    .createData({ values: [
      { a: 0, r: 0 },
      { a: 10, r: 20 }
    ] })
    .createPointMark()
    .encodeTheta({ field: "a" })
    .encodeR({ field: "r", scale: { zero: true } });
}

test("resolves unique Polar guide resources and stable names", () => {
  const program = polarProgram();
  assert.deepEqual(polarGuideNames("theta"), {
    channel: "theta",
    axis: "thetaAxis",
    line: "thetaAxisLine",
    ticks: "thetaAxisTicks",
    labels: "thetaAxisLabels",
    title: "thetaAxisTitle",
    grid: "thetaGridLines"
  });
  const resource = resolvePolarGuideResources(
    program,
    "radial",
    {},
    "createRadialGrid"
  );
  assert.equal(resource.channel, "radius");
  assert.equal(resource.scale, "radius");
  assert.equal(resource.coordinate, "polar");
  assert.equal(resource.before, "point");
  assert.equal(resource.parent, "plot-main");
});

test("shares Polar tick value generation and scale mapping", () => {
  const program = polarProgram();
  const thetaConfig = {
    scale: "theta",
    ...normalizePolarTickMode(program, "theta", { count: 3 }, 6)
  };
  const radiusConfig = {
    scale: "radius",
    ...normalizePolarTickMode(program, "radius", { values: [0, 20] }, 5)
  };

  const theta = mapPolarGuideValues(program, thetaConfig);
  const radius = mapPolarGuideValues(program, radiusConfig);
  assert.equal(theta.values.length >= 2, true);
  assert.equal(theta.positions.every(Number.isFinite), true);
  assert.deepEqual(radius.values, [0, 20]);
  assert.deepEqual(radius.positions, [0, 120]);
});

test("rejects ambiguous or incompatible Polar guide ownership", () => {
  const cartesian = chart()
    .createCanvas()
    .createData({ values: [{ x: 1, y: 2 }] })
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
  assert.throws(
    () => resolvePolarGuideResources(
      cartesian,
      "theta",
      {},
      "createThetaGrid"
    ),
    /stored theta encoding/
  );
  assert.throws(() => polarGuideNames("angle"), /Unknown Polar guide kind/);
});
