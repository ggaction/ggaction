import { chart } from "../../../src/index.js";
import {
  createCarsLineChartPrimitiveProgram,
  createCarsLineChartPrimitives
} from "./primitive.program.js";
import {
  createCarsLineCurvePrimitiveValues,
  createCompositeLegendPrimitiveValues,
  createConstantDashPrimitiveValues,
  createDashReassignmentPrimitiveValues,
  createDispersionPrimitiveValues,
  createGroupReassignmentPrimitiveValues,
  createMedianPrimitiveValues,
  createNamedDashPrimitiveValues,
  createOrderedPrimitiveValues,
  createQuantilePrimitiveValues
} from "./phase2-reference-values.js";

export function createCompositeLegendTopPrimitives(cars) {
  return createCarsLineChartPrimitiveProgram(
    cars,
    createCompositeLegendPrimitiveValues(cars, { position: "top" }),
    { compositeLegend: true }
  );
}

export function createCompositeLegendBottomPrimitives(cars) {
  return createCarsLineChartPrimitiveProgram(
    cars,
    createCompositeLegendPrimitiveValues(cars, { position: "bottom" }),
    { compositeLegend: true }
  );
}

export function createCurveStepPrimitives(cars) {
  const values = createCarsLineCurvePrimitiveValues(cars);

  return createCarsLineChartPrimitives(cars)
    .editGraphics({
      target: "trends",
      property: "commands",
      value: values.stepCommands
    });
}

export function createCurveMonotoneEditPrimitives(cars) {
  const values = createCarsLineCurvePrimitiveValues(cars);

  return createCarsLineChartPrimitives(cars)
    .editGraphics({
      target: "trends",
      property: "commands",
      value: values.monotoneCommands
    })
    .editGraphics({
      target: "trends",
      property: "strokeWidth",
      value: 4
    });
}

