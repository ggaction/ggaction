import assert from "node:assert/strict";
import test from "node:test";

import { createCarsOriginHistogramFacet } from
  "../../../examples/cars-origin-histogram-facet/program.js";
import { createCarsOriginScatterplotFacet } from
  "../../../examples/cars-origin-scatterplot-facet/program.js";
import { render } from "../../../src/index.js";
import { createMockCanvasContext } from "../../support/canvas.js";
import { loadCars } from "../../support/data.js";
import {
  createCarsOriginHistogramFacetPrimitives,
  createCarsOriginScatterplotFacetPrimitives
} from "./primitive.program.js";

function assertSameConcreteRendering(primitive, publicProgram) {
  const primitiveContext = createMockCanvasContext();
  const publicContext = createMockCanvasContext();
  render(primitive, primitiveContext);
  render(publicProgram, publicContext);
  assert.deepEqual(publicContext.calls, primitiveContext.calls);
  assert.deepEqual(publicProgram.graphicSpec, primitive.graphicSpec);
}

test("matches the approved scatterplot facet primitive exactly", () => {
  const rows = loadCars();
  const program = createCarsOriginScatterplotFacet(rows);

  assertSameConcreteRendering(
    createCarsOriginScatterplotFacetPrimitives(rows),
    program
  );
  assert.deepEqual(program.compositionSpec.facet.values, [
    "USA", "Europe", "Japan"
  ]);
  assert.deepEqual(program.trace.children.slice(-3).map(node => node.op), [
    "facet", "createTitle", "editFacetHeaders"
  ]);
});

test("matches the approved wrapped histogram facet primitive exactly", () => {
  const rows = loadCars();
  const program = createCarsOriginHistogramFacet(rows);

  assertSameConcreteRendering(
    createCarsOriginHistogramFacetPrimitives(rows),
    program
  );
  assert.equal(program.compositionSpec.columns, 2);
  assert.deepEqual(program.children["facet-cell-1"].resolvedScales.y.domain, [
    0, 60
  ]);
  assert.deepEqual(program.trace.children.slice(-2).map(node => node.op), [
    "facet", "createTitle"
  ]);
});
