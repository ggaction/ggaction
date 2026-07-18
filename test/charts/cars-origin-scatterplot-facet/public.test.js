import test from "node:test";

import { createCarsOriginScatterplotFacet } from
  "../../../examples/cars-origin-scatterplot-facet/program.js";
import { assertChartProgramsEquivalent } from
  "../../support/chart-equivalence.js";
import { loadCars } from "../../support/data.js";
import { createCarsOriginScatterplotFacetPrimitives } from
  "./primitive.program.js";

test("matches the approved direct-source facet primitive exactly", () => {
  const rows = loadCars();
  assertChartProgramsEquivalent({
    publicProgram: createCarsOriginScatterplotFacet(rows),
    primitiveProgram: createCarsOriginScatterplotFacetPrimitives(rows),
    compareSemanticSpec: false
  });
});
