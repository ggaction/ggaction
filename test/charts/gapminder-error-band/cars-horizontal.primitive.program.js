import { chart, render } from "../../../src/index.js";
import { linearPathCommands } from "../../support/path.js";

import {
  CARS_HORIZONTAL_FIELDS,
  CARS_HORIZONTAL_LAYOUT,
  createCarsHorizontalErrorBandReferenceValues
} from "./cars-horizontal.reference-values.js";

export function createCarsHorizontalErrorBandPrimitives(cars) {
  const { width, height, margin } = CARS_HORIZONTAL_LAYOUT;
  const values = createCarsHorizontalErrorBandReferenceValues(cars, {
    width,
    height,
    margin
  });
  const { x: xAxis, y: yAxis } = values.axes;
  const xTickPositions = xAxis.ticks.map(tick => tick.position);
  const yTickPositions = yAxis.ticks.map(tick => tick.position);

  return chart()
    .createCanvas({ width, height, margin, background: "white" })
    .createData({ values: cars })
    .editSemantic({
      property: "dataset[errorBandIntervalData].source",
      value: "data"
    })
    .editSemantic({
      property: "dataset[errorBandIntervalData].transform",
      value: [values.transform]
    })
    .editSemantic({
      property: "dataset[errorBandIntervalData].values",
      value: values.rows
    })
    .editSemantic({ property: "layer[errorBand].mark.type", value: "area" })
    .editSemantic({
      property: "layer[errorBand].data",
      value: "errorBandIntervalData"
    })
    .editSemantic({ property: "layer[errorBand].coordinate", value: "main" })
    .editSemantic({
      property: "layer[errorBand].encoding.y.field",
      value: "Year"
    })
    .editSemantic({
      property: "layer[errorBand].encoding.y.fieldType",
      value: "temporal"
    })
    .editSemantic({
      property: "layer[errorBand].encoding.y.scale",
      value: "y"
    })
    .editSemantic({
      property: "layer[errorBand].encoding.x.field",
      value: CARS_HORIZONTAL_FIELDS.lower
    })
    .editSemantic({
      property: "layer[errorBand].encoding.x.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[errorBand].encoding.x.scale",
      value: "x"
    })
    .editSemantic({
      property: "layer[errorBand].encoding.x2.field",
      value: CARS_HORIZONTAL_FIELDS.upper
    })
    .editSemantic({
      property: "layer[errorBand].encoding.x2.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[errorBand].encoding.x2.scale",
      value: "x"
    })
    .editSemantic({
      property: "layer[errorBandLowerBoundary].mark.type",
      value: "line"
    })
    .editSemantic({
      property: "layer[errorBandLowerBoundary].data",
      value: "errorBandIntervalData"
    })
    .editSemantic({
      property: "layer[errorBandLowerBoundary].coordinate",
      value: "main"
    })
    .editSemantic({
      property: "layer[errorBandLowerBoundary].encoding.y.field",
      value: "Year"
    })
    .editSemantic({
      property: "layer[errorBandLowerBoundary].encoding.y.fieldType",
      value: "temporal"
    })
    .editSemantic({
      property: "layer[errorBandLowerBoundary].encoding.y.scale",
      value: "y"
    })
    .editSemantic({
      property: "layer[errorBandLowerBoundary].encoding.x.field",
      value: CARS_HORIZONTAL_FIELDS.lower
    })
    .editSemantic({
      property: "layer[errorBandLowerBoundary].encoding.x.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[errorBandLowerBoundary].encoding.x.scale",
      value: "x"
    })
    .editSemantic({
      property: "layer[errorBandUpperBoundary].mark.type",
      value: "line"
    })
    .editSemantic({
      property: "layer[errorBandUpperBoundary].data",
      value: "errorBandIntervalData"
    })
    .editSemantic({
      property: "layer[errorBandUpperBoundary].coordinate",
      value: "main"
    })
    .editSemantic({
      property: "layer[errorBandUpperBoundary].encoding.y.field",
      value: "Year"
    })
    .editSemantic({
      property: "layer[errorBandUpperBoundary].encoding.y.fieldType",
      value: "temporal"
    })
    .editSemantic({
      property: "layer[errorBandUpperBoundary].encoding.y.scale",
      value: "y"
    })
    .editSemantic({
      property: "layer[errorBandUpperBoundary].encoding.x.field",
      value: CARS_HORIZONTAL_FIELDS.upper
    })
    .editSemantic({
      property: "layer[errorBandUpperBoundary].encoding.x.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[errorBandUpperBoundary].encoding.x.scale",
      value: "x"
    })
    .editSemantic({ property: "scale[y].type", value: "time" })
    .editSemantic({ property: "scale[y].domain", value: "auto" })
    .editSemantic({ property: "scale[y].range", value: "auto" })
    .editSemantic({ property: "scale[y].nice", value: true })
    .editSemantic({ property: "scale[x].type", value: "linear" })
    .editSemantic({ property: "scale[x].domain", value: "auto" })
    .editSemantic({ property: "scale[x].range", value: "auto" })
    .editSemantic({ property: "scale[x].nice", value: true })
    .editSemantic({ property: "scale[x].zero", value: false })
    .editSemantic({ property: "coordinate[main].type", value: "cartesian" })
    .editSemantic({ property: "guide.axis.x.scale", value: "x" })
    .editSemantic({ property: "guide.axis.x.coordinate", value: "main" })
    .editSemantic({
      property: "guide.axis.x.title",
      value: "mean(Acceleration)"
    })
    .editSemantic({ property: "guide.axis.y.scale", value: "y" })
    .editSemantic({ property: "guide.axis.y.coordinate", value: "main" })
    .editSemantic({ property: "guide.axis.y.title", value: "Year" })
    .editSemantic({ property: "guide.grid.vertical.scale", value: "x" })
    .editSemantic({
      property: "guide.grid.vertical.coordinate",
      value: "main"
    })
    .editSemantic({ property: "title.text", value: values.title.text })
    .editSemantic({ property: "title.subtitle", value: values.title.subtitle })
    .createGraphics({ id: "errorBand", type: "path", length: 1 })
    .editGraphics({
      target: "errorBand",
      property: "commands",
      value: [linearPathCommands(values.band.points, { close: true })]
    })
    .editGraphics({
      target: "errorBand",
      property: "fill",
      value: values.band.fill
    })
    .editGraphics({
      target: "errorBand",
      property: "opacity",
      value: values.band.opacity
    })
    .createGraphics({
      id: "errorBandLowerBoundary",
      type: "path",
      length: 1
    })
    .editGraphics({
      target: "errorBandLowerBoundary",
      property: "commands",
      value: [linearPathCommands(values.boundaries.lower.points)]
    })
    .editGraphics({
      target: "errorBandLowerBoundary",
      property: "stroke",
      value: values.boundaries.lower.stroke
    })
    .editGraphics({
      target: "errorBandLowerBoundary",
      property: "strokeWidth",
      value: values.boundaries.lower.strokeWidth
    })
    .editGraphics({
      target: "errorBandLowerBoundary",
      property: "strokeDash",
      value: [[]]
    })
    .editGraphics({
      target: "errorBandLowerBoundary",
      property: "opacity",
      value: 1
    })
    .createGraphics({
      id: "errorBandUpperBoundary",
      type: "path",
      length: 1
    })
    .editGraphics({
      target: "errorBandUpperBoundary",
      property: "commands",
      value: [linearPathCommands(values.boundaries.upper.points)]
    })
    .editGraphics({
      target: "errorBandUpperBoundary",
      property: "stroke",
      value: values.boundaries.upper.stroke
    })
    .editGraphics({
      target: "errorBandUpperBoundary",
      property: "strokeWidth",
      value: values.boundaries.upper.strokeWidth
    })
    .editGraphics({
      target: "errorBandUpperBoundary",
      property: "strokeDash",
      value: [[]]
    })
    .editGraphics({
      target: "errorBandUpperBoundary",
      property: "opacity",
      value: 1
    })
    .createGraphics({
      id: "verticalGridLines",
      type: "line",
      length: values.grid.vertical.length,
      before: "errorBand"
    })
    .editGraphics({
      target: "verticalGridLines",
      property: "x1",
      value: values.grid.vertical.map(line => line.x1)
    })
    .editGraphics({
      target: "verticalGridLines",
      property: "y1",
      value: values.grid.vertical.map(line => line.y1)
    })
    .editGraphics({
      target: "verticalGridLines",
      property: "x2",
      value: values.grid.vertical.map(line => line.x2)
    })
    .editGraphics({
      target: "verticalGridLines",
      property: "y2",
      value: values.grid.vertical.map(line => line.y2)
    })
    .editGraphics({ target: "verticalGridLines", property: "stroke", value: "#e2e8f0" })
    .editGraphics({ target: "verticalGridLines", property: "strokeWidth", value: 1 })
    .editGraphics({
      target: "verticalGridLines",
      property: "strokeDash",
      value: values.grid.vertical.map(() => [])
    })
    .createGraphics({ id: "xAxisLine", type: "line" })
    .editGraphics({ target: "xAxisLine", property: "x1", value: xAxis.line.x1 })
    .editGraphics({ target: "xAxisLine", property: "y1", value: xAxis.line.y1 })
    .editGraphics({ target: "xAxisLine", property: "x2", value: xAxis.line.x2 })
    .editGraphics({ target: "xAxisLine", property: "y2", value: xAxis.line.y2 })
    .editGraphics({ target: "xAxisLine", property: "stroke", value: "#334155" })
    .editGraphics({ target: "xAxisLine", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "xAxisTicks", type: "line", length: xAxis.ticks.length })
    .editGraphics({ target: "xAxisTicks", property: "x1", value: xTickPositions })
    .editGraphics({ target: "xAxisTicks", property: "y1", value: xAxis.line.y1 })
    .editGraphics({ target: "xAxisTicks", property: "x2", value: xTickPositions })
    .editGraphics({ target: "xAxisTicks", property: "y2", value: xAxis.line.y1 + 6 })
    .editGraphics({ target: "xAxisTicks", property: "stroke", value: "#64748b" })
    .editGraphics({ target: "xAxisTicks", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "xAxisLabels", type: "text", length: xAxis.ticks.length })
    .editGraphics({ target: "xAxisLabels", property: "x", value: xTickPositions })
    .editGraphics({ target: "xAxisLabels", property: "y", value: xAxis.line.y1 + 18 })
    .editGraphics({
      target: "xAxisLabels",
      property: "text",
      value: xAxis.ticks.map(tick => tick.label)
    })
    .editGraphics({ target: "xAxisLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "xAxisLabels", property: "fontSize", value: 12 })
    .editGraphics({ target: "xAxisLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "xAxisLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "xAxisLabels", property: "textAlign", value: "center" })
    .editGraphics({ target: "xAxisLabels", property: "textBaseline", value: "top" })
    .createGraphics({ id: "xAxisTitle", type: "text" })
    .editGraphics({ target: "xAxisTitle", property: "x", value: xAxis.title.x })
    .editGraphics({ target: "xAxisTitle", property: "y", value: xAxis.title.y })
    .editGraphics({ target: "xAxisTitle", property: "text", value: xAxis.title.text })
    .editGraphics({ target: "xAxisTitle", property: "fill", value: "#334155" })
    .editGraphics({ target: "xAxisTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "xAxisTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "xAxisTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "xAxisTitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "xAxisTitle", property: "textBaseline", value: "middle" })
    .editGraphics({ target: "xAxisTitle", property: "rotation", value: 0 })
    .createGraphics({ id: "yAxisLine", type: "line" })
    .editGraphics({ target: "yAxisLine", property: "x1", value: yAxis.line.x1 })
    .editGraphics({ target: "yAxisLine", property: "y1", value: yAxis.line.y1 })
    .editGraphics({ target: "yAxisLine", property: "x2", value: yAxis.line.x2 })
    .editGraphics({ target: "yAxisLine", property: "y2", value: yAxis.line.y2 })
    .editGraphics({ target: "yAxisLine", property: "stroke", value: "#334155" })
    .editGraphics({ target: "yAxisLine", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "yAxisTicks", type: "line", length: yAxis.ticks.length })
    .editGraphics({ target: "yAxisTicks", property: "x1", value: yAxis.line.x1 - 6 })
    .editGraphics({ target: "yAxisTicks", property: "y1", value: yTickPositions })
    .editGraphics({ target: "yAxisTicks", property: "x2", value: yAxis.line.x1 })
    .editGraphics({ target: "yAxisTicks", property: "y2", value: yTickPositions })
    .editGraphics({ target: "yAxisTicks", property: "stroke", value: "#64748b" })
    .editGraphics({ target: "yAxisTicks", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "yAxisLabels", type: "text", length: yAxis.ticks.length })
    .editGraphics({ target: "yAxisLabels", property: "x", value: yAxis.line.x1 - 12 })
    .editGraphics({ target: "yAxisLabels", property: "y", value: yTickPositions })
    .editGraphics({
      target: "yAxisLabels",
      property: "text",
      value: yAxis.ticks.map(tick => tick.label)
    })
    .editGraphics({ target: "yAxisLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "yAxisLabels", property: "fontSize", value: 12 })
    .editGraphics({ target: "yAxisLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "yAxisLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "yAxisLabels", property: "textAlign", value: "right" })
    .editGraphics({ target: "yAxisLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "yAxisTitle", type: "text" })
    .editGraphics({ target: "yAxisTitle", property: "x", value: yAxis.title.x })
    .editGraphics({ target: "yAxisTitle", property: "y", value: yAxis.title.y })
    .editGraphics({ target: "yAxisTitle", property: "text", value: yAxis.title.text })
    .editGraphics({ target: "yAxisTitle", property: "fill", value: "#334155" })
    .editGraphics({ target: "yAxisTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "yAxisTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "yAxisTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "yAxisTitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "yAxisTitle", property: "textBaseline", value: "middle" })
    .editGraphics({ target: "yAxisTitle", property: "rotation", value: yAxis.title.rotation })
    .createGraphics({ id: "chartTitle", type: "text" })
    .editGraphics({ target: "chartTitle", property: "x", value: values.title.x })
    .editGraphics({ target: "chartTitle", property: "y", value: values.title.titleY })
    .editGraphics({ target: "chartTitle", property: "text", value: values.title.text })
    .editGraphics({ target: "chartTitle", property: "fill", value: "#0f172a" })
    .editGraphics({ target: "chartTitle", property: "fontSize", value: 22 })
    .editGraphics({ target: "chartTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "chartTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "chartTitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "chartTitle", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "chartSubtitle", type: "text" })
    .editGraphics({ target: "chartSubtitle", property: "x", value: values.title.x })
    .editGraphics({ target: "chartSubtitle", property: "y", value: values.title.subtitleY })
    .editGraphics({ target: "chartSubtitle", property: "text", value: values.title.subtitle })
    .editGraphics({ target: "chartSubtitle", property: "fill", value: "#64748b" })
    .editGraphics({ target: "chartSubtitle", property: "fontSize", value: 14 })
    .editGraphics({ target: "chartSubtitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "chartSubtitle", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "chartSubtitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "chartSubtitle", property: "textBaseline", value: "middle" });
}

export function renderCarsHorizontalErrorBandPrimitives(program, context) {
  render(program, context);
}
