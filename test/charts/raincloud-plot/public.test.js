import assert from "node:assert/strict";
import test from "node:test";

import { createRaincloudExample } from "../../../examples/raincloud-plot/program.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { createRaincloudPrimitive } from "./primitive.program.js";

test("matches the approved lower Raincloud chain exactly", () => {
  const publicProgram = createRaincloudExample();
  assertChartProgramsEquivalent({
    primitiveProgram: createRaincloudPrimitive(),
    publicProgram
  });
  assert.deepEqual(publicProgram.trace.children.at(-1).children
    .filter(node => [
      "createViolinPlot", "createBoxPlot", "createBeeswarmPlot", "createGuides"
    ].includes(node.op)).map(node => node.op), [
    "createViolinPlot", "createBoxPlot", "createBeeswarmPlot", "createGuides"
  ]);
});
