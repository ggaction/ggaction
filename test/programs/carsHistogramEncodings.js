import { chart, render } from "../../src/index.js";

import { createCarsHistogramValues } from "./carsHistogramValues.js";

export function createCarsHistogramEncodings(cars) {
  const width = 432;
  const height = 460;
  const margin = { top: 80, right: 60, bottom: 130, left: 80 };
  const values = createCarsHistogramValues(cars, {
    width,
    height,
    margin,
    maxBins: 10
  });
  const { x: xAxis, y: yAxis } = values.axes;
  const xTickPositions = xAxis.ticks.map(tick => tick.position);
  const yTickPositions = yAxis.ticks.map(tick => tick.position);
  const horizontalGrid = values.grid.horizontal;
  const legendItems = values.legend.items;

  return chart()
    .createCanvas({ width, height, margin, background: "white" })
    .createData({ id: "cars", values: values.validCars })
    .createBarMark({ id: "bars" })
    .encodeX({
      field: "Displacement",
      bin: { maxBins: 10 },
      scale: { nice: true, zero: false }
    })
    .createGraphics({
      id: "horizontalGridLines",
      type: "line",
      length: horizontalGrid.length
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "x1",
      value: horizontalGrid.map(line => line.x1)
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "y1",
      value: horizontalGrid.map(line => line.y1)
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "x2",
      value: horizontalGrid.map(line => line.x2)
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "y2",
      value: horizontalGrid.map(line => line.y2)
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
      value: horizontalGrid.map(() => [])
    })
    .editSemantic({
      property: "layer[bars].encoding.y.field",
      value: "Displacement"
    })
    .editSemantic({
      property: "layer[bars].encoding.y.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[bars].encoding.y.aggregate",
      value: "count"
    })
    .editSemantic({
      property: "layer[bars].encoding.y.stack",
      value: "zero"
    })
    .editSemantic({ property: "layer[bars].encoding.y.scale", value: "y" })
    .editSemantic({
      property: "layer[bars].encoding.color.field",
      value: "Origin"
    })
    .editSemantic({
      property: "layer[bars].encoding.color.fieldType",
      value: "nominal"
    })
    .editSemantic({
      property: "layer[bars].encoding.color.scale",
      value: "color"
    })
    .editSemantic({ property: "scale[y].type", value: "linear" })
    .editSemantic({ property: "scale[y].domain", value: "auto" })
    .editSemantic({ property: "scale[y].range", value: "auto" })
    .editSemantic({ property: "scale[y].zero", value: true })
    .editSemantic({ property: "scale[color].type", value: "ordinal" })
    .editSemantic({ property: "scale[color].domain", value: "auto" })
    .editSemantic({
      property: "scale[color].range",
      value: { palette: "tableau10" }
    })
    .editSemantic({ property: "guide.axis.x.scale", value: "x" })
    .editSemantic({ property: "guide.axis.x.coordinate", value: "main" })
    .editSemantic({ property: "guide.axis.x.title", value: "Displacement" })
    .editSemantic({ property: "guide.axis.y.scale", value: "y" })
    .editSemantic({ property: "guide.axis.y.coordinate", value: "main" })
    .editSemantic({
      property: "guide.axis.y.title",
      value: "count(Displacement)"
    })
    .editSemantic({ property: "guide.grid.horizontal.scale", value: "y" })
    .editSemantic({
      property: "guide.grid.horizontal.coordinate",
      value: "main"
    })
    .editSemantic({ property: "guide.legend.color.scale", value: "color" })
    .editSemantic({ property: "guide.legend.color.title", value: "Origin" })
    .editGraphics({ target: "bars", property: "length", value: values.rects.length })
    .editGraphics({
      target: "bars",
      property: "x",
      value: values.rects.map(rect => rect.x)
    })
    .editGraphics({
      target: "bars",
      property: "y",
      value: values.rects.map(rect => rect.y)
    })
    .editGraphics({
      target: "bars",
      property: "width",
      value: values.rects.map(rect => rect.width)
    })
    .editGraphics({
      target: "bars",
      property: "height",
      value: values.rects.map(rect => rect.height)
    })
    .editGraphics({
      target: "bars",
      property: "fill",
      value: values.rects.map(rect => rect.fill)
    })
    .editGraphics({ target: "bars", property: "stroke", value: "white" })
    .editGraphics({ target: "bars", property: "strokeWidth", value: 0.5 })
    .createGraphics({ id: "xAxisLine", type: "line" })
    .editGraphics({ target: "xAxisLine", property: "x1", value: xAxis.line.x1 })
    .editGraphics({ target: "xAxisLine", property: "y1", value: xAxis.line.y1 })
    .editGraphics({ target: "xAxisLine", property: "x2", value: xAxis.line.x2 })
    .editGraphics({ target: "xAxisLine", property: "y2", value: xAxis.line.y2 })
    .editGraphics({ target: "xAxisLine", property: "stroke", value: "#334155" })
    .editGraphics({ target: "xAxisLine", property: "strokeWidth", value: 1 })
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
      length: legendItems.length
    })
    .editGraphics({
      target: "colorLegendSymbols",
      property: "x",
      value: legendItems.map(item => item.x)
    })
    .editGraphics({
      target: "colorLegendSymbols",
      property: "y",
      value: legendItems.map(item => item.y)
    })
    .editGraphics({
      target: "colorLegendSymbols",
      property: "width",
      value: legendItems.map(item => item.width)
    })
    .editGraphics({
      target: "colorLegendSymbols",
      property: "height",
      value: legendItems.map(item => item.height)
    })
    .editGraphics({
      target: "colorLegendSymbols",
      property: "fill",
      value: legendItems.map(item => item.color)
    })
    .editGraphics({ target: "colorLegendSymbols", property: "stroke", value: "white" })
    .editGraphics({ target: "colorLegendSymbols", property: "strokeWidth", value: 0.5 })
    .createGraphics({
      id: "colorLegendLabels",
      type: "text",
      length: legendItems.length
    })
    .editGraphics({
      target: "colorLegendLabels",
      property: "x",
      value: legendItems.map(item => item.labelX)
    })
    .editGraphics({
      target: "colorLegendLabels",
      property: "y",
      value: legendItems.map(item => item.labelY)
    })
    .editGraphics({
      target: "colorLegendLabels",
      property: "text",
      value: legendItems.map(item => item.origin)
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
    .editGraphics({ target: "colorLegendTitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "colorLegendTitle", property: "textBaseline", value: "middle" })
    .createTitle({
      text: values.title.text,
      subtitle: values.title.subtitle,
      align: "center"
    });
}

export function renderCarsHistogramEncodings(program, canvasContext) {
  render(program, canvasContext);
}
