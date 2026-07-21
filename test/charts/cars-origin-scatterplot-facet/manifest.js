import { loadCars } from "../../support/data.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
import { createCarsOriginHistogramFacet } from
  "../../../examples/cars-origin-histogram-facet/program.js";
import { createCarsOriginScatterplotFacet } from
  "../../../examples/cars-origin-scatterplot-facet/program.js";

import {
  createCarsOriginHistogramFacetPrimitives,
  createCarsOriginScatterplotFacetPrimitives
} from "./primitive.program.js";
import { createDirectFacetValues } from "./reference-values.js";

const cars = loadCars();
const values = createDirectFacetValues(cars);
const artifact = Object.freeze({
  capability: "direct-source-facet"
});

export const scatterplotFacetTarget = `chart()
  .createCanvas({
    width: 250,
    height: 230,
    margin: { top: 34, right: 16, bottom: 48, left: 52 }
  })
  .createData({ values: rows })
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
  .encodeColor({
    field: "Cylinders",
    fieldType: "ordinal",
    scale: { domain: [8, 4, 6, 3, 5], palette: "reds" }
  })
  .createGuides({
    axes: {
      x: { title: { text: "Horsepower" } },
      y: { title: { text: "Miles per Gallon", offset: 39 } }
    },
    legend: false
  })
  .facet({ field: "Origin", guides: { legend: "shared" } })
  .createTitle({
    text: "Horsepower and Fuel Economy",
    subtitle: "Faceted by Origin",
    align: "center"
  })
  .editFacetHeaders({ fontSize: 13, fontWeight: 700, offset: 10 });`;

export const histogramFacetTarget = `chart()
  .createCanvas({
    width: 280,
    height: 240,
    margin: { top: 34, right: 18, bottom: 50, left: 52 }
  })
  .createData({ values: rows })
  .createBarMark()
  .encodeHistogram({
    field: "Displacement",
    binBoundaries: [50, 106.25, 162.5, 218.75, 275, 331.25, 387.5, 443.75, 500],
    xScale: { nice: true, zero: false }
  })
  .encodeColor({
    field: "Cylinders",
    fieldType: "ordinal",
    scale: { palette: "reds" }
  })
  .createGuides({
    axes: {
      x: { title: { text: "Displacement" } },
      y: { title: { text: "Count", offset: 39 } }
    },
    legend: false,
    grid: { horizontal: true, vertical: false }
  })
  .facet({
    field: "Origin",
    columns: 2,
    gap: 18,
    padding: 14,
    guides: { legend: "shared" }
  })
  .createTitle({
    text: "Displacement Distribution",
    subtitle: "Faceted by Origin",
    align: "center"
  });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "cars-origin-scatterplot-facet",
    variant: "default-one-row",
    title: "Cars Origin Scatterplot Facet",
    callChain: scatterplotFacetTarget,
    compareSemanticSpec: false,
    artifact,
    primitive: () => createCarsOriginScatterplotFacetPrimitives(cars),
    userFacing: () => createCarsOriginScatterplotFacet(cars),
    width: values.scatter.width,
    height: values.scatter.height,
    colors: values.colorRange,
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
    userFacing: () => createCarsOriginHistogramFacet(cars),
    width: values.histogram.width,
    height: values.histogram.height,
    colors: values.colorRange,
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
