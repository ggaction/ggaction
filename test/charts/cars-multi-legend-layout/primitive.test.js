import assert from "node:assert/strict";
import test from "node:test";

import { render } from "../../../src/index.js";
import { createMockCanvasContext } from "../../support/canvas.js";
import { loadCars } from "../../support/data.js";

import { createCarsMultiLegendLayoutPrimitives } from "./primitive.program.js";
import { LEGEND_LAYOUT } from "./reference-values.js";

test("authors and renders both approved horizontal legend primitives", () => {
  for (const position of ["top", "bottom"]) {
    const program = createCarsMultiLegendLayoutPrimitives(loadCars(), { position });
    const context = createMockCanvasContext();
    const objects = program.graphicSpec.objects;

    render(program, context);
    assert.equal(program.semanticSpec.datasets[0].values.length, 398);
    assert.equal(objects.colorLegendSymbols.items.length, 3);
    assert.equal(objects.opacityLegendSymbols.items.length, 3);
    assert.deepEqual(
      objects.opacityLegendSymbols.items.map(item => item.properties.x),
      LEGEND_LAYOUT[position].opacitySymbolX
    );
    assert.equal(context.calls.length > 0, true);
    assert.equal(program.trace.children.some(node => node.op === "createLegend"), false);
  }
});
