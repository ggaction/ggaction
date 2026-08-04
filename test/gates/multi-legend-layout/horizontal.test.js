import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveConcreteGraphicBounds,
  unionConcreteGraphicBounds
} from
  "../../../src/grammar/schemas/graphicBounds.js";
import { loadCars } from "../../support/data.js";

import {
  createHorizontalLegendLaneComparison,
  createHorizontalLegendOptionProgram
} from "./horizontal.program.js";
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
    assert.equal(color.left, 70);
    assert.equal(opacity.left - color.right, 24);
    assert.equal(
      program.graphicSpec.objects.colorLegendTitle.properties.y,
      target.titleY
    );
    assert.equal(
      program.graphicSpec.objects.opacityLegendTitle.properties.y,
      target.titleY
    );
  }
});

test("shares title and graphical rows with exact internal spacing", () => {
  const comparison = createHorizontalLegendLaneComparison(loadCars());
  for (const position of ["top", "bottom"]) {
    const program = comparison.children[position];
    const target = HORIZONTAL_LEGEND_TARGET[position];
    const titleIds = ["colorLegendTitle", "opacityLegendTitle"];
    const elementIds = ["colorLegendSymbols", "opacityLegendSymbols"];
    const titles = titleIds.map(id =>
      resolveConcreteGraphicBounds(program.graphicSpec, id)
    );
    const elements = elementIds.map(id =>
      resolveConcreteGraphicBounds(program.graphicSpec, id)
    );
    assert.deepEqual(elements.map(bounds => bounds.top), [
      target.elementTop,
      target.elementTop
    ]);
    for (let index = 0; index < titles.length; index += 1) {
      assert.equal(
        elements[index].top - titles[index].bottom,
        HORIZONTAL_LEGEND_TARGET.titleElementGap
      );
    }
    const opacityLabels = resolveConcreteGraphicBounds(
      program.graphicSpec,
      "opacityLegendLabels"
    );
    assert.equal(
      opacityLabels.top - elements[1].bottom,
      HORIZONTAL_LEGEND_TARGET.titleElementGap
    );
  }
});

test("compares exact 24, 32, and 40 pixel block gaps", () => {
  for (const gap of [24, 32, 40]) {
    const program = createHorizontalLegendOptionProgram(loadCars(), {
      gap,
      label: `${gap} PX`,
      inlineTitles: false
    });
    const color = blockBounds(program, "color");
    const opacity = blockBounds(program, "opacity");
    assert.equal(color.left, 70);
    assert.equal(opacity.left - color.right, gap);
  }
});

test("places both titles inline before their graphical content", () => {
  const program = createHorizontalLegendOptionProgram(loadCars(), {
    gap: 40,
    label: "INLINE",
    inlineTitles: true
  });
  const color = blockBounds(program, "color");
  const opacity = blockBounds(program, "opacity");
  assert.equal(color.left, 70);
  assert.equal(opacity.left - color.right, 40);
  for (const kind of ["color", "opacity"]) {
    const title = resolveConcreteGraphicBounds(
      program.graphicSpec,
      `${kind}LegendTitle`
    );
    const symbols = resolveConcreteGraphicBounds(
      program.graphicSpec,
      `${kind}LegendSymbols`
    );
    assert.ok(Math.abs(symbols.left - title.right - 20) < 1e-9);
    assert.equal(
      program.graphicSpec.objects[`${kind}LegendTitle`].properties.y,
      (symbols.top + symbols.bottom) / 2
    );
  }
});
