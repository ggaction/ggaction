import assert from "node:assert/strict";
import test from "node:test";

import { loadCars } from "../../support/data.js";

import {
  createCarsCombinedLegendComparison,
  createThreeBlockLegendComparison
} from "./primitive.program.js";
import {
  CARS_LEGEND_TARGET,
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

test("matches the approved Cars combined-legend lane", () => {
  const comparison = createCarsCombinedLegendComparison(loadCars());
  const current = comparison.children.current;
  const target = comparison.children.target;

  for (const program of [current, target]) {
    assert.equal(title(program, "seriesLegendTitle").x, CARS_LEGEND_TARGET.titleX);
    assert.equal(title(program, "sizeLegendTitle").x, CARS_LEGEND_TARGET.titleX);
  }
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

test("matches the approved non-overlapping three-block lane", () => {
  const comparison = createThreeBlockLegendComparison(loadCars());
  const current = comparison.children.current;
  const target = comparison.children.target;

  for (const program of [current, target]) {
    for (const id of [
      "colorLegendTitle", "sizeLegendTitle", "opacityLegendTitle"
    ]) {
      assert.equal(title(program, id).x, MULTI_LEGEND_TARGET.titleX);
    }
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
