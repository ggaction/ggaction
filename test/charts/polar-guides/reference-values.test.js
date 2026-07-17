import assert from "node:assert/strict";
import test from "node:test";

import { loadCars } from "../../support/data.js";
import {
  POLAR_GUIDE_TARGET,
  createCarsPolarGuideReference
} from "./reference-values.js";

function allFinite(value) {
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(allFinite);
  if (value !== null && typeof value === "object") {
    return Object.entries(value).every(([key, child]) =>
      key === "op" || typeof child === "string" || allFinite(child)
    );
  }
  return true;
}

test("locks independent Polar guide ticks and frame", () => {
  const values = createCarsPolarGuideReference(loadCars());

  assert.deepEqual(values.thetaDomain, [8, 24.8]);
  assert.deepEqual(values.radiusDomain, [0, 230]);
  assert.deepEqual(POLAR_GUIDE_TARGET.thetaTicks, [9, 12, 15, 18, 21, 24]);
  assert.deepEqual(POLAR_GUIDE_TARGET.radiusTicks, [0, 50, 100, 150, 200]);
  assert.deepEqual(values.frame, { cx: 310, cy: 310, radius: 232 });
  assert.equal(values.thetaGrid.length, 6);
  assert.equal(values.radialGridRadii.length, 4);
  assert.equal(values.radialPositions[0], 0);
  assert.ok(Math.abs(values.radialPositions.at(-1) - 201.7391304347826) < 1e-9);
});

test("keeps axes and grids on one exact tick geometry", () => {
  const values = createCarsPolarGuideReference(loadCars());

  for (let index = 0; index < values.thetaGrid.length; index += 1) {
    assert.deepEqual(values.thetaGrid[index].end, values.thetaTicks[index].start);
  }
  for (let index = 0; index < values.radialPositions.length; index += 1) {
    assert.equal(values.radialTicks[index].start.x, values.radialLabels[index].x);
  }
  assert.deepEqual(values.radialAxis, {
    start: { x: 310, y: 310 },
    end: { x: 542, y: 310 }
  });
  assert.equal(values.thetaAxisCommands[0].x, 310);
  assert.equal(values.thetaAxisCommands[0].y, 78);
  assert.equal(values.thetaAxisCommands.at(-1).op, "Z");
  assert.equal(allFinite(values), true);
});

test("places readable perimeter labels and titles inside the Canvas", () => {
  const values = createCarsPolarGuideReference(loadCars());

  for (const label of [...values.thetaLabels, ...values.radialLabels]) {
    assert.ok(label.x >= 0 && label.x <= POLAR_GUIDE_TARGET.width);
    assert.ok(label.y >= 0 && label.y <= POLAR_GUIDE_TARGET.height);
  }
  assert.deepEqual(values.thetaTitle, {
    x: 310,
    y: 584,
    text: "Acceleration"
  });
  assert.deepEqual(values.radialTitle, {
    x: 426,
    y: 318,
    text: "Horsepower"
  });
});

test("rejects missing or empty valid reference data", () => {
  assert.throws(
    () => createCarsPolarGuideReference(),
    /requires rows/
  );
  assert.throws(
    () => createCarsPolarGuideReference([{ Acceleration: null }]),
    /requires valid rows/
  );
});
