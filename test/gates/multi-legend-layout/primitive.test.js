import assert from "node:assert/strict";
import test from "node:test";

import { loadCars } from "../../support/data.js";

import {
  createCarsCombinedLegendComparison,
  createThreeBlockLegendComparison
} from "./primitive.program.js";
import {
  CARS_LEGEND_TARGET,
  MULTI_LEGEND_CURRENT,
  MULTI_LEGEND_TARGET
} from "./reference-values.js";

function title(program, id) {
  const properties = program.graphicSpec.objects[id]?.properties;
  assert.notEqual(properties, undefined, id);
  return properties;
}

function itemValues(program, id, property) {
  return program.graphicSpec.objects[id].items.map(
    item => item.properties[property]
  );
}

test("shows the exact Cars combined-legend offset and aligned target", () => {
  const comparison = createCarsCombinedLegendComparison(loadCars());
  const current = comparison.children.current;
  const target = comparison.children.target;

  assert.equal(
    title(current, "sizeLegendTitle").x -
      title(current, "seriesLegendTitle").x,
    CARS_LEGEND_TARGET.categoricalShiftX
  );
  assert.equal(title(target, "seriesLegendTitle").x, CARS_LEGEND_TARGET.titleX);
  assert.equal(title(target, "sizeLegendTitle").x, CARS_LEGEND_TARGET.titleX);
  assert.deepEqual(
    target.semanticSpec,
    current.semanticSpec,
    "the visual target changes concrete placement only"
  );
});

test("shows current overlap and the aligned non-overlapping three-block target", () => {
  const comparison = createThreeBlockLegendComparison();
  const current = comparison.children.current;
  const target = comparison.children.target;

  assert.deepEqual(
    {
      category: {
        x: title(current, "colorLegendTitle").x,
        y: title(current, "colorLegendTitle").y
      },
      size: {
        x: title(current, "sizeLegendTitle").x,
        y: title(current, "sizeLegendTitle").y
      },
      opacity: {
        x: title(current, "opacityLegendTitle").x,
        y: title(current, "opacityLegendTitle").y
      }
    },
    {
      category: MULTI_LEGEND_CURRENT.categoricalTitle,
      size: MULTI_LEGEND_CURRENT.sizeTitle,
      opacity: MULTI_LEGEND_CURRENT.opacityTitle
    }
  );
  assert.equal(
    title(current, "colorLegendTitle").y,
    title(current, "opacityLegendTitle").y
  );
  for (const id of [
    "colorLegendTitle", "sizeLegendTitle", "opacityLegendTitle"
  ]) {
    assert.equal(title(target, id).x, MULTI_LEGEND_TARGET.titleX);
  }
  assert.deepEqual(
    itemValues(target, "colorLegendLabels", "y"),
    MULTI_LEGEND_TARGET.category.itemY
  );
  assert.deepEqual(
    itemValues(target, "sizeLegendSymbols", "y"),
    MULTI_LEGEND_TARGET.size.itemY
  );
  assert.deepEqual(
    itemValues(target, "opacityLegendSymbols", "y"),
    MULTI_LEGEND_TARGET.opacity.itemY
  );
  assert.deepEqual(target.semanticSpec, current.semanticSpec);
});
