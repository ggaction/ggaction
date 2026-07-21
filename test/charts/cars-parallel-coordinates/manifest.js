import { loadCars } from "../../support/data.js";
import { defineVisualVariant } from "../../support/visual-variants.js";

import { createCarsParallelPrimitives } from "./primitive.program.js";
import { createCarsParallelCoordinates } from
  "../../../examples/cars-parallel-coordinates/program.js";
import {
  PARALLEL_COLORS,
  PARALLEL_LAYOUT
} from "./reference-values.js";

const cars = loadCars();

export const parallelTargetCallChain = `chart()
  .createCanvas({
    width: 860,
    height: 500,
    margin: { top: 110, right: 160, bottom: 65, left: 78 }
  })
  .createData({ values: cars })
  .filterData({
    id: "cars1970",
    field: "Year",
    oneOf: ["1970-01-01"]
  })
  .createParallelCoordinates({
    dimensions: [
      { field: "Miles_per_Gallon", title: "MPG", scale: { nice: true, zero: false } },
      { field: "Horsepower", scale: { nice: true, zero: false } },
      { field: "Weight_in_lbs", title: "Weight (lb)", scale: { nice: true, zero: false } },
      { field: "Acceleration", scale: { nice: true, zero: false } }
    ],
    key: "Name",
    color: {
      field: "Origin",
      fieldType: "nominal",
      scale: { palette: "tableau10" }
    },
    line: { strokeWidth: 1.25, opacity: 0.48 },
    guides: {
      legend: {
        offset: 42,
        symbol: { length: 24, lineWidth: 3 },
        titleStyle: { color: "#1e293b" }
      }
    }
  })
  .createTitle({
    text: "Cars of 1970",
    subtitle: "Each path connects one car across four measurements",
    align: "center",
    offset: 1,
    gap: 9.5,
    titleStyle: { fontWeight: 700 },
    subtitleStyle: { fontSize: 13 }
  });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "cars-parallel-coordinates",
    variant: "cars-1970",
    title: "Cars of 1970 Parallel Coordinates",
    callChain: parallelTargetCallChain,
    compareSemanticSpec: false,
    primitive: () => createCarsParallelPrimitives(cars),
    userFacing: () => createCarsParallelCoordinates(cars),
    width: PARALLEL_LAYOUT.width,
    height: PARALLEL_LAYOUT.height,
    colors: Object.values(PARALLEL_COLORS),
    regions: [
      {
        name: "parallel paths",
        x: 78,
        y: 110,
        width: 622,
        height: 325,
        minimumInkPixels: 1400
      },
      {
        name: "origin legend",
        x: 730,
        y: 118,
        width: 118,
        height: 118,
        minimumInkPixels: 80
      }
    ]
  })
]);
