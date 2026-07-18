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
  assert.equal(program.graphicSpec.objects.canvas.properties.width, 932);
  assert.equal(program.graphicSpec.objects.canvas.properties.height, 282);
  assert.equal(nestedCanvases(program).length, 3);
  assert.deepEqual(
    nestedCanvases(program).map(canvas => [canvas.properties.x, canvas.properties.y]),
    [[0, 52], [266, 52], [532, 52]]
  );
  assert.equal(typeof ChartProgram.prototype.facet, "function");
  assert.equal(typeof ChartProgram.prototype.editFacetHeaders, "function");
});

test("authors the wrapped histogram facet without synthetic empty-bin bars", () => {
  const program = createCarsOriginHistogramFacetPrimitives(loadCars());
  assert.equal(program.graphicSpec.objects.canvas.properties.width, 756);
  assert.equal(program.graphicSpec.objects.canvas.properties.height, 578);
  assert.deepEqual(
    nestedCanvases(program).map(canvas => [canvas.properties.x, canvas.properties.y]),
    [[14, 66], [312, 66], [14, 324]]
  );
  const collections = Object.values(program.graphicSpec.objects)
    .filter(object => object.type === "rect" && object.items !== undefined);
  const rectCounts = collections.map(collection => collection.items.length);
  assert.deepEqual(rectCounts, [10, 6, 5]);
});

test("authors one parent legend instead of repeating it in facet cells", () => {
  for (const program of [
    createCarsOriginScatterplotFacetPrimitives(loadCars()),
    createCarsOriginHistogramFacetPrimitives(loadCars())
  ]) {
    const legendIds = Object.keys(program.graphicSpec.objects)
      .filter(id => id === "facet-legend");
    assert.equal(legendIds.length, 1);
    const legend = program.graphicSpec.objects[legendIds[0]];
    assert.deepEqual(
      legend.items.filter(item => item.type === "text")
        .map(item => item.properties.text),
      ["Cylinders", "8", "4", "6", "3", "5"]
    );
  }
});

test("keeps raw facet values out of primitive resource IDs", () => {
  const program = createCarsOriginScatterplotFacetPrimitives(loadCars());
  const ids = Object.keys(program.graphicSpec.objects);
  for (const value of ["USA", "Europe", "Japan"]) {
    assert.equal(ids.some(id => id.includes(value)), false);
  }
});
