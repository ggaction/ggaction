import assert from "node:assert/strict";
import test from "node:test";

import { createBeeswarmExample } from "../../../examples/beeswarm-plot/program.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { createBeeswarmPrimitive } from "./primitive.program.js";

test("matches the approved lower Beeswarm chain exactly", () => {
  const publicProgram = createBeeswarmExample();
  assertChartProgramsEquivalent({
    primitiveProgram: createBeeswarmPrimitive(),
    publicProgram
  });
  assert.deepEqual(publicProgram.trace.children.at(-1).children.map(node => node.op), [
    "createStripPlot", "packPoints"
  ]);
});
