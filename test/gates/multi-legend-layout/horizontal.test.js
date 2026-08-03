import assert from "node:assert/strict";
import test from "node:test";

import { unionConcreteGraphicBounds } from
  "../../../src/grammar/schemas/graphicBounds.js";
import { loadCars } from "../../support/data.js";

import { createHorizontalLegendLaneComparison } from "./horizontal.program.js";
import { HORIZONTAL_LEGEND_TARGET } from "./reference-values.js";

function blockBounds(program, kind) {
  const ids = kind === "color"
    ? ["colorLegendSymbols", "colorLegendLabels", "colorLegendTitle"]
    : ["opacityLegendSymbols", "opacityLegendLabels", "opacityLegendTitle"];
  return unionConcreteGraphicBounds(program.graphicSpec, ids);
}

function itemX(program, id) {
  return program.graphicSpec.objects[id].items.map(item => item.properties.x);
}

test("matches the approved actual-Cars top and bottom lane coordinates", () => {
  const comparison = createHorizontalLegendLaneComparison(loadCars());
  for (const position of ["top", "bottom"]) {
    const program = comparison.children[position];
    const target = HORIZONTAL_LEGEND_TARGET[position];
    const color = blockBounds(program, "color");
    const opacity = blockBounds(program, "opacity");

    assert.equal(program.graphicSpec.objects.points.items.length, 398);
    assert.deepEqual(
      { top: color.top, bottom: color.bottom },
      target.colorBounds
    );
    assert.deepEqual(
      { top: opacity.top, bottom: opacity.bottom },
      target.opacityBounds
    );
    assert.deepEqual(
      itemX(program, "colorLegendSymbols"),
      target.colorSymbolX
    );
    assert.deepEqual(
      itemX(program, "opacityLegendSymbols"),
      target.opacitySymbolX
    );
  }
});

test("keeps exactly 24 pixels between plot-outward horizontal blocks", () => {
  const comparison = createHorizontalLegendLaneComparison(loadCars());
  const top = comparison.children.top;
  const bottom = comparison.children.bottom;

  assert.equal(
    blockBounds(top, "color").top - blockBounds(top, "opacity").bottom,
    HORIZONTAL_LEGEND_TARGET.blockGap
  );
  assert.equal(
    blockBounds(bottom, "opacity").top - blockBounds(bottom, "color").bottom,
    HORIZONTAL_LEGEND_TARGET.blockGap
  );
});
