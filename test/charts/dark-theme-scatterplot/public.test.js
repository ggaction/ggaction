import assert from "node:assert/strict";
import test from "node:test";

import {
  createDarkThemeScatterplot,
  darkThemeRows
} from "../../../examples/dark-theme-scatterplot/program.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { createDarkThemeScatterplotPrimitive } from "./primitive.program.js";

test("matches the explicit dark-style primitive exactly", () => {
  const publicProgram = createDarkThemeScatterplot(darkThemeRows);
  const primitiveProgram = createDarkThemeScatterplotPrimitive(darkThemeRows);

  assertChartProgramsEquivalent({ publicProgram, primitiveProgram });
  assert.equal(publicProgram.trace.children.at(-1).op, "applyTheme");
});
