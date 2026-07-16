import assert from "node:assert/strict";
import test from "node:test";

import {
  createTallestHistogramStackHighlight,
  createTopmostHistogramSegmentHighlight
} from "../../../examples/mark-selection/program.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { loadCars } from "../../support/data.js";
import {
  createTallestHistogramStackHighlightPrimitive,
  createTopmostHistogramSegmentHighlightPrimitive
} from "./primitive.program.js";

for (const [name, primitive, userFacing, selectedCount] of [
  [
    "topmost item",
    createTopmostHistogramSegmentHighlightPrimitive,
    createTopmostHistogramSegmentHighlight,
    1
  ],
  [
    "tallest stack",
    createTallestHistogramStackHighlightPrimitive,
    createTallestHistogramStackHighlight,
    3
  ]
]) {
  test(`matches the approved ${name} primitive exactly`, () => {
    const cars = loadCars();
    const primitiveProgram = primitive(cars);
    const publicProgram = userFacing(cars);
    assertChartProgramsEquivalent({ primitiveProgram, publicProgram });
    assert.deepEqual(
      publicProgram.trace.children.at(-1).children.map(child => child.op),
      ["selectMarks", "applyBarHighlight", "placeSelectedMarkItemsLast"]
    );
    assert.equal(
      publicProgram.graphicSpec.objects.bars.items.slice(-selectedCount)
        .every(child => child.properties.fill === "#facc15"),
      true
    );
  });
}
