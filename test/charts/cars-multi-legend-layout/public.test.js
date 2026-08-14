import assert from "node:assert/strict";
import test from "node:test";

import { createCarsMultiLegendLayout } from
  "../../../examples/cars-multi-legend-layout/program.js";
import {
  resolveConcreteGraphicBounds,
  unionConcreteGraphicBounds
} from "../../../src/grammar/schemas/graphicBounds.js";
import { assertChartProgramsEquivalent } from
  "../../support/chart-equivalence.js";
import { loadCars } from "../../support/data.js";

import { createCarsMultiLegendLayoutPrimitives } from "./primitive.program.js";
import { LEGEND_LAYOUT } from "./reference-values.js";

function blockBounds(program, kind) {
  return unionConcreteGraphicBounds(program.graphicSpec, [
    `${kind}LegendTitle`,
    `${kind}LegendSymbols`,
    `${kind}LegendLabels`
  ]);
}

test("matches the stable primitive program at both horizontal edges", () => {
  const cars = loadCars();
  for (const position of ["top", "bottom"]) {
    assertChartProgramsEquivalent({
      primitiveProgram: createCarsMultiLegendLayoutPrimitives(cars, { position }),
      publicProgram: createCarsMultiLegendLayout(cars, { position })
    });
  }
});

test("left-packs inline legend blocks with the approved reading rhythm", () => {
  for (const position of ["top", "bottom"]) {
    const program = createCarsMultiLegendLayout(loadCars(), { position });
    const values = LEGEND_LAYOUT[position];
    const color = blockBounds(program, "color");
    const opacity = blockBounds(program, "opacity");
    const legend = unionConcreteGraphicBounds(program.graphicSpec, [
      "colorLegendTitle",
      "colorLegendSymbols",
      "colorLegendLabels",
      "opacityLegendTitle",
      "opacityLegendSymbols",
      "opacityLegendLabels"
    ]);
    const objects = program.graphicSpec.objects;

    assert.equal(objects.points.items.length, 398);
    assert.equal(color.left, 70);
    assert.equal(opacity.left - color.right, LEGEND_LAYOUT.blockGap);
    assert.equal(objects.colorLegendTitle.properties.y, values.lineY);
    assert.equal(objects.opacityLegendTitle.properties.y, values.lineY);
    assert.equal(
      position === "top"
        ? 40 - legend.bottom
        : legend.top - resolveConcreteGraphicBounds(
            program.graphicSpec,
            "xAxisTitle"
          ).bottom,
      values.chartGap
    );
    assert.equal(
      objects.colorLegendSymbols.items.every(item =>
        item.properties.y + item.properties.height / 2 === values.lineY
      ),
      true
    );
    for (const id of [
      "colorLegendLabels",
      "opacityLegendSymbols",
      "opacityLegendLabels"
    ]) {
      assert.equal(
        objects[id].items.every(item => item.properties.y === values.lineY),
        true
      );
    }
    for (let index = 0; index < objects.opacityLegendSymbols.items.length; index += 1) {
      const symbol = objects.opacityLegendSymbols.items[index].properties;
      const label = objects.opacityLegendLabels.items[index].properties;
      assert.ok(Math.abs(
        label.x - symbol.x - symbol.radius - LEGEND_LAYOUT.symbolLabelGap
      ) < 1e-9);
      if (index > 0) {
        const previousLabel = objects.opacityLegendLabels.items[index - 1].properties;
        assert.ok(Math.abs(
          symbol.x - symbol.radius -
          previousLabel.x - LEGEND_LAYOUT.opacityLabelWidth[index - 1] -
          LEGEND_LAYOUT.sampleGap
        ) < 1e-9);
      }
    }
    assert.equal(
      resolveConcreteGraphicBounds(program.graphicSpec, "opacityLegendTitle").right <
      resolveConcreteGraphicBounds(program.graphicSpec, "opacityLegendSymbols").left,
      true
    );
  }
});

test("owns input rows and leaves the earlier program immutable", () => {
  const cars = loadCars();
  const before = structuredClone(cars);
  const top = createCarsMultiLegendLayout(cars, { position: "top" });
  const topGraphic = structuredClone(top.graphicSpec);
  const bottom = createCarsMultiLegendLayout(cars, { position: "bottom" });

  assert.deepEqual(cars, before);
  cars[0].Displacement = -1;
  assert.deepEqual(top.semanticSpec.datasets[0].values, before.filter(car =>
    Number.isFinite(car.Displacement) &&
    Number.isFinite(car.Miles_per_Gallon) &&
    Number.isFinite(car.Acceleration) &&
    typeof car.Origin === "string" &&
    car.Origin.length > 0
  ));
  assert.deepEqual(top.graphicSpec, topGraphic);
  assert.notDeepEqual(bottom.graphicSpec, top.graphicSpec);
});
