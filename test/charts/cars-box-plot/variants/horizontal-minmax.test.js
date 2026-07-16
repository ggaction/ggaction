import assert from "node:assert/strict";
import test from "node:test";

import { render } from "../../../../src/index.js";
import { loadCars } from "../../../support/data.js";
import { createMockCanvasContext } from "../../../support/canvas.js";
import { createCarsHorizontalMinmaxPrimitives } from "./horizontal-minmax.program.js";

test("authors the horizontal minmax box plot with raw primitives", () => {
  const program = createCarsHorizontalMinmaxPrimitives(loadCars());
  const layerIds = program.semanticSpec.layers.map(layer => layer.id);
  const graphicIds = Object.keys(program.graphicSpec.objects);

  assert.deepEqual(layerIds, [
    "boxPlot",
    "boxPlotWhisker",
    "boxPlotWhiskerLowerCap",
    "boxPlotWhiskerUpperCap",
    "boxPlotMedian"
  ]);
  assert.equal(program.semanticSpec.datasets.some(dataset =>
    dataset.id === "boxPlotOutlierData"
  ), false);
  assert.equal(layerIds.some(id => id.includes("Outlier")), false);
  assert.equal(graphicIds.some(id => id.includes("Outlier")), false);
  assert.equal(program.semanticSpec.layers[0].encoding.x2.field, "__boxPlot_q3");
  assert.equal(program.semanticSpec.layers[0].encoding.y.field, "Origin");
  assert.equal(program.semanticSpec.datasets[1].transform[0].whisker, "minmax");
});

test("renders horizontal components in explicit order", () => {
  const program = createCarsHorizontalMinmaxPrimitives(loadCars());
  const context = createMockCanvasContext();
  render(program, context);

  assert.deepEqual(Object.keys(program.graphicSpec.objects).slice(0, 7), [
    "canvas",
    "verticalGridLines",
    "boxPlotWhisker",
    "boxPlotWhiskerLowerCap",
    "boxPlotWhiskerUpperCap",
    "boxPlot",
    "boxPlotMedian"
  ]);
  assert.equal(context.calls.filter(call => call.op === "fillRect").length, 4);
  assert.ok(context.calls.some(call =>
    call.op === "fillText" && call.args[0] === "Horsepower Range by Origin"
  ));
});
