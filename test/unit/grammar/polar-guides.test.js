import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPolarCircleCommands,
  resolveRadialAxisLabels,
  resolveRadialAxisLine,
  resolveRadialAxisTicks,
  resolveRadialAxisTitle,
  resolveRadialCircles,
  resolveThetaAxisLabels,
  resolveThetaAxisTicks,
  resolveThetaAxisTitle,
  resolveThetaSpokes
} from "../../../src/grammar/polarGuides.js";

const frame = Object.freeze({
  centerX: 100,
  centerY: 80,
  availableRadius: 50
});

function assertCloseArray(actual, expected, tolerance = 1e-10) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => {
    assert.equal(Math.abs(value - expected[index]) < tolerance, true);
  });
}

test("builds one backend-neutral closed circle path", () => {
  const commands = buildPolarCircleCommands(frame, 25);

  assert.equal(commands.length, 6);
  assert.deepEqual(commands[0], { op: "M", x: 100, y: 55 });
  assert.deepEqual(commands.at(-1), { op: "Z" });
  assert.deepEqual(commands[2], {
    op: "C",
    x1: 125,
    y1: 93.80711874576984,
    x2: 113.80711874576984,
    y2: 105,
    x: 100,
    y: 105
  });
});

test("aligns theta spokes, ticks, and perimeter labels", () => {
  const angles = [0, 90, 180, 270];
  const spokes = resolveThetaSpokes({ frame, angles });
  const ticks = resolveThetaAxisTicks({ frame, angles, length: 6 });
  const labels = resolveThetaAxisLabels({ frame, angles, offset: 12 });

  assert.deepEqual(spokes.x1, [100, 100, 100, 100]);
  assert.deepEqual(spokes.y1, [80, 80, 80, 80]);
  assertCloseArray(spokes.x2, [100, 150, 100, 50]);
  assertCloseArray(spokes.y2, [30, 80, 130, 80]);
  assert.deepEqual(ticks.x1, spokes.x2);
  assert.deepEqual(ticks.y1, spokes.y2);
  assert.deepEqual(labels.textAlign, ["center", "left", "center", "right"]);
  assert.deepEqual(labels.textBaseline, ["bottom", "middle", "top", "middle"]);
});

test("omits the degenerate zero radial circle", () => {
  const circles = resolveRadialCircles({ frame, radii: [0, 10, 30, 50] });

  assert.deepEqual(circles.radii, [10, 30, 50]);
  assert.equal(circles.commands.length, 3);
  assert.equal(circles.commands.every(commands => commands.at(-1).op === "Z"), true);
});

test("orients arbitrary radial axes from shared vectors", () => {
  assert.deepEqual(resolveRadialAxisLine({ frame, angle: 90 }), {
    x1: 100,
    y1: 80,
    x2: 150,
    y2: 80
  });

  const ticks = resolveRadialAxisTicks({
    frame,
    angle: 90,
    radii: [0, 25, 50],
    length: 8
  });
  assert.deepEqual(ticks.x1, [100, 125, 150]);
  assert.deepEqual(ticks.x2, [100, 125, 150]);
  assert.deepEqual(ticks.y1, [76, 76, 76]);
  assert.deepEqual(ticks.y2, [84, 84, 84]);

  const labels = resolveRadialAxisLabels({
    frame,
    angle: 90,
    radii: [0, 25, 50],
    offset: 10
  });
  assert.deepEqual(labels.x, [100, 125, 150]);
  assert.deepEqual(labels.y, [70, 70, 70]);
});

test("places approved theta and radial titles relative to their axes", () => {
  assert.deepEqual(resolveThetaAxisTitle({ frame, offset: 42 }), {
    x: 100,
    y: 172,
    textAlign: "center",
    textBaseline: "middle"
  });
  assert.deepEqual(resolveRadialAxisTitle({
    frame,
    angle: 90,
    offset: 8
  }), {
    x: 125,
    y: 88,
    textAlign: "center",
    textBaseline: "top"
  });
  assert.deepEqual(resolveRadialAxisTitle({
    frame,
    angle: 90,
    offset: 8,
    position: "outside"
  }), {
    x: 158,
    y: 80,
    textAlign: "left",
    textBaseline: "middle"
  });
});

test("rejects invalid frame, radius, and angle inputs", () => {
  assert.throws(
    () => buildPolarCircleCommands({
      centerX: 0,
      centerY: 0,
      availableRadius: -1
    }, 1),
    /frame requires/
  );
  assert.throws(
    () => resolveRadialCircles({ frame, radii: [60] }),
    /inside the Polar frame/
  );
  assert.throws(
    () => resolveThetaAxisTicks({ frame, angles: [0], length: -1 }),
    /non-negative/
  );
  assert.throws(
    () => resolveRadialAxisLine({ frame, angle: Infinity }),
    /angle must be finite/
  );
  assert.throws(
    () => resolveRadialAxisTitle({
      frame,
      angle: 90,
      offset: 8,
      position: "sideways"
    }),
    /Unknown radial-axis title position/
  );
});
