import { createCarsMultiLegendLayout } from
  "../../../examples/cars-multi-legend-layout/program.js";
import { loadCars } from "../../support/data.js";
import { defineVisualVariant } from "../../support/visual-variants.js";

import { createCarsMultiLegendLayoutPrimitives } from "./primitive.program.js";

const cars = loadCars();

function callChain(position) {
  const margin = position === "top"
    ? "{ top: 40, right: 70, bottom: 60, left: 70 }"
    : "{ top: 40, right: 70, bottom: 100, left: 70 }";
  const offset = position === "bottom" ? ",\n    offset: 60" : "";
  return `chart()
  .createCanvas({
    width: 760,
    height: 620,
    margin: ${margin}
  })
  .createData({ id: "cars", values: rows })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Displacement" })
  .encodeY({ field: "Miles_per_Gallon" })
  .encodeColor({ field: "Origin", fieldType: "nominal" })
  .encodeOpacity({ field: "Acceleration" })
  .createGuides({
    axes: {
      x: { title: { text: "Displacement" } },
      y: { title: { text: "Miles per Gallon" } }
    },
    legend: false
  })
  .createLegend({
    target: "points",
    channels: ["color"],
    position: "${position}",
    align: "left",
    columns: 3,
    titlePosition: "left"${offset}
  })
  .createLegend({
    target: "points",
    channels: ["opacity"],
    position: "${position}",
    align: "right",
    count: 3,
    titlePosition: "left"${offset}
  });`;
}

function variant(position) {
  return defineVisualVariant({
    chart: "cars-multi-legend-layout",
    variant: `${position}-inline-lane`,
    title: `Cars Multi-Legend · ${position === "top" ? "Top" : "Bottom"} Inline Lane`,
    callChain: callChain(position),
    artifact: { scope: "charts", capability: "legend-layout" },
    primitive: () => createCarsMultiLegendLayoutPrimitives(cars, { position }),
    userFacing: () => createCarsMultiLegendLayout(cars, { position }),
    width: 760,
    height: 620,
    colors: ["#4c78a8", "#f58518", "#e45756"],
    regions: [{
      name: "plot",
      x: 70,
      y: 40,
      width: 620,
      height: position === "top" ? 520 : 480,
      minimumInkPixels: 700
    }]
  });
}

export const visualVariants = Object.freeze([
  variant("top"),
  variant("bottom")
]);
