import assert from "node:assert/strict";
import test from "node:test";

import * as ggaction from "../../../src/index.js";
import { loadCars, loadGapminder, loadJobs } from "../../support/data.js";
import { visualVariants } from "./manifest.js";
import {
  createNestedDashboardPrimitives,
  createReplacementPrimitives,
  createUnequalHorizontalPrimitives
} from "./primitive.program.js";
import { createCompositionGateValues } from "./reference-values.js";

const cars = loadCars();
const jobs = loadJobs();
const gapminder = loadGapminder();

test("locks the three approved layout targets to literal placement values", () => {
  const values = createCompositionGateValues({ cars, jobs, gapminder });
  assert.deepEqual(values.overview, {
    direction: "horizontal",
    gap: 20,
    align: "center",
    padding: { top: 16, right: 16, bottom: 16, left: 16 },
    width: 792,
    height: 352,
    children: [
      { id: "main", width: 440, height: 320, x: 16, y: 16 },
      { id: "detail", width: 300, height: 320, x: 476, y: 16 }
    ]
  });
  assert.deepEqual(values.nested.children, [
    { id: "overview", width: 792, height: 352, x: 14, y: 14 },
    { id: "trend", width: 600, height: 220, x: 110, y: 384 }
  ]);
  assert.equal(values.nested.width, 820);
  assert.equal(values.nested.height, 618);
  assert.deepEqual(values.replacement.children, [
    { id: "main", width: 440, height: 320, x: 12, y: 12 },
    { id: "detail", width: 280, height: 280, x: 480, y: 12 }
  ]);
  assert.equal(values.replacement.width, 772);
  assert.equal(values.replacement.height, 344);
});
test("authors unequal, nested, and replacement results with explicit primitives", () => {
  const unequal = createUnequalHorizontalPrimitives(cars, jobs, gapminder);
  const nested = createNestedDashboardPrimitives(cars, jobs, gapminder);
  const replacement = createReplacementPrimitives(cars, jobs, gapminder);

  assert.deepEqual(unequal.graphicSpec.objects.overview.children, [
    "mainCanvas", "detailCanvas"
  ]);
  assert.deepEqual(nested.graphicSpec.objects.overviewContent.children, [
    "nestedMainCanvas", "nestedDetailCanvas"
  ]);
  assert.deepEqual(nested.graphicSpec.objects.dashboard.children, [
    "overviewCanvas", "trendCanvas"
  ]);
  assert.equal(unequal.graphicSpec.objects.canvas.properties.background, "#ffffff");
  assert.equal(nested.graphicSpec.objects.canvas.properties.background, "#ffffff");
  assert.equal(replacement.graphicSpec.objects.canvas.properties.background, "#ffffff");
  assert.equal(
    nested.graphicSpec.objects.nestedMainCanvas.properties.x,
    16
  );
  assert.equal(
    nested.graphicSpec.objects.nestedDetailCanvas.properties.y,
    16
  );
  assert.equal(
    nested.graphicSpec.objects.nestedDetailCanvas.properties.height,
    320
  );
  assert.deepEqual(replacement.graphicSpec.objects.revisedOverview.children, [
    "replacementMainCanvas", "replacementDetailCanvas"
  ]);
  assert.equal(
    replacement.graphicSpec.objects.replacementDetailContent.items
      .filter(item => item.type === "path").length,
    3
  );
});

test("keeps Gate G primitive-only before user approval", () => {
  assert.equal(visualVariants.length, 3);
  assert.equal(ggaction.hconcat, undefined);
  assert.equal(ggaction.vconcat, undefined);
  for (const variant of visualVariants) {
    assert.equal(variant.userFacing, undefined);
  }
});