export function createNamedDashVocabularyPrimitives(cars) {
  const values = createNamedDashPrimitiveValues(cars);
  const dashes = values.series.map(series => series.strokeDash);

  return chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 80, right: 170, bottom: 60, left: 80 },
      background: "white"
    })
    .createData({ id: "cars", values: values.validCars })
    .editSemantic({ property: "layer[trends].mark.type", value: "line" })
    .editSemantic({ property: "layer[trends].data", value: "cars" })
    .editSemantic({ property: "layer[trends].coordinate", value: "main" })
    .editSemantic({ property: "layer[trends].encoding.x.field", value: "Year" })
    .editSemantic({ property: "layer[trends].encoding.x.fieldType", value: "temporal" })
    .editSemantic({ property: "layer[trends].encoding.x.scale", value: "x" })
    .editSemantic({ property: "layer[trends].encoding.y.field", value: "Acceleration" })
    .editSemantic({ property: "layer[trends].encoding.y.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[trends].encoding.y.aggregate", value: "mean" })
    .editSemantic({ property: "layer[trends].encoding.y.scale", value: "y" })
    .editSemantic({ property: "layer[trends].encoding.strokeDash.field", value: "Cylinders" })
    .editSemantic({ property: "layer[trends].encoding.strokeDash.fieldType", value: "nominal" })
    .editSemantic({ property: "layer[trends].encoding.strokeDash.scale", value: "strokeDash" })
    .editSemantic({ property: "scale[x].type", value: "time" })
    .editSemantic({ property: "scale[x].domain", value: "auto" })
    .editSemantic({ property: "scale[x].range", value: "auto" })
    .editSemantic({ property: "scale[x].nice", value: true })
    .editSemantic({ property: "scale[y].type", value: "linear" })
    .editSemantic({ property: "scale[y].domain", value: "auto" })
    .editSemantic({ property: "scale[y].range", value: "auto" })
    .editSemantic({ property: "scale[y].nice", value: true })
    .editSemantic({ property: "scale[y].zero", value: false })
    .editSemantic({ property: "scale[strokeDash].type", value: "ordinal" })
    .editSemantic({ property: "scale[strokeDash].domain", value: "auto" })
    .editSemantic({
      property: "scale[strokeDash].range",
      value: ["solid", "dashed", "dotted", "dashdot"]
    })
    .editSemantic({ property: "coordinate[main].type", value: "cartesian" })
    .editSemantic({ property: "guide.legend.series.channels", value: ["strokeDash"] })
    .editSemantic({ property: "guide.legend.series.scales", value: ["strokeDash"] })
    .editSemantic({ property: "guide.legend.series.title", value: "Cylinders" })
    .createGraphics({ id: "trends", type: "path", length: values.series.length })
    .editGraphics({
      target: "trends",
      property: "commands",
      value: values.series.map(series => series.commands)
    })
    .editGraphics({ target: "trends", property: "stroke", value: "#4c78a8" })
    .editGraphics({ target: "trends", property: "strokeWidth", value: 2 })
    .editGraphics({ target: "trends", property: "strokeDash", value: dashes })
    .createGraphics({ id: "seriesLegendSymbols", type: "line", length: values.keys.length })
    .editGraphics({ target: "seriesLegendSymbols", property: "x1", value: values.legend.x1 })
    .editGraphics({ target: "seriesLegendSymbols", property: "y1", value: values.legend.itemY })
    .editGraphics({ target: "seriesLegendSymbols", property: "x2", value: values.legend.x2 })
    .editGraphics({ target: "seriesLegendSymbols", property: "y2", value: values.legend.itemY })
    .editGraphics({ target: "seriesLegendSymbols", property: "stroke", value: "#4c78a8" })
    .editGraphics({ target: "seriesLegendSymbols", property: "strokeWidth", value: 2 })
    .editGraphics({ target: "seriesLegendSymbols", property: "strokeDash", value: dashes })
    .createGraphics({ id: "seriesLegendLabels", type: "text", length: values.keys.length })
    .editGraphics({ target: "seriesLegendLabels", property: "x", value: values.legend.labelX })
    .editGraphics({ target: "seriesLegendLabels", property: "y", value: values.legend.itemY })
    .editGraphics({ target: "seriesLegendLabels", property: "text", value: values.keys.map(String) })
    .editGraphics({ target: "seriesLegendLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "seriesLegendLabels", property: "fontSize", value: 12 })
    .editGraphics({ target: "seriesLegendLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "seriesLegendLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "seriesLegendLabels", property: "textAlign", value: "left" })
    .editGraphics({ target: "seriesLegendLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "seriesLegendTitle", type: "text" })
    .editGraphics({ target: "seriesLegendTitle", property: "x", value: values.legend.titleX })
    .editGraphics({ target: "seriesLegendTitle", property: "y", value: values.legend.titleY })
    .editGraphics({ target: "seriesLegendTitle", property: "text", value: "Cylinders" })
    .editGraphics({ target: "seriesLegendTitle", property: "fill", value: "#334155" })
    .editGraphics({ target: "seriesLegendTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "seriesLegendTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "seriesLegendTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "seriesLegendTitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "seriesLegendTitle", property: "textBaseline", value: "middle" });
}

export function createConstantDashPrimitives(cars) {
  const values = createConstantDashPrimitiveValues(cars);

  return chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 80, right: 170, bottom: 60, left: 80 },
      background: "white"
    })
    .createData({ id: "cars", values: values.validCars })
    .editSemantic({ property: "layer[trends].mark.type", value: "line" })
    .editSemantic({ property: "layer[trends].data", value: "cars" })
    .editSemantic({ property: "layer[trends].coordinate", value: "main" })
    .editSemantic({ property: "layer[trends].encoding.x.field", value: "Year" })
    .editSemantic({ property: "layer[trends].encoding.x.fieldType", value: "temporal" })
    .editSemantic({ property: "layer[trends].encoding.x.scale", value: "x" })
    .editSemantic({ property: "layer[trends].encoding.y.field", value: "Acceleration" })
    .editSemantic({ property: "layer[trends].encoding.y.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[trends].encoding.y.aggregate", value: "mean" })
    .editSemantic({ property: "layer[trends].encoding.y.scale", value: "y" })
    .editSemantic({ property: "layer[trends].encoding.strokeDash.datum", value: "dotted" })
    .editSemantic({ property: "scale[x].type", value: "time" })
    .editSemantic({ property: "scale[x].domain", value: "auto" })
    .editSemantic({ property: "scale[x].range", value: "auto" })
    .editSemantic({ property: "scale[x].nice", value: true })
    .editSemantic({ property: "scale[y].type", value: "linear" })
    .editSemantic({ property: "scale[y].domain", value: "auto" })
    .editSemantic({ property: "scale[y].range", value: "auto" })
    .editSemantic({ property: "scale[y].nice", value: true })
    .editSemantic({ property: "scale[y].zero", value: false })
    .editSemantic({ property: "scale[originDash].type", value: "ordinal" })
    .editSemantic({ property: "scale[originDash].domain", value: "auto" })
    .editSemantic({ property: "scale[originDash].range", value: "auto" })
    .editSemantic({ property: "coordinate[main].type", value: "cartesian" })
    .createGraphics({ id: "trends", type: "path", length: 1 })
    .editGraphics({ target: "trends", property: "commands", value: [values.series[0].commands] })
    .editGraphics({ target: "trends", property: "stroke", value: "#4c78a8" })
    .editGraphics({ target: "trends", property: "strokeWidth", value: 2 })
    .editGraphics({ target: "trends", property: "strokeDash", value: [[1, 3]] });
}

