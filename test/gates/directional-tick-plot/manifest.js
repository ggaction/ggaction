import { defineVisualVariant } from "../../support/visual-variants.js";
import { loadCars } from "../../support/data.js";

import {
  createDirectionalTickPointPrimitives,
  createHorsepowerRugPrimitives
} from "./primitive.program.js";
import { DIRECTION_LAYOUT, RUG_LAYOUT } from "./reference-values.js";

const cars = loadCars();

export const comparisonCallChain = `hconcat({
  id: "directionalTickPointComparison",
  programs: [
    { id: "baseline", program: baseline },
    { id: "directionalTicks", program: directionalTicks },
    { id: "directionalPoints", program: directionalPoints }
  ],
  gap: 20,
  padding: 6,
  align: "start"
});`;

export const rugCallChain = `chart()
  .createCanvas({
    width: 800,
    height: 240,
    margin: { top: 70, right: 40, bottom: 70, left: 60 }
  })
  .createData({ id: "cars", values: rows })
  .createTickMark({
    id: "ticks",
    length: 28,
    stroke: "#2563eb",
    strokeWidth: 1.4,
    opacity: 0.28
  })
  .encodeX({
    target: "ticks",
    field: "Horsepower",
    fieldType: "quantitative",
    scale: { domain: [40, 240] }
  })
  .encodeY({
    target: "ticks",
    field: "Baseline",
    fieldType: "quantitative",
    scale: { domain: [-1, 1] }
  })
  .createGuides({
    axes: {
      x: { title: { text: "Horsepower" } },
      y: false
    },
    grid: false,
    legend: false
  });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "directional-tick-plot",
    variant: "baseline-tick-point-directions",
    title: "Tick and Point Direction Convention",
    callChain: comparisonCallChain,
    artifact: { scope: "review" },
    primitive: createDirectionalTickPointPrimitives,
    width: DIRECTION_LAYOUT.padding * 2 +
      DIRECTION_LAYOUT.panelWidth * 3 + DIRECTION_LAYOUT.gap * 2,
    height: DIRECTION_LAYOUT.padding * 2 + DIRECTION_LAYOUT.panelHeight,
    colors: ["#64748b", "#2563eb", "#f97316"],
    regions: ["baseline Tick", "directional Tick", "directional point"].map(
      (name, index) => ({
        name,
        x: DIRECTION_LAYOUT.padding + index * (
          DIRECTION_LAYOUT.panelWidth + DIRECTION_LAYOUT.gap
        ),
        y: DIRECTION_LAYOUT.padding,
        width: DIRECTION_LAYOUT.panelWidth,
        height: DIRECTION_LAYOUT.panelHeight,
        minimumInkPixels: 500
      })
    )
  }),
  defineVisualVariant({
    chart: "directional-tick-plot",
    variant: "cars-horsepower-rug",
    title: "Cars Horsepower Rug Plot",
    callChain: rugCallChain,
    artifact: { scope: "review" },
    primitive: () => createHorsepowerRugPrimitives(cars),
    width: RUG_LAYOUT.width,
    height: RUG_LAYOUT.height,
    colors: [{ value: "#c2d4f9", tolerance: 1, minimumPixels: 1000 }],
    regions: [{
      name: "horsepower rug",
      x: RUG_LAYOUT.left,
      y: 76,
      width: RUG_LAYOUT.right - RUG_LAYOUT.left,
      height: RUG_LAYOUT.axisY - 76,
      minimumInkPixels: 700
    }]
  })
]);
