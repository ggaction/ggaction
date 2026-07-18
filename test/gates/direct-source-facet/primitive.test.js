import assert from "node:assert/strict";
import test from "node:test";

import { ChartProgram } from "../../../src/extension.js";
import { loadCars } from "../../support/data.js";

import {
  createCarsOriginHistogramFacetPrimitives,
  createCarsOriginScatterplotFacetPrimitives
} from "./primitive.program.js";

function nestedCanvases(program) {
  return Object.entries(program.graphicSpec.objects)
    .filter(([id, object]) => object.type === "canvas" && id !== "canvas")
    .map(([, object]) => object);
}

test("authors the one-row scatterplot facet with extension primitives", () => {
  const program = createCarsOriginScatterplotFacetPrimitives(loadCars());
  assert.equal(program.graphicSpec.objects.canvas.properties.width, 782);
  assert.equal(program.graphicSpec.objects.canvas.properties.height, 282);
  assert.equal(nestedCanvases(program).length, 3);
  assert.deepEqual(
    nestedCanvases(program).map(canvas => [canvas.properties.x, canvas.properties.y]),
    [[0, 52], [266, 52], [532, 52]]
  );
  assert.equal(typeof ChartProgram.prototype.facet, "undefined");
  assert.equal(typeof ChartProgram.prototype.editFacetHeaders, "undefined");
});

test("authors the wrapped histogram facet without synthetic empty-bin bars", () => {
  const program = createCarsOriginHistogramFacetPrimitives(loadCars());
  assert.equal(program.graphicSpec.objects.canvas.properties.width, 606);
  assert.equal(program.graphicSpec.objects.canvas.properties.height, 578);
  assert.deepEqual(
    nestedCanvases(program).map(canvas => [canvas.properties.x, canvas.properties.y]),
    [[14, 66], [312, 66], [14, 324]]
  );
  const collections = Object.entries(program.graphicSpec.objects)
    .filter(([id]) => id.endsWith("Content"))
    .map(([, object]) => object);
  const rectCounts = collections.map(collection =>
    collection.items.filter(child => child.type === "rect").length
  );
  assert.deepEqual(rectCounts, [8, 3, 3]);
});

test("keeps raw facet values out of primitive resource IDs", () => {
  const program = createCarsOriginScatterplotFacetPrimitives(loadCars());
  const ids = Object.keys(program.graphicSpec.objects);
  for (const value of ["USA", "Europe", "Japan"]) {
    assert.equal(ids.some(id => id.includes(value)), false);
  }
});
