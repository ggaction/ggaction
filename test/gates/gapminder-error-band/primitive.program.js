import { chart, render } from "../../../src/index.js";
import { linearPathCommands } from "../../support/path.js";

import {
  ERROR_BAND_FIELDS,
  ERROR_BAND_LAYOUT,
  createGapminderErrorBandReferenceValues
} from "./reference-values.js";

export function createGapminderErrorBandPrimitives(gapminder) {
  const { width, height, margin } = ERROR_BAND_LAYOUT;
  const values = createGapminderErrorBandReferenceValues(gapminder, {
    width,
    height,
    margin
  });
  const { x: xAxis, y: yAxis } = values.axes;
  const xTickPositions = xAxis.ticks.map(tick => tick.position);
  const yTickPositions = yAxis.ticks.map(tick => tick.position);

  return chart()
    .createCanvas({ width, height, margin, background: "white" })
    .createData({ id: "gapminder", values: gapminder })
    .editSemantic({
      property: "dataset[errorBandIntervalData].source",
      value: "gapminder"
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
      property: "layer[errorBand].encoding.x.field",
      value: "year"
    })
    .editSemantic({
      property: "layer[errorBand].encoding.x.fieldType",
      value: "temporal"
    })
    .editSemantic({
      property: "layer[errorBand].encoding.x.scale",
      value: "x"
    })
    .editSemantic({
      property: "layer[errorBand].encoding.y.field",
      value: ERROR_BAND_FIELDS.lower
    })
    .editSemantic({
      property: "layer[errorBand].encoding.y.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[errorBand].encoding.y.scale",
      value: "y"
    })
    .editSemantic({
      property: "layer[errorBand].encoding.y2.field",
      value: ERROR_BAND_FIELDS.upper
    })
    .editSemantic({
      property: "layer[errorBand].encoding.y2.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[errorBand].encoding.y2.scale",
      value: "y"
    })
    .editSemantic({
      property: "layer[errorBand].encoding.group.field",
      value: "cluster"
    })
    .editSemantic({
      property: "layer[errorBand].encoding.group.fieldType",
      value: "nominal"
    })
    .editSemantic({
      property: "layer[errorBand].encoding.color.field",
      value: "cluster"
    })
    .editSemantic({
      property: "layer[errorBand].encoding.color.fieldType",
      value: "nominal"
    })
    .editSemantic({
      property: "layer[errorBand].encoding.color.scale",
      value: "color"
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
    .editSemantic({ property: "coordinate[main].type", value: "cartesian" })
    .editSemantic({ property: "guide.axis.x.scale", value: "x" })
    .editSemantic({ property: "guide.axis.x.coordinate", value: "main" })
    .editSemantic({ property: "guide.axis.x.title", value: "year" })
    .editSemantic({ property: "guide.axis.y.scale", value: "y" })
    .editSemantic({ property: "guide.axis.y.coordinate", value: "main" })
    .editSemantic({
      property: "guide.axis.y.title",
      value: "mean(life_expect)"
    })
    .editSemantic({ property: "guide.grid.horizontal.scale", value: "y" })
    .editSemantic({
      property: "guide.grid.horizontal.coordinate",
      value: "main"
    })
    .editSemantic({ property: "guide.legend.color.scale", value: "color" })
    .editSemantic({ property: "guide.legend.color.title", value: "cluster" })
    .editSemantic({ property: "title.text", value: values.title.text })
    .editSemantic({
      property: "title.subtitle",
      value: values.title.subtitle
    })
    .createGraphics({
      id: "errorBand",
      type: "path",
      length: values.series.length
    })
    .editGraphics({
      target: "errorBand",
      property: "commands",
      value: values.series.map(series =>
        linearPathCommands(series.points, { close: true })
      )
    })
    .editGraphics({
      target: "errorBand",
      property: "fill",
      value: values.series.map(series => series.color)
    })
    .editGraphics({
      target: "errorBand",
      property: "opacity",
      value: values.series.map(series => series.opacity)
    })
    .createGraphics({
      id: "horizontalGridLines",
      type: "line",
      length: values.grid.horizontal.length,
      before: "errorBand"
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "x1",
      value: values.grid.horizontal.map(line => line.x1)
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "y1",
      value: values.grid.horizontal.map(line => line.y1)
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "x2",
      value: values.grid.horizontal.map(line => line.x2)
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "y2",
      value: values.grid.horizontal.map(line => line.y2)
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "stroke",
      value: "#e2e8f0"
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "strokeWidth",
      value: 1
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "strokeDash",
      value: values.grid.horizontal.map(() => [])
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
      length: xAxis.ticks.length
    })
    .editGraphics({ target: "xAxisTicks", property: "x1", value: xTickPositions })
    .editGraphics({ target: "xAxisTicks", property: "y1", value: xAxis.line.y1 })
    .editGraphics({ target: "xAxisTicks", property: "x2", value: xTickPositions })
    .editGraphics({ target: "xAxisTicks", property: "y2", value: xAxis.line.y1 + 6 })
    .editGraphics({ target: "xAxisTicks", property: "stroke", value: "#64748b" })
    .editGraphics({ target: "xAxisTicks", property: "strokeWidth", value: 1 })
    .createGraphics({
      id: "yAxisTicks",
      type: "line",
      length: yAxis.ticks.length
    })
    .editGraphics({ target: "yAxisTicks", property: "x1", value: yAxis.line.x1 - 6 })
    .editGraphics({ target: "yAxisTicks", property: "y1", value: yTickPositions })
    .editGraphics({ target: "yAxisTicks", property: "x2", value: yAxis.line.x1 })
    .editGraphics({ target: "yAxisTicks", property: "y2", value: yTickPositions })
    .editGraphics({ target: "yAxisTicks", property: "stroke", value: "#64748b" })
    .editGraphics({ target: "yAxisTicks", property: "strokeWidth", value: 1 })
    .createGraphics({
      id: "xAxisLabels",
      type: "text",
      length: xAxis.ticks.length
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
    .createGraphics({
      id: "yAxisLabels",
      type: "text",
      length: yAxis.ticks.length
    })
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
      id: "colorLegendSymbols",
      type: "rect",
      length: values.legend.items.length
    })
    .editGraphics({
      target: "colorLegendSymbols",
      property: "x",
      value: values.legend.items.map(item => item.x)
    })
    .editGraphics({
      target: "colorLegendSymbols",
      property: "y",
      value: values.legend.items.map(item => item.y)
    })
    .editGraphics({
      target: "colorLegendSymbols",
      property: "width",
      value: values.legend.items.map(item => item.width)
    })
    .editGraphics({
      target: "colorLegendSymbols",
      property: "height",
      value: values.legend.items.map(item => item.height)
    })
    .editGraphics({
      target: "colorLegendSymbols",
      property: "fill",
      value: values.legend.items.map(item => item.color)
    })
    .editGraphics({ target: "colorLegendSymbols", property: "stroke", value: "white" })
    .editGraphics({ target: "colorLegendSymbols", property: "strokeWidth", value: 0.5 })
    .createGraphics({
      id: "colorLegendLabels",
      type: "text",
      length: values.legend.items.length
    })
    .editGraphics({
      target: "colorLegendLabels",
      property: "x",
      value: values.legend.items.map(item => item.labelX)
    })
    .editGraphics({
      target: "colorLegendLabels",
      property: "y",
      value: values.legend.items.map(item => item.labelY)
    })
    .editGraphics({
      target: "colorLegendLabels",
      property: "text",
      value: values.legend.items.map(item => String(item.cluster))
    })
    .editGraphics({ target: "colorLegendLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "colorLegendLabels", property: "fontSize", value: 12 })
    .editGraphics({ target: "colorLegendLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "colorLegendLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "colorLegendLabels", property: "textAlign", value: "left" })
    .editGraphics({ target: "colorLegendLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "colorLegendTitle", type: "text" })
    .editGraphics({ target: "colorLegendTitle", property: "x", value: values.legend.title.x })
    .editGraphics({ target: "colorLegendTitle", property: "y", value: values.legend.title.y })
    .editGraphics({ target: "colorLegendTitle", property: "text", value: values.legend.title.text })
    .editGraphics({ target: "colorLegendTitle", property: "fill", value: "#334155" })
    .editGraphics({ target: "colorLegendTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "colorLegendTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "colorLegendTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "colorLegendTitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "colorLegendTitle", property: "textBaseline", value: "middle" })
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

export function renderGapminderErrorBandPrimitives(program, context) {
  render(program, context);
}
