import assert from "node:assert/strict";
import test from "node:test";

import { createJapanLineSeriesHighlight } from "../../../examples/mark-selection/program.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { loadCars } from "../../support/data.js";
import { createJapanLineHighlightPrimitive } from "./primitive.program.js";

test("matches the approved Japan line-series primitive exactly", () => {
  const cars = loadCars();
  const primitiveProgram = createJapanLineHighlightPrimitive(cars);
  const publicProgram = createJapanLineSeriesHighlight(cars);

  assertChartProgramsEquivalent({ primitiveProgram, publicProgram });
  assert.deepEqual(
    publicProgram.trace.children.at(-1).children.map(child => child.op),
    [
      "selectMarks",
      "applyPathHighlight",
      "dimUnselectedMarkItems",
      "placeSelectedMarkItemsLast",
      "rematerializeLegendHighlights"
    ]
  );
});

test("reapplies the line and legend highlight after mark edits", () => {
  const program = createJapanLineSeriesHighlight(loadCars())
    .editLineMark({ target: "trends", strokeWidth: 3 });
  const paths = program.graphicSpec.objects.trends.items;
  const symbols = program.graphicSpec.objects.seriesLegendSymbols.items;

  assert.deepEqual(paths.map(path => path.properties.strokeWidth), [3, 3, 5]);
  assert.deepEqual(paths.map(path => path.properties.opacity), [0.16, 0.16, 1]);
  assert.deepEqual(symbols.map(symbol => symbol.properties.opacity), [0.16, 0.16, 1]);
  assert.equal(
    program.graphicSpec.objects.seriesLegendLabels.items.every(label =>
      label.properties.opacity === undefined
    ),
    true
  );
});
