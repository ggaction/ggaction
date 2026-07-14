import { chart, render } from "../../../src/index.js";

import { createCarsLineChartValues } from "./reference-values.js";
import { linearPathCommands } from "../../support/path.js";

export function createCarsLineChartPrimitiveProgram(
  cars,
  values,
  { aggregate = "mean" } = {}
) {
  const width = 720;
  const height = 460;
  const margin = { top: 80, right: 170, bottom: 60, left: 80 };
  const { x: xAxis, y: yAxis } = values.axes;
  const xTickPositions = xAxis.ticks.map(tick => tick.position);
  const yTickPositions = yAxis.ticks.map(tick => tick.position);
  const legendY = values.legend.items.map(item => item.y);

  return chart()
    .createCanvas({ width, height, margin, background: "white" })
    .createData({ id: "cars", values: values.validCars })
    .editSemantic({ property: "layer[trends].mark.type", value: "line" })
    .editSemantic({ property: "layer[trends].data", value: "cars" })
    .editSemantic({ property: "layer[trends].coordinate", value: "main" })
    .editSemantic({ property: "layer[trends].encoding.x.field", value: "Year" })
    .editSemantic({
      property: "layer[trends].encoding.x.fieldType",
      value: "temporal"
    })
    .editSemantic({ property: "layer[trends].encoding.x.scale", value: "x" })
    .editSemantic({
      property: "layer[trends].encoding.y.field",
      value: "Acceleration"
    })
    .editSemantic({
      property: "layer[trends].encoding.y.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[trends].encoding.y.aggregate",
      value: aggregate
    })
    .editSemantic({ property: "layer[trends].encoding.y.scale", value: "y" })
    .editSemantic({
      property: "layer[trends].encoding.color.field",
      value: "Origin"
    })
    .editSemantic({
      property: "layer[trends].encoding.color.fieldType",
      value: "nominal"
    })
    .editSemantic({
      property: "layer[trends].encoding.color.scale",
      value: "color"
    })
    .editSemantic({
      property: "layer[trends].encoding.strokeDash.field",
      value: "Origin"
    })
    .editSemantic({
      property: "layer[trends].encoding.strokeDash.fieldType",
      value: "nominal"
    })
    .editSemantic({
      property: "layer[trends].encoding.strokeDash.scale",
      value: "strokeDash"
    })
    .editSemantic({ property: "scale[x].type", value: "time" })
    .editSemantic({ property: "scale[x].domain", value: "auto" })
    .editSemantic({ property: "scale[x].range", value: "auto" })
    .editSemantic({ property: "scale[x].nice", value: true })
    .editSemantic({ property: "scale[y].type", value: "linear" })
    .editSemantic({ property: "scale[y].domain", value: "auto" })
    .editSemantic({ property: "scale[y].range", value: "auto" })
    .editSemantic({ property: "scale[y].nice", value: true })
    .editSemantic({ property: "scale[y].zero", value: false })
    .editSemantic({ property: "scale[color].type", value: "ordinal" })
    .editSemantic({ property: "scale[color].domain", value: "auto" })
    .editSemantic({
      property: "scale[color].range",
      value: { palette: "tableau10" }
    })
    .editSemantic({ property: "scale[strokeDash].type", value: "ordinal" })
    .editSemantic({ property: "scale[strokeDash].domain", value: "auto" })
    .editSemantic({ property: "scale[strokeDash].range", value: "auto" })
    .editSemantic({ property: "coordinate[main].type", value: "cartesian" })
    .editSemantic({ property: "guide.axis.x.scale", value: "x" })
    .editSemantic({ property: "guide.axis.x.coordinate", value: "main" })
    .editSemantic({ property: "guide.axis.x.title", value: "Year" })
    .editSemantic({ property: "guide.axis.y.scale", value: "y" })
    .editSemantic({ property: "guide.axis.y.coordinate", value: "main" })
    .editSemantic({
      property: "guide.axis.y.title",
      value: yAxis.title.text
    })
    .editSemantic({ property: "guide.grid.horizontal.scale", value: "y" })
    .editSemantic({
      property: "guide.grid.horizontal.coordinate",
      value: "main"
    })
    .editSemantic({
      property: "guide.legend.series.channels",
      value: ["color", "strokeDash"]
    })
    .editSemantic({
      property: "guide.legend.series.scales",
      value: ["color", "strokeDash"]
    })
    .editSemantic({ property: "guide.legend.series.title", value: "Origin" })
    .editSemantic({ property: "title.text", value: values.title.text })
    .editSemantic({ property: "title.subtitle", value: values.title.subtitle })
    .createGraphics({ id: "trends", type: "path", length: values.series.length })
    .editGraphics({
      target: "trends",
      property: "commands",
      value: values.series.map(series => linearPathCommands(series.points))
    })
    .editGraphics({
      target: "trends",
      property: "stroke",
      value: values.series.map(series => series.color)
    })
    .editGraphics({ target: "trends", property: "strokeWidth", value: 2 })
    .editGraphics({
      target: "trends",
      property: "strokeDash",
      value: values.series.map(series => series.strokeDash)
    })
    .createGraphics({
      id: "horizontalGridLines",
      type: "line",
      length: yAxis.ticks.length,
      before: "trends"
    })
    .editGraphics({ target: "horizontalGridLines", property: "x1", value: xAxis.line.x1 })
    .editGraphics({ target: "horizontalGridLines", property: "y1", value: yTickPositions })
    .editGraphics({ target: "horizontalGridLines", property: "x2", value: xAxis.line.x2 })
    .editGraphics({ target: "horizontalGridLines", property: "y2", value: yTickPositions })
    .editGraphics({ target: "horizontalGridLines", property: "stroke", value: "#e2e8f0" })
    .editGraphics({ target: "horizontalGridLines", property: "strokeWidth", value: 1 })
    .editGraphics({
      target: "horizontalGridLines",
      property: "strokeDash",
      value: yAxis.ticks.map(() => [])
    })
    .createGraphics({ id: "xAxisLine", type: "line" })
    .editGraphics({ target: "xAxisLine", property: "x1", value: xAxis.line.x1 })
    .editGraphics({ target: "xAxisLine", property: "y1", value: xAxis.line.y1 })
    .editGraphics({ target: "xAxisLine", property: "x2", value: xAxis.line.x2 })
    .editGraphics({ target: "xAxisLine", property: "y2", value: xAxis.line.y2 })
    .editGraphics({ target: "xAxisLine", property: "stroke", value: "#334155" })
    .editGraphics({ target: "xAxisLine", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "yAxisLine", type: "line" })
    .editGraphics({ target: "yAxisLine", property: "x1", value: yAxis.line.x1 })
    .editGraphics({ target: "yAxisLine", property: "y1", value: yAxis.line.y1 })
    .editGraphics({ target: "yAxisLine", property: "x2", value: yAxis.line.x2 })
    .editGraphics({ target: "yAxisLine", property: "y2", value: yAxis.line.y2 })
    .editGraphics({ target: "yAxisLine", property: "stroke", value: "#334155" })
    .editGraphics({ target: "yAxisLine", property: "strokeWidth", value: 1 })
    .createGraphics({
      id: "xAxisTicks",
      type: "line",
      length: xAxis.ticks.length,
      before: "yAxisLine"
    })
    .editGraphics({ target: "xAxisTicks", property: "x1", value: xTickPositions })
    .editGraphics({ target: "xAxisTicks", property: "y1", value: xAxis.line.y1 })
    .editGraphics({ target: "xAxisTicks", property: "x2", value: xTickPositions })
    .editGraphics({ target: "xAxisTicks", property: "y2", value: xAxis.line.y1 + 6 })
    .editGraphics({ target: "xAxisTicks", property: "stroke", value: "#64748b" })
    .editGraphics({ target: "xAxisTicks", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "yAxisTicks", type: "line", length: yAxis.ticks.length })
    .editGraphics({ target: "yAxisTicks", property: "x1", value: yAxis.line.x1 - 6 })
    .editGraphics({ target: "yAxisTicks", property: "y1", value: yTickPositions })
    .editGraphics({ target: "yAxisTicks", property: "x2", value: yAxis.line.x1 })
    .editGraphics({ target: "yAxisTicks", property: "y2", value: yTickPositions })
    .editGraphics({ target: "yAxisTicks", property: "stroke", value: "#64748b" })
    .editGraphics({ target: "yAxisTicks", property: "strokeWidth", value: 1 })
    .createGraphics({
      id: "xAxisLabels",
      type: "text",
      length: xAxis.ticks.length,
      before: "yAxisLine"
    })
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
    .createGraphics({ id: "xAxisTitle", type: "text", before: "yAxisLine" })
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
    .createGraphics({
      id: "seriesLegendSymbols",
      type: "line",
      length: values.legend.items.length
    })
    .editGraphics({
      target: "seriesLegendSymbols",
      property: "x1",
      value: values.legend.items.map(item => item.x1)
    })
    .editGraphics({ target: "seriesLegendSymbols", property: "y1", value: legendY })
    .editGraphics({
      target: "seriesLegendSymbols",
      property: "x2",
      value: values.legend.items.map(item => item.x2)
    })
    .editGraphics({ target: "seriesLegendSymbols", property: "y2", value: legendY })
    .editGraphics({
      target: "seriesLegendSymbols",
      property: "stroke",
      value: values.legend.items.map(item => item.color)
    })
    .editGraphics({ target: "seriesLegendSymbols", property: "strokeWidth", value: 2 })
    .editGraphics({
      target: "seriesLegendSymbols",
      property: "strokeDash",
      value: values.legend.items.map(item => item.strokeDash)
    })
    .createGraphics({
      id: "seriesLegendLabels",
      type: "text",
      length: values.legend.items.length
    })
    .editGraphics({
      target: "seriesLegendLabels",
      property: "x",
      value: values.legend.items.map(item => item.labelX)
    })
    .editGraphics({ target: "seriesLegendLabels", property: "y", value: legendY })
    .editGraphics({
      target: "seriesLegendLabels",
      property: "text",
      value: values.legend.items.map(item => item.origin)
    })
    .editGraphics({ target: "seriesLegendLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "seriesLegendLabels", property: "fontSize", value: 12 })
    .editGraphics({ target: "seriesLegendLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "seriesLegendLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "seriesLegendLabels", property: "textAlign", value: "left" })
    .editGraphics({ target: "seriesLegendLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "seriesLegendTitle", type: "text" })
    .editGraphics({ target: "seriesLegendTitle", property: "x", value: values.legend.title.x })
    .editGraphics({ target: "seriesLegendTitle", property: "y", value: values.legend.title.y })
    .editGraphics({ target: "seriesLegendTitle", property: "text", value: values.legend.title.text })
    .editGraphics({ target: "seriesLegendTitle", property: "fill", value: "#334155" })
    .editGraphics({ target: "seriesLegendTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "seriesLegendTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "seriesLegendTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "seriesLegendTitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "seriesLegendTitle", property: "textBaseline", value: "middle" })
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

export function createCarsLineChartPrimitives(cars) {
  const values = createCarsLineChartValues(cars, {
    width: 720,
    height: 460,
    margin: { top: 80, right: 170, bottom: 60, left: 80 }
  });
  return createCarsLineChartPrimitiveProgram(cars, values);
}

export function renderCarsLineChartPrimitives(program, canvasContext) {
  render(program, canvasContext);
}
