import assert from "node:assert/strict";
import test from "node:test";

import { createGroupedMaximumPointHighlight } from "../../../examples/mark-selection/program.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { loadCars } from "../../support/data.js";
import { createPointHighlightGatePrimitive } from "./primitive.program.js";

test("matches the approved point-highlight primitive exactly", () => {
  const cars = loadCars();
  const primitive = createPointHighlightGatePrimitive(cars);
  const publicProgram = createGroupedMaximumPointHighlight(cars);
  assertChartProgramsEquivalent({
    primitiveProgram: primitive,
    publicProgram
  });
  assert.deepEqual(
    publicProgram.trace.children.at(-1).children.map(child => child.op),
    [
      "selectMarks",
      "applyPointHighlight",
      "dimUnselectedMarkItems",
      "placeSelectedMarkItemsLast"
    ]
  );
});
