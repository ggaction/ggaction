import assert from "node:assert/strict";
import test from "node:test";

import { loadCars } from "../../support/data.js";
import { createCarsBinnedHeatmapReference } from "./fixture.js";
import { createCarsBinnedHeatmapPrimitives } from "./primitive.program.js";

test("authors 80 ranged rects from the fixed Cars 2D-bin reference", () => {
  const cars = loadCars();
  const reference = createCarsBinnedHeatmapReference(cars);
  const program = createCarsBinnedHeatmapPrimitives(cars);
  const items = program.graphicSpec.objects.heatmap.items;

  assert.equal(items.length, 80);
  assert.equal(reference.eligibleCount, 398);
  assert.equal(reference.occupiedCount, 38);
  assert.deepEqual(
    program.semanticSpec.layers[0].encoding,
    {
      x: {
        field: "weight0",
        fieldType: "quantitative",
        scale: "x"
      },
      x2: {
        field: "weight1",
        fieldType: "quantitative",
        scale: "x"
      },
      y: {
        field: "mpg0",
        fieldType: "quantitative",
        scale: "y"
      },
      y2: {
        field: "mpg1",
        fieldType: "quantitative",
        scale: "y"
      },
      color: {
        field: "count",
        fieldType: "quantitative",
        scale: "color"
      }
    }
  );
  assert.equal(items.every(item => item.properties.width > 0), true);
  assert.equal(items.every(item => item.properties.height > 0), true);
});

test("exposes approved derived-data slices while the binned heatmap facade remains absent", () => {
  const program = createCarsBinnedHeatmapPrimitives(loadCars());

  assert.equal(typeof program.createWindowData, "function");
  assert.equal(typeof program.createBin2DData, "function");
  assert.throws(
    () => program.createHeatmap({
      x: "weight0",
      y: "mpg0",
      bin: { bins: 10 }
    }),
    /Unknown createHeatmap option "bin"/
  );
});
