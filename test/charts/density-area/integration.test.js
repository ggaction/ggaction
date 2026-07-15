import assert from "node:assert/strict";
import test from "node:test";

import { createCarsDensityArea } from
  "../../../examples/cars-density-area/program.js";
import { loadCars } from "../../support/data.js";

const densityEdit = Object.freeze({
  bandwidth: 0.9,
  kernel: "triangular",
  normalization: "count"
});

test("converges when density revision and Canvas resizing change order", () => {
  const original = createCarsDensityArea(loadCars());
  const originalSemanticSpec = original.semanticSpec;
  const originalGraphicSpec = original.graphicSpec;

  const densityThenCanvas = original
    .editDensity(densityEdit)
    .editCanvas({ width: 780 });
  const canvasThenDensity = original
    .editCanvas({ width: 780 })
    .editDensity(densityEdit);

  assert.deepEqual(densityThenCanvas.semanticSpec, canvasThenDensity.semanticSpec);
  assert.deepEqual(densityThenCanvas.resolvedScales, canvasThenDensity.resolvedScales);
  assert.deepEqual(densityThenCanvas.graphicSpec, canvasThenDensity.graphicSpec);
  assert.strictEqual(original.semanticSpec, originalSemanticSpec);
  assert.strictEqual(original.graphicSpec, originalGraphicSpec);
  assert.equal(original.graphicSpec.objects.canvas.properties.width, 720);
  assert.deepEqual(original.semanticSpec.datasets.map(dataset => dataset.id), [
    "cars",
    "densitiesDensityData"
  ]);
});
