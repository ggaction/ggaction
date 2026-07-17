import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAnnularSectorCommands,
  buildPolarCircleCommands
} from "../../../src/grammar/polarPaths.js";

const frame = Object.freeze({
  centerX: 100,
  centerY: 80,
  availableRadius: 50
});

function close(actual, expected, tolerance = 1e-10) {
  assert.equal(Math.abs(actual - expected) < tolerance, true);
}

test("preserves the canonical four-cubic circle commands", () => {
  const commands = buildPolarCircleCommands(frame, 25);
  assert.equal(commands.length, 6);
  assert.deepEqual(commands[0], { op: "M", x: 100, y: 55 });
  assert.deepEqual(commands[2], {
    op: "C",
    x1: 125,
    y1: 93.80711874576984,
    x2: 113.80711874576984,
    y2: 105,
    x: 100,
    y: 105
  });
  assert.equal(Object.isFrozen(commands), true);
});

test("builds clockwise pie and donut sectors from cubic commands", () => {
  const pie = buildAnnularSectorCommands({
    frame,
    startTheta: 0,
    endTheta: 90,
    outerRadius: 40
  });
  assert.deepEqual(pie[0], { op: "M", x: 100, y: 40 });
  close(pie[1].x, 140);
  close(pie[1].y, 80);
  assert.deepEqual(pie.at(-2), { op: "L", x: 100, y: 80 });
  assert.deepEqual(pie.at(-1), { op: "Z" });

  const donut = buildAnnularSectorCommands({
    frame,
    startTheta: 0,
    endTheta: 180,
    innerRadius: 20,
    outerRadius: 40
  });
  assert.equal(donut.filter(command => command.op === "C").length, 4);
  close(donut.at(-2).x, 100);
  close(donut.at(-2).y, 60);
});

test("supports reverse sweeps, full circles, and angular padding", () => {
  const reverse = buildAnnularSectorCommands({
    frame,
    startTheta: 90,
    endTheta: 0,
    innerRadius: 10,
    outerRadius: 30
  });
  close(reverse[1].x, 100);
  close(reverse[1].y, 50);

  const full = buildAnnularSectorCommands({
    frame,
    startTheta: 0,
    endTheta: 360,
    innerRadius: 20,
    outerRadius: 40
  });
  assert.equal(full.filter(command => command.op === "C").length, 8);

  const padded = buildAnnularSectorCommands({
    frame,
    startTheta: 0,
    endTheta: 90,
    outerRadius: 40,
    padAngle: 10
  });
  assert.notDeepEqual(padded[0], { op: "M", x: 100, y: 40 });
});

test("rejects invalid frames, radii, sweeps, and padding", () => {
  assert.throws(
    () => buildPolarCircleCommands({ ...frame, availableRadius: -1 }, 1),
    /frame requires/
  );
  assert.throws(
    () => buildAnnularSectorCommands({
      frame,
      startTheta: 0,
      endTheta: 90,
      innerRadius: 20,
      outerRadius: 20
    }),
    /greater than innerRadius/
  );
  assert.throws(
    () => buildAnnularSectorCommands({
      frame,
      startTheta: 0,
      endTheta: 0,
      outerRadius: 20
    }),
    /sweep/
  );
  assert.throws(
    () => buildAnnularSectorCommands({
      frame,
      startTheta: 0,
      endTheta: 30,
      outerRadius: 20,
      padAngle: 30
    }),
    /padAngle/
  );
});