export function createGroupReassignmentPrimitives(cars) {
  const values = createGroupReassignmentPrimitiveValues(cars);

  return chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 80, right: 170, bottom: 60, left: 80 },
      background: "white"
    })
    .createData({ id: "cars", values: values.validCars })
    .editSemantic({ property: "layer[trends].mark.type", value: "line" })
    .editSemantic({ property: "layer[trends].data", value: "cars" })
    .editSemantic({ property: "layer[trends].coordinate", value: "main" })
    .editSemantic({ property: "layer[trends].encoding.x.field", value: "Year" })
    .editSemantic({ property: "layer[trends].encoding.x.fieldType", value: "temporal" })
    .editSemantic({ property: "layer[trends].encoding.x.scale", value: "x" })
    .editSemantic({ property: "layer[trends].encoding.y.field", value: "Acceleration" })
    .editSemantic({ property: "layer[trends].encoding.y.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[trends].encoding.y.aggregate", value: "mean" })
    .editSemantic({ property: "layer[trends].encoding.y.scale", value: "y" })
    .editSemantic({ property: "layer[trends].encoding.group.field", value: "Cylinders" })
    .editSemantic({ property: "layer[trends].encoding.group.fieldType", value: "nominal" })
    .editSemantic({ property: "scale[x].type", value: "time" })
    .editSemantic({ property: "scale[x].domain", value: "auto" })
    .editSemantic({ property: "scale[x].range", value: "auto" })
    .editSemantic({ property: "scale[x].nice", value: true })
    .editSemantic({ property: "scale[y].type", value: "linear" })
    .editSemantic({ property: "scale[y].domain", value: "auto" })
    .editSemantic({ property: "scale[y].range", value: "auto" })
    .editSemantic({ property: "scale[y].nice", value: true })
    .editSemantic({ property: "scale[y].zero", value: false })
    .editSemantic({ property: "coordinate[main].type", value: "cartesian" })
    .createGraphics({ id: "trends", type: "path", length: values.series.length })
    .editGraphics({
      target: "trends",
      property: "commands",
      value: values.series.map(series => series.commands)
    })
    .editGraphics({ target: "trends", property: "stroke", value: "#4c78a8" })
    .editGraphics({ target: "trends", property: "strokeWidth", value: 2 })
    .editGraphics({
      target: "trends",
      property: "strokeDash",
      value: values.series.map(() => [])
    });
}

