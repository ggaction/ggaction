import assert from "node:assert/strict";
import test from "node:test";

import { assertChartProgramsEquivalent } from
  "../../support/chart-equivalence.js";
import { createAirlinePassengerMovingWindowPrimitives } from
  "./primitive.program.js";
import { createAirlinePassengerMovingWindows } from "./public.program.js";
import {
  CENTERED_MEAN_ROWS,
  TRAILING_MEAN_ROWS,
  TRAILING_SUM_ROWS
} from "./reference-values.js";

test("matches all approved moving-window primitives through public actions", () => {
  const primitiveProgram = createAirlinePassengerMovingWindowPrimitives();
  const publicProgram = createAirlinePassengerMovingWindows();

  assertChartProgramsEquivalent({ primitiveProgram, publicProgram });
  const expectedRows = {
    trailingMean: TRAILING_MEAN_ROWS,
    centeredMean: CENTERED_MEAN_ROWS,
    trailingSum: TRAILING_SUM_ROWS
  };
  for (const [id, child] of Object.entries(publicProgram.children)) {
    assert.deepEqual(
      child.semanticSpec.datasets.find(dataset =>
        dataset.id === id
      ).values,
      expectedRows[id]
    );
    assert.deepEqual(child.trace.children.slice(0, 4).map(node => node.op), [
      "createCanvas",
      "createData",
      "createTimeUnitData",
      "createWindowData"
    ]);
    assert.equal(
      child.graphicSpec.objects.moving.items[0].properties.commands.length,
      24
    );
  }
});
