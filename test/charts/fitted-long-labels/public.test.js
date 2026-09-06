import assert from "node:assert/strict";
import test from "node:test";

import {
  createFittedLongLabels,
  fittedLabelRows
} from "../../../examples/fitted-long-labels/program.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { createFittedLongLabelsPrimitive } from "./primitive.program.js";

test("matches an explicit fitted-margin program exactly", () => {
  const publicProgram = createFittedLongLabels(fittedLabelRows);
  const primitiveProgram = createFittedLongLabelsPrimitive(fittedLabelRows);

  assertChartProgramsEquivalent({ publicProgram, primitiveProgram });
  assert.equal(publicProgram.trace.children.at(-1).op, "fitCanvas");
  assert.equal(publicProgram.materializationConfigs.fitting.result.status, "fit");
});
