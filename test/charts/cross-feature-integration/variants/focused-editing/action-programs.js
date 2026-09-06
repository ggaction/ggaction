import { chart } from "../../../../../src/index.js";

export function createPointScaleErgonomicsActions(rows) {
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

export function createBarErgonomicsActions(rows) {
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

export function createLineErgonomicsActions(rows) {
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

export function createFocusedLegendActions(rows) {
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
    .createGuides({ legend: { position: "left", offset: 80 } })
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

export function createGuideRemovalActions(rows) {
  const validRows = rows.filter(row =>
    Number.isFinite(row.Displacement) &&
    typeof row.Origin === "string" &&
    row.Origin.length > 0
  );
  return chart()
    .createCanvas({
      width: 432,
      height: 460,
      margin: { top: 80, right: 60, bottom: 130, left: 80 }
    })
    .createData({ values: validRows })
    .createBarMark({ id: "bars" })
    .encodeHistogram({
      field: "Displacement",
      maxBins: 10,
      xScale: { nice: true, zero: false }
    })
    .encodeColor({ field: "Origin", scale: { palette: "tableau10" } })
    .createGuides({ legend: { position: "bottom", layout: "legacy-bottom" } })
    .createTitle({
      text: "Displacement distribution",
      subtitle: "by country",
      align: "center"
    })
    .removeXAxis()
    .removeYAxis()
    .removeGrid()
    .removeLegend({ target: "bars" })
    .removeTitle();
}

export function createMarkRemovalActions(rows) {
  return chart()
    .createCanvas({
      width: 456,
      height: 312,
      margin: { top: 58, right: 22, bottom: 54, left: 100 }
    })
    .createData({ values: rows })
    .filterData({
      id: "gapminder2005",
      field: "year",
      predicate: { op: "eq", value: 2005 }
    })
    .filterData({
      id: "selectedCountries",
      field: "country",
      oneOf: ["Chile", "Cuba", "Egypt", "Japan", "Kenya", "Peru"]
    })
    .createBarMark()
    .encodeX({
      field: "country",
      fieldType: "nominal",
      scale: {
        type: "band",
        paddingInner: 0.2,
        paddingOuter: 0.1,
        align: 0.5
      }
    })
    .encodeY({
      field: "pop",
      aggregate: "mean",
      scale: { nice: true, zero: true }
    })
    .encodeBarWidth({ band: 0.72 })
    .editBarMark({ fill: "#cbd5e1" })
    .createPointMark()
    .encodeRadius({ value: 5 })
    .editPointMark({ fill: "#2563eb", stroke: "white", strokeWidth: 1 })
    .createGuides({
      axes: {
        x: { scale: "x", title: { text: "Country" } },
        y: { scale: "y", title: { text: "Population" } }
      },
      grid: { horizontal: {}, vertical: false },
      legend: false
    })
    .createTitle({
      text: "Population by Country",
      subtitle: "Band slots with aligned point centers · 2005",
      offset: -7,
      gap: 7,
      titleStyle: { fontSize: 18, fontWeight: 700 },
      subtitleStyle: { fontSize: 12 }
    })
    .editYAxis({ labels: { format: ".2e" }, title: { offset: 88 } })
    .removeMark({ target: "point" });
}

export function createCartesianGuideFacadeActions(rows) {
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
    .createGuides({
      axes: {
        x: {
          position: "top",
          ticksAndLabels: { labels: { offset: 12, format: ".1f" } },
          title: { offset: 62 }
        },
        y: {
          position: "right",
          ticksAndLabels: { labels: { offset: 12, format: ".1f" } },
          title: { text: "Miles per Gallon", offset: 70 }
        }
      }
    })
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

export function createErrorBarEditActions(rows) {
  return chart()
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
    .createTitle({
      text: "Styled Acceleration Intervals",
      subtitle: "16px caps with custom rule appearance"
    })
    .editErrorBar({
      target: "errorBar",
      caps: true,
      capSize: 16,
      stroke: "#d9485f",
      strokeWidth: 3,
      strokeDash: [8, 4],
      opacity: 0.8
    });
}

export function createErrorBandEditActions(rows) {
  return chart()
    .createCanvas({
      width: 760,
      height: 480,
      margin: { top: 90, right: 150, bottom: 70, left: 80 }
    })
    .createData({ values: rows })
    .createErrorBand({
      x: { field: "year", fieldType: "temporal" },
      y: { field: "life_expect", center: "mean", extent: "ci" },
      groupBy: "cluster"
    })
    .encodeColor({ target: "errorBand", field: "cluster" })
    .createGuides()
    .createTitle({
      text: "Life Expectancy by Cluster",
      subtitle: "Mean and 95% confidence interval"
    })
    .editErrorBand({
      target: "errorBand",
      opacity: 0.34,
      curve: "cardinal"
    })
    .editErrorBandBoundary({
      target: "errorBand",
      boundary: "both",
      stroke: "#0369a1",
      strokeWidth: 2,
      strokeDash: [6, 3],
      opacity: 0.8,
      curve: "cardinal"
    })
    .editGraphics({ target: "errorBand", property: "fill", value: "#7dd3fc" });
}

export function createRegressionEditActions(rows) {
  return chart()
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
    .encodeSize({ field: "Acceleration" })
    .encodeShape({ field: "Origin" })
    .encodeOpacity({ value: 0.27 })
    .filterMarks({ field: "Origin", op: "oneOf", values: ["Japan", "USA"] })
    .createRegression()
    .createGuides()
    .editRegression({
      target: "points",
      method: "polynomial",
      degree: 2,
      band: { color: "#a78bfa", opacity: 0.16 },
      line: { strokeWidth: 4 }
    });
}

export function createBoxPlotEditActions(rows) {
  return chart()
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
    });
}
