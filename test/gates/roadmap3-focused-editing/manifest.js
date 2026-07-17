import { chart } from "../../../src/index.js";
import { loadCars, loadGapminder, loadJobs } from "../../support/data.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
import {
  createBarErgonomicsPrimitives,
  createBoxPlotEditPrimitives,
  createCartesianGuideFacadePrimitives,
  createErrorBandEditPrimitives,
  createErrorBarEditPrimitives,
  createFocusedLegendPrimitives,
  createGuideRemovalPrimitives,
  createLineErgonomicsPrimitives,
  createMarkRemovalPrimitives,
  createPointScaleErgonomicsPrimitives,
  createRegressionEditPrimitives
} from "./primitive.program.js";

const cars = loadCars();
const gapminder = loadGapminder();
const jobs = loadJobs();

const phase = "phase1";

function createPointScaleErgonomicsActions(rows) {
  const validRows = rows.filter(row =>
    Number.isFinite(row.Horsepower) &&
    Number.isFinite(row.Miles_per_Gallon) &&
    typeof row.Origin === "string" &&
    row.Origin.length > 0
  );
  return chart()
    .createCanvas({
      width: 760,
      height: 400,
      margin: { top: 30, right: 150, bottom: 60, left: 70 }
    })
    .createData({ id: "cars", values: validRows })
    .createPointMark({
      id: "points",
      opacity: 0.48,
      stroke: "white",
      strokeWidth: 1.25
    })
    .encodeX({ field: "Horsepower" })
    .encodeY({ field: "Miles_per_Gallon" })
    .encodeColor({ field: "Origin" })
    .encodeRadius({ value: 3 })
    .createGuides({ legend: { channels: ["color"] } })
    .editScale({ id: "color", palette: "set2" });
}

function createBarErgonomicsActions(rows) {
  return chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 40, right: 140, bottom: 70, left: 80 }
    })
    .createData({ id: "jobs", values: rows })
    .createBarMark({
      id: "bars",
      opacity: 0.78,
      stroke: "#0f172a",
      strokeWidth: 1.25
    })
    .encodeX({ field: "year", fieldType: "ordinal" })
    .encodeY({ field: "perc", aggregate: "mean", stack: null })
    .encodeColor({ field: "sex", layout: "group" })
    .createGuides();
}

function createLineErgonomicsActions(rows) {
  return chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 80, right: 170, bottom: 60, left: 80 }
    })
    .createData({ id: "cars", values: rows })
    .createLineMark({ id: "trends", stroke: "#7c3aed" })
    .encodeX({ field: "Year", fieldType: "temporal", scale: { nice: true } })
    .encodeY({
      field: "Acceleration",
      aggregate: "mean",
      scale: { nice: true, zero: false }
    })
    .encodeGroup({ field: "Cylinders" })
    .editLineMark({ target: "trends", opacity: 0.55 });
}

function createFocusedLegendActions(rows) {
  return chart()
    .createCanvas({
      width: 760,
      height: 480,
      margin: { top: 40, right: 80, bottom: 70, left: 190 }
    })
    .createData({ id: "cars", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "Displacement", scale: { nice: true, zero: false } })
    .encodeY({ field: "Acceleration", scale: { nice: true, zero: false } })
    .encodeColor({ field: "Origin" })
    .encodeSize({ field: "Acceleration" })
    .encodeShape({ field: "Origin" })
    .encodeOpacity({ value: 0.27 })
    .filterMarks({ field: "Origin", op: "oneOf", values: ["Japan", "USA"] })
    .createRegression()
    .createGuides()
    .editLegendLayout({
      target: "points",
      position: "left",
      align: "center",
      direction: "vertical",
      offset: 80,
      titlePosition: "top"
    })
    .editLegendLabels({
      target: "points",
      color: "#475569",
      fontSize: 12
    })
    .editLegendTitle({
      target: "points",
      color: "#0f172a",
      fontSize: 14,
      fontWeight: 700
    })
    .editLegendSymbols({ target: "points", count: 5 })
    .editLegendBorder({
      target: "points",
      border: {
        color: "#94a3b8",
        lineWidth: 1,
        padding: 10,
        background: "#f8fafc"
      }
    });
}

