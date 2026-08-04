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
    assert.equal(opacity.left - color.right, HORIZONTAL_LEGEND_TARGET.blockGap);
    assert.equal(
      program.graphicSpec.objects.colorLegendTitle.properties.y,
      target.lineY
    );
    assert.equal(
      program.graphicSpec.objects.opacityLegendTitle.properties.y,
      target.lineY
    );
  }
});

test("keeps titles, symbols, and labels on one horizontal reading line", () => {
  const comparison = createHorizontalLegendLaneComparison(loadCars());
  for (const position of ["top", "bottom"]) {
    const program = comparison.children[position];
    const target = HORIZONTAL_LEGEND_TARGET[position];
    const objects = program.graphicSpec.objects;
    assert.equal(objects.colorLegendTitle.properties.y, target.lineY);
    assert.equal(objects.opacityLegendTitle.properties.y, target.lineY);
    assert.equal(
      objects.colorLegendSymbols.items.every(item =>
        item.properties.y + item.properties.height / 2 === target.lineY
      ),
      true
    );
    for (const id of ["colorLegendLabels", "opacityLegendSymbols", "opacityLegendLabels"]) {
      assert.equal(
        objects[id].items.every(item => item.properties.y === target.lineY),
        true
      );
    }
    for (let index = 0; index < objects.opacityLegendSymbols.items.length; index += 1) {
      const symbol = objects.opacityLegendSymbols.items[index].properties;
      const label = objects.opacityLegendLabels.items[index].properties;
      assert.equal(
        label.x - symbol.x - symbol.radius,
        HORIZONTAL_LEGEND_TARGET.symbolLabelGap
      );
    }
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

test("places continuous symbols and labels in one horizontal reading line", () => {
  const program = createHorizontalLegendOptionProgram(loadCars(), {
    gap: 40,
    label: "FULLY INLINE",
    inlineTitles: true,
    inlineContinuousLabels: true
  });
  const color = blockBounds(program, "color");
  const opacity = blockBounds(program, "opacity");
  const title = program.graphicSpec.objects.opacityLegendTitle.properties;
  const symbols = program.graphicSpec.objects.opacityLegendSymbols.items;
  const labels = program.graphicSpec.objects.opacityLegendLabels.items;
  const labelWidths = [6.36, 19.2, 22.32];
  assert.equal(opacity.left - color.right, 40);
  for (let index = 0; index < symbols.length; index += 1) {
    const symbol = symbols[index].properties;
    const label = labels[index].properties;
    assert.equal(symbol.y, title.y);
    assert.equal(label.y, title.y);
    assert.equal(label.textAlign, "left");
    assert.equal(label.x - (symbol.x + symbol.radius), 8);
    if (index > 0) {
      const previous = labels[index - 1].properties;
      assert.ok(Math.abs(
        symbol.x - symbol.radius -
        (previous.x + labelWidths[index - 1]) - 20
      ) < 1e-9);
    }
  }
});
