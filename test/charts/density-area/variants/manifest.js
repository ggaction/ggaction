import { createCarsDensityArea } from
  "../../../../examples/cars-density-area/program.js";
import { loadCars } from "../../../support/data.js";
import { defineVisualVariant } from "../../../support/visual-variants.js";
import { createCarsDensityAreaPrimitives } from "../primitive.program.js";
import { createAreaOutlineEditPrimitives } from "./primitive-programs.js";

const cars = loadCars();

const shared = Object.freeze({
  chart: "cars-density-area",
  width: 720,
  height: 500,
  colors: ["#4c78a8", "#f58518", "#e45756"],
  regions: [Object.freeze({
    name: "plot",
    x: 80,
    y: 130,
    width: 600,
    height: 300,
    minimumInkPixels: 200
  })]
});

const baselineCallChain = `chart()
  .createCanvas({
    width: 720,
    height: 500,
    margin: { top: 130, right: 40, bottom: 70, left: 80 }
  })
  .createData({ id: "cars", values: rows })
  .createAreaMark({ id: "densities", opacity: 0.5 })
  .encodeDensity({
    field: "Acceleration",
    groupBy: "Origin",
    bandwidth: 0.6
  })
  .encodeColor({
    field: "Origin",
    scale: { palette: "tableau10" }
  })
  .createGuides({
    grid: { horizontal: {}, vertical: {} },
    legend: {
      position: "top",
      direction: "vertical",
      columns: 3,
      titlePosition: "left",
      offset: 8
    }
  })
  .createTitle({
    text: "Distribution of Acceleration",
    subtitle: "By Origin (cars dataset)"
  });`;

export const visualVariants = Object.freeze([defineVisualVariant({
  ...shared,
  variant: "baseline",
  title: "Canonical Density Area Baseline",
  callChain: baselineCallChain,
  primitive: createCarsDensityAreaPrimitives(cars),
  userFacing: createCarsDensityArea(cars)
}), defineVisualVariant({
  ...shared,
  variant: "area-outline-edit",
  title: "Density Area Outline Edit",
  callChain: `${baselineCallChain.slice(0, -1)}
  .editAreaMark({
    target: "densities",
    opacity: 0.35,
    stroke: "#334155",
    strokeWidth: 1.5
  });`,
  primitive: createAreaOutlineEditPrimitives(cars)
})]);