function createCartesianGuideFacadeActions(rows) {
  const validRows = rows.filter(row =>
    Number.isFinite(row.Horsepower) &&
    Number.isFinite(row.Miles_per_Gallon) &&
    typeof row.Origin === "string" &&
    row.Origin.length > 0
  );
  return chart()
    .createCanvas({
      width: 640,
      height: 400,
      margin: { top: 80, right: 90, bottom: 30, left: 30 }
    })
    .createData({ id: "cars", values: validRows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "Horsepower" })
    .encodeY({ field: "Miles_per_Gallon" })
    .encodeColor({ field: "Origin" })
    .encodeRadius({ value: 3 })
    .createGuides()
    .editXAxis({
      position: "top",
      ticksAndLabels: { labels: { offset: 12, format: ".1f" } },
      title: { offset: 62 }
    })
    .editYAxis({
      position: "right",
      ticksAndLabels: { labels: { offset: 12, format: ".1f" } },
      title: { text: "Miles per Gallon", offset: 70 }
    })
    .editGrid({
      horizontal: { color: "#cbd5e1", strokeDash: [4, 4] }
    });
}

function artifact(capability) {
  return Object.freeze({ roadmap: "roadmap3", phase, capability });
}

const pointScaleCallChain = `chart()
  .createCanvas({
    width: 760,
    height: 400,
    margin: { top: 30, right: 150, bottom: 60, left: 70 }
  })
  .createData({ id: "cars", values: rows })
  .createPointMark({
    id: "points",
    opacity: 0.48,
    stroke: "white",
    strokeWidth: 1.25
  })
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" })
  .encodeColor({ field: "Origin" })
  .encodeRadius({ value: 3 })
  .createGuides({ legend: { channels: ["color"] } })
  .editScale({ id: "color", palette: "set2" });`;

const barCallChain = `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 40, right: 140, bottom: 70, left: 80 }
  })
  .createData({ id: "jobs", values: jobs })
  .createBarMark({
    id: "bars",
    opacity: 0.78,
    stroke: "#0f172a",
    strokeWidth: 1.25
  })
  .encodeX({ field: "year", fieldType: "ordinal" })
  .encodeY({ field: "perc", aggregate: "mean", stack: null })
  .encodeColor({ field: "sex", layout: "group" })
  .createGuides();`;

const lineCallChain = `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 80, right: 170, bottom: 60, left: 80 }
  })
  .createData({ id: "cars", values: rows })
  .createLineMark({ id: "trends", stroke: "#7c3aed" })
  .encodeX({ field: "Year", fieldType: "temporal", scale: { nice: true } })
  .encodeY({
    field: "Acceleration",
    aggregate: "mean",
    scale: { nice: true, zero: false }
  })
  .encodeGroup({ field: "Cylinders" })
  .editLineMark({ target: "trends", opacity: 0.55 });`;

const legendCallChain = `chart()
  .createCanvas({
    width: 760,
    height: 480,
    margin: { top: 40, right: 80, bottom: 70, left: 190 }
  })
  .createData({ id: "cars", values: rows })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Displacement", scale: { nice: true, zero: false } })
  .encodeY({ field: "Acceleration", scale: { nice: true, zero: false } })
  .encodeColor({ field: "Origin" })
  .encodeSize({ field: "Acceleration" })
  .encodeShape({ field: "Origin" })
  .encodeOpacity({ value: 0.27 })
  .filterMarks({ field: "Origin", op: "oneOf", values: ["Japan", "USA"] })
  .createRegression()
  .createGuides()
  .editLegendLayout({
    target: "points",
    position: "left",
    align: "center",
    direction: "vertical",
    offset: 80,
    titlePosition: "top"
  })
  .editLegendLabels({
    target: "points",
    color: "#475569",
    fontSize: 12
  })
  .editLegendTitle({
    target: "points",
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 700
  })
  .editLegendSymbols({ target: "points", count: 5 })
  .editLegendBorder({
    target: "points",
    border: {
      color: "#94a3b8",
      lineWidth: 1,
      padding: 10,
      background: "#f8fafc"
    }
  });`;

const guidesCallChain = `chart()
  .createCanvas({
    width: 640,
    height: 400,
    margin: { top: 80, right: 90, bottom: 30, left: 30 }
  })
  .createData({ id: "cars", values: rows })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" })
  .encodeColor({ field: "Origin" })
  .encodeRadius({ value: 3 })
  .createGuides()
  .editXAxis({
    position: "top",
    ticksAndLabels: { labels: { offset: 12, format: ".1f" } },
    title: { offset: 62 }
  })
  .editYAxis({
    position: "right",
    ticksAndLabels: { labels: { offset: 12, format: ".1f" } },
    title: { text: "Miles per Gallon", offset: 70 }
  })
  .editGrid({
    horizontal: { color: "#cbd5e1", strokeDash: [4, 4] }
  });`;

const errorBarCallChain = `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 90, right: 40, bottom: 70, left: 80 }
  })
  .createData({ values: rows })
  .createErrorBar({
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Acceleration" }
  })
  .createGuides()
  .editErrorBar({
    target: "errorBar",
    caps: true,
    capSize: 16,
    stroke: "#d9485f",
    strokeWidth: 3,
    strokeDash: "dashed",
    opacity: 0.8
  });`;

