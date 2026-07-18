import assert from "node:assert/strict";
import test from "node:test";

import { createAnnotatedImdbScatterplot } from
  "../../../examples/annotated-imdb-scatterplot/program.js";
import { loadImdbSelected, loadImdbTop1000 } from "../../support/data.js";
import { assertChartProgramsEquivalent } from
  "../../support/chart-equivalence.js";
import { createAnnotatedImdbPrimitives } from "./primitive.program.js";

test("matches the approved annotated film primitive exactly", () => {
  const publicProgram = createAnnotatedImdbScatterplot(loadImdbSelected());
  const primitiveProgram = createAnnotatedImdbPrimitives(loadImdbTop1000());
  assertChartProgramsEquivalent({
    publicProgram,
    primitiveProgram,
    compareSemanticSpec: false
  });
  assert.equal(publicProgram.semanticSpec.layers[1].source, "point");
});
