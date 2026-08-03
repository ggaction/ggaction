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

function itemCenters(program, id) {
  const graphic = program.graphicSpec.objects[id];
  return graphic.items.map(item => {
    const properties = item.properties;
    if ((item.type ?? graphic.type) === "rect") {
      return properties.x + properties.width / 2;
    }
    if (properties.x1 !== undefined) return (properties.x1 + properties.x2) / 2;
    return properties.x;
  });
}

test("shows the exact Cars combined-legend offset and aligned target", () => {
  const comparison = createCarsCombinedLegendComparison(loadCars());
  const current = comparison.children.current;
  const target = comparison.children.target;

  assert.equal(
    title(current, "sizeLegendTitle").x -
      title(current, "seriesLegendTitle").x,
    CARS_LEGEND_TARGET.categoricalTitleShiftX
  );
  assert.equal(title(target, "seriesLegendTitle").x, CARS_LEGEND_TARGET.titleX);
  assert.equal(title(target, "sizeLegendTitle").x, CARS_LEGEND_TARGET.titleX);
  assert.deepEqual(
    itemCenters(target, "seriesLegendSymbolLines"),
    Array(2).fill(CARS_LEGEND_TARGET.symbolCenterX)
  );
  assert.deepEqual(
    itemCenters(target, "seriesLegendSymbolPoints"),
    Array(2).fill(CARS_LEGEND_TARGET.symbolCenterX)
  );
  assert.deepEqual(
    itemValues(target, "sizeLegendSymbols", "x"),
    Array(5).fill(CARS_LEGEND_TARGET.symbolCenterX)
  );
  assert.deepEqual(
    itemValues(target, "seriesLegendLabels", "x"),
    Array(2).fill(CARS_LEGEND_TARGET.labelX)
  );
  assert.deepEqual(
    itemValues(target, "sizeLegendLabels", "x"),
    Array(5).fill(CARS_LEGEND_TARGET.labelX)
  );
  assert.deepEqual(
    target.semanticSpec,
    current.semanticSpec,
    "the visual target changes concrete placement only"
  );
});

test("shows current overlap and the aligned non-overlapping three-block target", () => {
  const comparison = createThreeBlockLegendComparison(loadCars());
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
    itemCenters(target, "colorLegendSymbols"),
    Array(3).fill(MULTI_LEGEND_TARGET.symbolCenterX)
  );
  assert.deepEqual(
    itemValues(target, "sizeLegendSymbols", "x"),
    Array(3).fill(MULTI_LEGEND_TARGET.symbolCenterX)
  );
  assert.deepEqual(
    itemValues(target, "opacityLegendSymbols", "x"),
    Array(3).fill(MULTI_LEGEND_TARGET.symbolCenterX)
  );
  for (const id of [
    "colorLegendLabels", "sizeLegendLabels", "opacityLegendLabels"
  ]) {
    assert.deepEqual(
      itemValues(target, id, "x"),
      Array(3).fill(MULTI_LEGEND_TARGET.labelX)
    );
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