const errorBandCallChain = `chart()
  .createCanvas({
    width: 760,
    height: 480,
    margin: { top: 90, right: 170, bottom: 70, left: 80 }
  })
  .createData({ values: gapminder })
  .createErrorBand({
    x: { field: "year", fieldType: "temporal" },
    y: { field: "life_expect", center: "mean", extent: "ci" },
    groupBy: "cluster"
  })
  .encodeColor({ target: "errorBand", field: "cluster" })
  .createGuides()
  .editErrorBand({
    target: "errorBand",
    fill: "#7dd3fc",
    opacity: 0.34,
    curve: "cardinal"
  })
  .editErrorBandBoundary({
    target: "errorBand",
    boundary: "both",
    stroke: "#0369a1",
    strokeWidth: 2,
    curve: "cardinal"
  });`;

const regressionCallChain = `chart()
  .createCanvas({
    width: 760,
    height: 480,
    margin: { top: 40, right: 190, bottom: 70, left: 80 }
  })
  .createData({ id: "cars", values: rows })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Displacement", scale: { nice: true, zero: false } })
  .encodeY({ field: "Acceleration", scale: { nice: true, zero: false } })
  .encodeColor({ field: "Origin" })
  .filterMarks({ field: "Origin", op: "oneOf", values: ["Japan", "USA"] })
  .createRegression()
  .createGuides()
  .editRegression({
    target: "points",
    method: "polynomial",
    degree: 2,
    band: { color: "#a78bfa", opacity: 0.16 },
    line: { strokeWidth: 4 }
  });`;

const boxPlotCallChain = `chart()
  .createCanvas({
    width: 360,
    height: 460,
    margin: { top: 140, right: 40, bottom: 70, left: 80 }
  })
  .createData({ values: rows })
  .createBoxPlot({
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Miles_per_Gallon" }
  })
  .createGuides({ legend: false })
  .createTitle({
    text: "Fuel Economy Distribution by Origin",
    subtitle: "Factor 1.0 with custom styling",
    maxWidth: 240
  })
  .editBoxPlot({
    target: "boxPlot",
    whisker: { type: "tukey", factor: 1 },
    width: { band: 0.5 },
    box: {
      fill: "#f28e2b",
      opacity: 0.82,
      stroke: "#9a3412",
      strokeWidth: 2
    },
    median: { stroke: "#431407", strokeWidth: 3 },
    outlier: { shape: "diamond", radius: 4, opacity: 0.9 }
  });`;

const guideRemovalCallChain = `chart()
  .createCanvas({
    width: 432,
    height: 460,
    margin: { top: 80, right: 60, bottom: 130, left: 80 }
  })
  .createData({ values: rows })
  .createBarMark({ id: "bars" })
  .encodeHistogram({
    field: "Displacement",
    groupBy: "Origin",
    maxbins: 10
  })
  .createGuides()
  .createTitle({ text: "Displacement distribution", subtitle: "by country" })
  .removeXAxis()
  .removeYAxis()
  .removeGrid()
  .removeLegend({ target: "bars" })
  .removeTitle();`;

