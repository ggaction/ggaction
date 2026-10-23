import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { assertAnalyticPixels } from "../support/analytic-pixels.js";

test("analytic raster witnesses reject invisible marks even when guides remain visible", () => {
  const program = chart().createCanvas({ width: 400, height: 320, margin: 80 })
    .createData({ values: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }).createScatterPlot({ id: "points", x: "x", y: "y" });
  const original = structuredClone(program.graphicSpec);
  assert.ok(assertAnalyticPixels(program) > 0);
  assert.deepEqual(program.graphicSpec, original);
  assert.throws(() => assertAnalyticPixels(program.editPointMark({ opacity: 0 })), /no visible pixels/);
  const offscreen = { ...program, graphicSpec: structuredClone(program.graphicSpec) };
  for (const item of offscreen.graphicSpec.objects.points.items) item.properties.x = -10000;
  assert.throws(() => assertAnalyticPixels(offscreen), /no visible pixels/);
});
