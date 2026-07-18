import assert from "node:assert/strict";
import test from "node:test";

import { assertChartProgramsEquivalent } from
  "../../support/chart-equivalence.js";
import { loadGapminder } from "../../support/data.js";
import { createGapminderHeatmapPrimitives } from "./primitive.program.js";
import { createGapminderLifeExpectancyHeatmap } from "./public.program.js";

test("matches the approved life-expectancy heatmap primitive exactly", () => {
  const rows = loadGapminder();
  const primitive = createGapminderHeatmapPrimitives(rows);
  const program = createGapminderLifeExpectancyHeatmap(rows);
  assertChartProgramsEquivalent({
    publicProgram: program,
    primitiveProgram: primitive
  });
  assert.deepEqual(program.trace.children.map(node => node.op), [
    "createCanvas",
    "createData",
    "createRectMark",
    "encodeX",
    "encodeY",
    "encodeColor",
    "createTextMark",
    "encodeText",
    "createGuides",
    "createTitle"
  ]);
});