const markRemovalCallChain = `chart()
  .createCanvas({ width: 456, height: 312, margin: 60 })
  .createData({ values: gapminder })
  .filterData({ id: "gapminder2005", field: "year", op: "eq", value: 2005 })
  .filterData({
    id: "selectedCountries",
    field: "country",
    op: "oneOf",
    values: ["China", "India", "United States", "Japan"]
  })
  .createBarMark({ id: "bar" })
  .encodeX({ field: "country", fieldType: "nominal" })
  .encodeY({ field: "pop", aggregate: "mean", scale: { zero: true } })
  .createPointMark({ id: "point" })
  .createGuides()
  .createTitle({
    text: "Population by Country",
    subtitle: "Band slots with aligned point centers · 2005"
  })
  .editYAxis({ labels: { format: ".2e" }, title: { offset: 58 } })
  .removeMark({ target: "point" });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "cars-scatterplot",
    variant: "point-create-and-palette-edit",
    title: "Point Appearance and Palette Edit",
    callChain: pointScaleCallChain,
    artifact: artifact("mark-and-scale-ergonomics"),
    primitive: () => createPointScaleErgonomicsPrimitives(cars),
    userFacing: () => createPointScaleErgonomicsActions(cars),
    width: 760,
    height: 400,
    colors: [],
    regions: [{ name: "plot", x: 70, y: 30, width: 540, height: 310 }]
  }),
  defineVisualVariant({
    chart: "jobs-grouped-bar",
    variant: "bar-create-appearance",
    title: "Bar Create Appearance",
    callChain: barCallChain,
    artifact: artifact("mark-and-scale-ergonomics"),
    primitive: () => createBarErgonomicsPrimitives(jobs),
    userFacing: () => createBarErgonomicsActions(jobs),
    width: 720,
    height: 460,
    colors: [],
    regions: [{ name: "plot", x: 80, y: 40, width: 500, height: 350 }]
  }),
  defineVisualVariant({
    chart: "cars-line-chart",
    variant: "line-create-edit-appearance",
    title: "Line Create and Edit Appearance",
    callChain: lineCallChain,
    artifact: artifact("mark-and-scale-ergonomics"),
    primitive: () => createLineErgonomicsPrimitives(cars),
    userFacing: () => createLineErgonomicsActions(cars),
    width: 720,
    height: 460,
    colors: [],
    regions: [{ name: "plot", x: 80, y: 80, width: 470, height: 320 }]
  }),
  defineVisualVariant({
    chart: "cars-regression-scatterplot",
    variant: "focused-legend-components",
    title: "Focused Legend Components",
    callChain: legendCallChain,
    artifact: artifact("focused-component-editing"),
    primitive: () => createFocusedLegendPrimitives(cars),
    userFacing: () => createFocusedLegendActions(cars),
    width: 760,
    height: 480,
    colors: [],
    regions: [
      { name: "legend", x: 10, y: 40, width: 105, height: 360 },
      { name: "plot", x: 190, y: 40, width: 490, height: 370 }
    ]
  }),
  defineVisualVariant({
    chart: "cars-scatterplot",
    variant: "cartesian-guide-facades",
    title: "Cartesian Guide Facades",
    callChain: guidesCallChain,
    artifact: artifact("focused-component-editing"),
    primitive: () => createCartesianGuideFacadePrimitives(cars),
    userFacing: () => createCartesianGuideFacadeActions(cars),
    width: 640,
    height: 400,
    colors: [],
    regions: [{ name: "plot", x: 30, y: 80, width: 520, height: 290 }]
  }),
  defineVisualVariant({
    chart: "cars-error-bar",
    variant: "owner-edit",
    title: "Error Bar Owner Edit",
    callChain: errorBarCallChain,
    artifact: artifact("focused-component-editing"),
    primitive: () => createErrorBarEditPrimitives(cars),
    width: 720,
    height: 460,
    colors: [],
    regions: [{ name: "plot", x: 80, y: 90, width: 600, height: 300 }]
  }),
  defineVisualVariant({
    chart: "gapminder-error-band",
    variant: "owner-and-boundary-edit",
    title: "Error Band Owner and Boundary Edit",
    callChain: errorBandCallChain,
    artifact: artifact("focused-component-editing"),
    primitive: () => createErrorBandEditPrimitives(gapminder),
    width: 760,
    height: 480,
    colors: [],
    regions: [{ name: "plot", x: 80, y: 90, width: 510, height: 320 }]
  }),
  defineVisualVariant({
    chart: "cars-regression-scatterplot",
    variant: "owner-edit",
    title: "Regression Owner Edit",
    callChain: regressionCallChain,
    artifact: artifact("focused-component-editing"),
    primitive: () => createRegressionEditPrimitives(cars),
    width: 760,
    height: 480,
    colors: [],
    regions: [{ name: "plot", x: 80, y: 40, width: 490, height: 370 }]
  }),
  defineVisualVariant({
    chart: "cars-box-plot",
    variant: "owner-edit",
    title: "Box Plot Owner Edit",
    callChain: boxPlotCallChain,
    artifact: artifact("focused-component-editing"),
    primitive: () => createBoxPlotEditPrimitives(cars),
    width: 360,
    height: 460,
    colors: [],
    regions: [{ name: "plot", x: 80, y: 140, width: 240, height: 250 }]
  }),
  defineVisualVariant({
    chart: "cars-histogram",
    variant: "remove-guides-and-title",
    title: "Guide and Title Removal",
    callChain: guideRemovalCallChain,
    artifact: artifact("domain-removal"),
    primitive: () => createGuideRemovalPrimitives(cars),
    width: 432,
    height: 460,
    colors: [],
    regions: [{ name: "bars", x: 80, y: 80, width: 292, height: 250 }]
  }),
  defineVisualVariant({
    chart: "gapminder-layered-bar-point",
    variant: "remove-point-mark",
    title: "Independent Point Mark Removal",
    callChain: markRemovalCallChain,
    artifact: artifact("domain-removal"),
    primitive: () => createMarkRemovalPrimitives(gapminder),
    width: 456,
    height: 312,
    colors: [],
    regions: [{ name: "bars", x: 60, y: 60, width: 336, height: 190 }]
  })
]);
