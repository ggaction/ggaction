import assert from "node:assert/strict";
import test from "node:test";

import { createCarsOriginHistogramFacet } from
  "../../../examples/cars-origin-histogram-facet/program.js";
import { createCarsOriginScatterplotFacet } from
  "../../../examples/cars-origin-scatterplot-facet/program.js";
import { render } from "../../../src/index.js";
import { resolveConcreteGraphicBounds } from
  "../../../src/grammar/schemas/graphicBounds.js";
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

function intersects(first, second) {
  return first.left < second.right && first.right > second.left &&
    first.top < second.bottom && first.bottom > second.top;
}

function assertHistogramGuidesFit(program) {
  for (const child of Object.values(program.children)) {
    const canvas = child.graphicSpec.objects.canvas.properties;
    const epsilon = 1e-9;
    for (const id of [
      "xAxisLabels", "xAxisTitle", "yAxisLabels", "yAxisTitle"
    ]) {
      const bounds = resolveConcreteGraphicBounds(child.graphicSpec, id);
      assert.ok(bounds.left >= -epsilon, `${id} crossed the left Canvas edge`);
      assert.ok(
        bounds.right <= canvas.width + epsilon,
        `${id} crossed the right Canvas edge`
      );
      assert.ok(bounds.top >= -epsilon, `${id} crossed the top Canvas edge`);
      assert.ok(
        bounds.bottom <= canvas.height + epsilon,
        `${id} crossed the bottom Canvas edge`
      );
    }
    const labelBounds = child.graphicSpec.objects.xAxisLabels.items.map(item =>
      resolveConcreteGraphicBounds(child.graphicSpec, item.id)
    );
    assert.equal(labelBounds.some((bounds, index) =>
      labelBounds.slice(index + 1).some(other => intersects(bounds, other))
    ), false, "histogram facet x-axis labels overlap");
  }
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
  assertHistogramGuidesFit(program);
});
