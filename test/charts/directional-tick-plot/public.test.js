import assert from "node:assert/strict";
import test from "node:test";

import { assertChartProgramsEquivalent } from
  "../../support/chart-equivalence.js";
import { loadCars } from "../../support/data.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";
import { comparisonCallChain } from "./manifest.js";
import {
  createDirectionalTickPointPrimitives,
  createHorsepowerRugPrimitives
} from "./primitive.program.js";
import {
  createDirectionalTickPointComparison,
  createHorsepowerRug
} from "./public.program.js";

test("matches the approved direction comparison through public actions", () => {
  const primitive = createDirectionalTickPointPrimitives();
  const publicProgram = createDirectionalTickPointComparison();

  assertChartProgramsEquivalent({
    primitiveProgram: primitive,
    publicProgram,
    compareSemanticSpec: false
  });
  assertDisplayedProgram({
    chart: "directional-tick-plot",
    variant: "baseline-tick-point-directions",
    callChain: comparisonCallChain
  }, publicProgram);
  assert.deepEqual(
    publicProgram.children.directionalTicks.semanticSpec.layers[0].encoding.angle,
    { field: "direction", fieldType: "quantitative" }
  );
  assert.deepEqual(
    publicProgram.children.directionalPoints.semanticSpec.layers[0].encoding.angle,
    { field: "direction", fieldType: "quantitative" }
  );
});

test("matches the approved Cars rug through the public Rug facade", () => {
  const cars = loadCars();
  const primitive = createHorsepowerRugPrimitives(cars);
  const publicProgram = createHorsepowerRug(cars);

  assertChartProgramsEquivalent({
    primitiveProgram: primitive,
    publicProgram,
    compareSemanticSpec: false
  });
  assert.equal(publicProgram.semanticSpec.layers[0].mark.type, "tick");
  assert.equal(publicProgram.graphicSpec.objects.ticks.items.length, 400);
  const facade = publicProgram.trace.children.find(
    node => node.op === "createRugPlot"
  );
  assert.ok(facade);
  assert.deepEqual(facade.children.map(node => node.op), [
    "createTickMark", "encodeX", "encodeY", "encodeAngle"
  ]);
});