export function createDashReassignmentPrimitives(cars) {
  const values = createDashReassignmentPrimitiveValues(cars);
  const dashes = values.series.map(series => series.strokeDash);

  return chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 80, right: 170, bottom: 60, left: 80 },
      background: "white"
    })
    .createData({ id: "cars", values: values.validCars })
    .editSemantic({ property: "layer[trends].mark.type", value: "line" })
    .editSemantic({ property: "layer[trends].data", value: "cars" })
    .editSemantic({ property: "layer[trends].coordinate", value: "main" })
    .editSemantic({ property: "layer[trends].encoding.x.field", value: "Year" })
    .editSemantic({ property: "layer[trends].encoding.x.fieldType", value: "temporal" })
    .editSemantic({ property: "layer[trends].encoding.x.scale", value: "x" })
    .editSemantic({ property: "layer[trends].encoding.y.field", value: "Acceleration" })
    .editSemantic({ property: "layer[trends].encoding.y.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[trends].encoding.y.aggregate", value: "mean" })
    .editSemantic({ property: "layer[trends].encoding.y.scale", value: "y" })
    .editSemantic({ property: "layer[trends].encoding.strokeDash.field", value: "Cylinders" })
    .editSemantic({ property: "layer[trends].encoding.strokeDash.fieldType", value: "nominal" })
    .editSemantic({ property: "layer[trends].encoding.strokeDash.scale", value: "strokeDash" })
    .editSemantic({ property: "scale[x].type", value: "time" })
    .editSemantic({ property: "scale[x].domain", value: "auto" })
    .editSemantic({ property: "scale[x].range", value: "auto" })
    .editSemantic({ property: "scale[x].nice", value: true })
    .editSemantic({ property: "scale[y].type", value: "linear" })
    .editSemantic({ property: "scale[y].domain", value: "auto" })
    .editSemantic({ property: "scale[y].range", value: "auto" })
    .editSemantic({ property: "scale[y].nice", value: true })
    .editSemantic({ property: "scale[y].zero", value: false })
    .editSemantic({ property: "scale[originDash].type", value: "ordinal" })
    .editSemantic({ property: "scale[originDash].domain", value: "auto" })
    .editSemantic({ property: "scale[originDash].range", value: "auto" })
    .editSemantic({ property: "scale[strokeDash].type", value: "ordinal" })
    .editSemantic({ property: "scale[strokeDash].domain", value: "auto" })
    .editSemantic({ property: "scale[strokeDash].range", value: "auto" })
    .editSemantic({ property: "coordinate[main].type", value: "cartesian" })
    .editSemantic({ property: "guide.legend.series.channels", value: ["strokeDash"] })
    .editSemantic({ property: "guide.legend.series.scales", value: ["strokeDash"] })
    .editSemantic({ property: "guide.legend.series.title", value: "Cylinders" })
    .createGraphics({ id: "trends", type: "path", length: values.series.length })
    .editGraphics({
      target: "trends",
      property: "commands",
      value: values.series.map(series => series.commands)
    })
    .editGraphics({ target: "trends", property: "stroke", value: "#4c78a8" })
    .editGraphics({ target: "trends", property: "strokeWidth", value: 2 })
    .editGraphics({ target: "trends", property: "strokeDash", value: dashes })
    .createGraphics({ id: "seriesLegendSymbols", type: "line", length: values.keys.length })
    .editGraphics({ target: "seriesLegendSymbols", property: "x1", value: values.legend.x1 })
    .editGraphics({ target: "seriesLegendSymbols", property: "y1", value: values.legend.itemY })
    .editGraphics({ target: "seriesLegendSymbols", property: "x2", value: values.legend.x2 })
    .editGraphics({ target: "seriesLegendSymbols", property: "y2", value: values.legend.itemY })
    .editGraphics({ target: "seriesLegendSymbols", property: "stroke", value: "#4c78a8" })
    .editGraphics({ target: "seriesLegendSymbols", property: "strokeWidth", value: 2 })
    .editGraphics({ target: "seriesLegendSymbols", property: "strokeDash", value: dashes })
    .createGraphics({ id: "seriesLegendLabels", type: "text", length: values.keys.length })
    .editGraphics({ target: "seriesLegendLabels", property: "x", value: values.legend.labelX })
    .editGraphics({ target: "seriesLegendLabels", property: "y", value: values.legend.itemY })
    .editGraphics({ target: "seriesLegendLabels", property: "text", value: values.keys.map(String) })
    .editGraphics({ target: "seriesLegendLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "seriesLegendLabels", property: "fontSize", value: 12 })
    .editGraphics({ target: "seriesLegendLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "seriesLegendLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "seriesLegendLabels", property: "textAlign", value: "left" })
    .editGraphics({ target: "seriesLegendLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "seriesLegendTitle", type: "text" })
    .editGraphics({ target: "seriesLegendTitle", property: "x", value: values.legend.titleX })
    .editGraphics({ target: "seriesLegendTitle", property: "y", value: values.legend.titleY })
    .editGraphics({ target: "seriesLegendTitle", property: "text", value: "Cylinders" })
    .editGraphics({ target: "seriesLegendTitle", property: "fill", value: "#334155" })
    .editGraphics({ target: "seriesLegendTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "seriesLegendTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "seriesLegendTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "seriesLegendTitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "seriesLegendTitle", property: "textBaseline", value: "middle" });
}

export function createAggregateMedianPrimitives(cars) {
  return createCarsLineChartPrimitiveProgram(
    cars,
    createMedianPrimitiveValues(cars),
    { aggregate: "median" }
  );
}

export function createAggregateDispersionPrimitives(cars) {
  return createCarsLineChartPrimitiveProgram(
    cars,
    createDispersionPrimitiveValues(cars),
    { aggregate: "stdev" }
  );
}

export function createAggregateQuantilePrimitives(cars) {
  return createCarsLineChartPrimitiveProgram(
    cars,
    createQuantilePrimitiveValues(cars),
    { aggregate: { op: "quantile", probability: 0.75 } }
  );
}

export function createAggregateOrderedPrimitives(cars) {
  return createCarsLineChartPrimitiveProgram(
    cars,
    createOrderedPrimitiveValues(cars),
    {
      aggregate: {
        op: "first",
        orderBy: "Horsepower",
        order: "ascending"
      }
    }
  );
}
