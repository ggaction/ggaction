import assert from "node:assert/strict";
import test from "node:test";

import { loadCars } from "../../support/data.js";

import {
  ANCHORS,
  BASELINE_TICKS,
  DIRECTION_ROWS,
  DIRECTIONAL_TICKS,
  DIRECTIONAL_TRIANGLES,
  DIRECTION_LAYOUT,
  RUG_LAYOUT,
  createHorsepowerRugReference
} from "./reference-values.js";

function close(actual, expected, tolerance = 1e-10) {
  assert.equal(Math.abs(actual - expected) <= tolerance, true, `${actual} != ${expected}`);
}

function segmentLength(segment) {
  return Math.hypot(segment.x2 - segment.x1, segment.y2 - segment.y1);
}

function triangleArea(commands) {
  const points = commands.slice(0, 3);
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
}

test("anchors the direct-degree compass convention to literal positions", () => {
  assert.deepEqual(DIRECTION_ROWS.map(row => row.direction), [
    0, 45, 90, 135, 180, 225, 270, 315
  ]);
  close(ANCHORS[0].x, 170);
  close(ANCHORS[0].y, 130);
  close(ANCHORS[2].x, 250);
  close(ANCHORS[2].y, 210);
  close(ANCHORS[4].x, 170);
  close(ANCHORS[4].y, 290);
  close(ANCHORS[6].x, 90);
  close(ANCHORS[6].y, 210);
});

test("keeps Tick center and length invariant while rotating its axis", () => {
  for (const [index, segment] of DIRECTIONAL_TICKS.entries()) {
    close(segmentLength(segment), DIRECTION_LAYOUT.tickLength);
    close((segment.x1 + segment.x2) / 2, ANCHORS[index].x);
    close((segment.y1 + segment.y2) / 2, ANCHORS[index].y);
    close(segmentLength(BASELINE_TICKS[index]), DIRECTION_LAYOUT.tickLength);
    close(BASELINE_TICKS[index].x1, BASELINE_TICKS[index].x2);
  }
});

test("keeps rotated triangle centers and areas invariant", () => {
  const expectedArea = triangleArea(DIRECTIONAL_TRIANGLES[0]);
  for (const [index, commands] of DIRECTIONAL_TRIANGLES.entries()) {
    const points = commands.slice(0, 3);
    close(points.reduce((sum, point) => sum + point.x, 0) / 3, ANCHORS[index].x);
    close(points.reduce((sum, point) => sum + point.y, 0) / 3, ANCHORS[index].y);
    close(triangleArea(commands), expectedArea);
  }
});

test("anchors the actual Cars horsepower rug to one Tick per valid row", () => {
  const values = createHorsepowerRugReference(loadCars());

  assert.equal(values.rows.length, 400);
  assert.deepEqual(
    [Math.min(...values.rows.map(row => row.Horsepower)),
      Math.max(...values.rows.map(row => row.Horsepower))],
    [46, 230]
  );
  [95, 270, 445, 620].forEach((expected, index) => {
    close(values.axisX[index], expected);
  });
  assert.deepEqual(values.labels, ["50", "100", "150", "200"]);
  close(Math.min(...values.x), 81);
  close(Math.max(...values.x), 725);
  assert.deepEqual([values.y1, values.y2], [164, 136]);
  assert.equal(Math.abs(values.y2 - values.y1), RUG_LAYOUT.tickLength);
});
