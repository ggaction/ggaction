import { loadCars } from "../../support/data.js";
import { defineVisualVariant } from "../../support/visual-variants.js";

import {
  createCarsOriginHistogramFacetPrimitives,
  createCarsOriginScatterplotFacetPrimitives
} from "./primitive.program.js";
import { createDirectFacetGateValues } from "./reference-values.js";

const cars = loadCars();
const values = createDirectFacetGateValues(cars);
const artifact = Object.freeze({
  roadmap: "roadmap3",
  phase: "phase7",
  capability: "direct-source-facet"
});

export const scatterplotFacetTarget = `chart()
  .createCanvas({
    width: 250,
    height: 230,
    margin: { top: 34, right: 16, bottom: 48, left: 52 }
  })
  .createData({ values: cars })
  .createPointMark()
  .encodeX({
    field: "Horsepower",
    scale: { nice: true, zero: false }
  })
  .encodeY({
    field: "Miles_per_Gallon",
    scale: { nice: true, zero: false }
  })
  .encodeRadius({ value: 2.5 })
  .createGuides({
    axes: {
      x: { title: { text: "Horsepower" } },
      y: { title: { text: "Miles per Gallon" } }
    }
  })
  .createTitle({
    text: "Horsepower and Fuel Economy",
    subtitle: "Faceted by Origin",
    align: "center"
  })
  .facet({ field: "Origin" })
  .editFacetHeaders({ fontSize: 13, fontWeight: 700, offset: 10 });`;

export const histogramFacetTarget = `chart()
  .createCanvas({
    width: 280,
    height: 240,
    margin: { top: 34, right: 18, bottom: 50, left: 52 }
  })
  .createData({ values: cars })
  .createBarMark()
  .encodeHistogram({
    field: "Displacement",
    maxBins: 8,
    xScale: { nice: true, zero: false }
  })
  .createGuides({
    axes: {
      x: { title: { text: "Displacement" } },
      y: { title: { text: "Count" } }
    },
    grid: { horizontal: true, vertical: false }
  })
  .createTitle({
    text: "Displacement Distribution",
    subtitle: "Faceted by Origin",
    align: "center"
  })
  .facet({ field: "Origin", columns: 2, gap: 18, padding: 14 });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "cars-origin-scatterplot-facet",
    variant: "default-one-row",
    title: "Cars Origin Scatterplot Facet",
    callChain: scatterplotFacetTarget,
    artifact,
    primitive: () => createCarsOriginScatterplotFacetPrimitives(cars),
    width: values.scatter.width,
    height: values.scatter.height,
    colors: ["#4c78a8"],
    regions: values.scatter.cells.map(cell => ({
      name: `scatter-${cell.id}`,
      x: cell.x,
      y: cell.y,
      width: cell.width,
      height: cell.height,
      minimumInkPixels: 180
    }))
  }),
  defineVisualVariant({
    chart: "cars-origin-histogram-facet",
    variant: "two-column-wrap",
    title: "Cars Origin Histogram Facet",
    callChain: histogramFacetTarget,
    artifact,
    primitive: () => createCarsOriginHistogramFacetPrimitives(cars),
    width: values.histogram.width,
    height: values.histogram.height,
    colors: ["#4c78a8"],
    regions: values.histogram.cells.map(cell => ({
      name: `histogram-${cell.id}`,
      x: cell.x,
      y: cell.y,
      width: cell.width,
      height: cell.height,
      minimumInkPixels: 180
    }))
  })
]);

