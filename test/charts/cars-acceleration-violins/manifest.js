import { loadCars } from "../../support/data.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
import { createCarsViolinPrimitives } from "./primitive.program.js";
import { createCarsAccelerationViolins } from
  "../../../examples/cars-acceleration-violins/program.js";
import {
  FULL_LAYOUT,
  SPLIT_LAYOUT
} from "./reference-values.js";

const cars = loadCars();

export const fullViolinTargetCallChain = `chart()
  .createCanvas({
    width: 720,
    height: 520,
    margin: { top: 90, right: 45, bottom: 80, left: 80 }
  })
  .createData({ values: cars })
  .createViolinPlot({
    id: "violins",
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Acceleration", fieldType: "quantitative" },
    color: {
      field: "Origin",
      fieldType: "nominal",
      scale: {
        domain: ["USA", "Europe", "Japan"],
        range: ["#4c78a8", "#f58518", "#54a24b"]
      }
    },
    density: {
      bandwidth: 0.65,
      extent: [8, 25],
      steps: 80,
      width: { band: 0.8, resolve: "shared" }
    },
    area: { opacity: 0.8, strokeWidth: 1.2 },
    guides: {
      axes: {
        x: {
          ticksAndLabels: { labels: { fontSize: 13 } },
          title: { offset: 58, fontSize: 14 }
        },
        y: { title: { offset: 54, fontSize: 14 } }
      },
      legend: false
    }
  })
  .createTitle({
    text: "Acceleration Distribution by Origin",
    subtitle: "Kernel-density profiles for the Cars dataset",
    align: "center",
    offset: 4,
    gap: 11,
    titleStyle: { fontSize: 24, fontWeight: 700 }
  });`;

export const splitViolinTargetCallChain = `chart()
  .createCanvas({
    width: 760,
    height: 520,
    margin: { top: 90, right: 165, bottom: 80, left: 80 }
  })
  .createData({ values: carsWithEra })
  .createViolinPlot({
    id: "violins",
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Acceleration", fieldType: "quantitative" },
    split: {
      field: "era",
      domain: ["1970–1976", "1977–1982"]
    },
    color: {
      field: "era",
      fieldType: "nominal",
      scale: {
        domain: ["1970–1976", "1977–1982"],
        range: ["#4c78a8", "#e45756"]
      }
    },
    density: {
      bandwidth: 0.65,
      extent: [8, 25],
      steps: 80,
      width: { band: 0.8, resolve: "shared" }
    },
    area: { opacity: 0.8, strokeWidth: 1.2 },
    guides: {
      axes: {
        x: {
          ticksAndLabels: { labels: { fontSize: 13 } },
          title: { offset: 58, fontSize: 14 }
        },
        y: { title: { offset: 54, fontSize: 14 } }
      },
      legend: {
        position: "right",
        direction: "vertical",
        offset: 28,
        title: "Model era",
        symbol: {
          width: 16,
          height: 16,
          stroke: "white",
          strokeWidth: 0.75
        },
        labels: { offset: 10, fontSize: 13 },
        titleStyle: { fontSize: 14 },
        itemGap: 42
      }
    }
  })
  .createTitle({
    text: "Acceleration Distribution by Origin",
    subtitle: "Early models on the left, later models on the right",
    align: "center",
    offset: 4,
    gap: 11,
    titleStyle: { fontSize: 24, fontWeight: 700 }
  });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "cars-acceleration-violins",
    variant: "full",
    title: "Cars Full Violin Plot",
    callChain: fullViolinTargetCallChain,
    compareSemanticSpec: false,
    primitive: () => createCarsViolinPrimitives(cars),
    userFacing: () => createCarsAccelerationViolins(cars),
    width: FULL_LAYOUT.width,
    height: FULL_LAYOUT.height,
    colors: [],
    regions: [{
      name: "full violins",
      x: 80,
      y: 90,
      width: 595,
      height: 350,
      minimumInkPixels: 1200
    }]
  }),
  defineVisualVariant({
    chart: "cars-acceleration-violins",
    variant: "split-era",
    title: "Cars Split Violin Plot",
    callChain: splitViolinTargetCallChain,
    compareSemanticSpec: false,
    primitive: () => createCarsViolinPrimitives(cars, { split: true }),
    userFacing: () => createCarsAccelerationViolins(cars, { split: true }),
    width: SPLIT_LAYOUT.width,
    height: SPLIT_LAYOUT.height,
    colors: ["#4c78a8", "#e45756", "#334155"],
    regions: [
      {
        name: "split violins",
        x: 80,
        y: 90,
        width: 515,
        height: 350,
        minimumInkPixels: 1200
      },
      {
        name: "era legend",
        x: 615,
        y: 90,
        width: 135,
        height: 130,
        minimumInkPixels: 120
      }
    ]
  })
]);
