import { chart, render } from "../../../src/index.js";

import {
  TRANSFORMED_SCATTER_LAYOUT,
  createGapminderTransformedScaleValues
} from "./reference-values.js";

const FONT = "sans-serif";
const AXIS = "#334155";
const GRID = "#e2e8f0";

export function createGapminderTransformedScalePrimitives(gapminder) {
  const values = createGapminderTransformedScaleValues(gapminder);
  const { width, height } = TRANSFORMED_SCATTER_LAYOUT;
  const { rows, bounds, domains, points, axes, legend } = values;
  const xPositions = axes.x.positions;
  const yPositions = axes.y.positions;
  const pointX = points.map(point => point.x);
  const pointY = points.map(point => point.y);
  const pointFill = points.map(point => point.fill);

  return chart()
    .editSemantic({ property: "dataset[data].values", value: gapminder })
    .editSemantic({ property: "dataset[gapminder2005].source", value: "data" })
    .editSemantic({
      property: "dataset[gapminder2005].transform",
      value: [{
        type: "filter",
        field: "year",
        predicate: { op: "eq", value: 2005 }
      }]
    })
    .editSemantic({ property: "dataset[gapminder2005].values", value: rows })
    .editSemantic({ property: "layer[points].mark.type", value: "point" })
    .editSemantic({ property: "layer[points].data", value: "gapminder2005" })
    .editSemantic({ property: "layer[points].coordinate", value: "main" })
    .editSemantic({ property: "layer[points].encoding.x.field", value: "pop" })
    .editSemantic({
      property: "layer[points].encoding.x.fieldType",
      value: "quantitative"
    })
    .editSemantic({ property: "layer[points].encoding.x.scale", value: "x" })
    .editSemantic({ property: "layer[points].encoding.y.field", value: "fertility" })
    .editSemantic({
      property: "layer[points].encoding.y.fieldType",
      value: "quantitative"
    })
    .editSemantic({ property: "layer[points].encoding.y.scale", value: "y" })
    .editSemantic({
      property: "layer[points].encoding.color.field",
      value: "life_expect"
    })
    .editSemantic({
      property: "layer[points].encoding.color.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[points].encoding.color.scale",
      value: "color"
    })
    .editSemantic({ property: "scale[x].type", value: "log" })
    .editSemantic({ property: "scale[x].base", value: 10 })
    .editSemantic({ property: "scale[x].domain", value: "auto" })
    .editSemantic({ property: "scale[x].range", value: "auto" })
    .editSemantic({ property: "scale[x].nice", value: true })
    .editSemantic({ property: "scale[y].type", value: "sqrt" })
    .editSemantic({ property: "scale[y].domain", value: "auto" })
    .editSemantic({ property: "scale[y].range", value: "auto" })
    .editSemantic({ property: "scale[y].nice", value: true })
    .editSemantic({ property: "scale[y].zero", value: false })
    .editSemantic({ property: "scale[color].type", value: "sequential" })
    .editSemantic({ property: "scale[color].domain", value: "auto" })
    .editSemantic({
      property: "scale[color].range",
      value: { palette: "viridis" }
    })
    .editSemantic({ property: "coordinate[main].type", value: "cartesian" })
    .editSemantic({ property: "guide.axis.x.scale", value: "x" })
    .editSemantic({ property: "guide.axis.x.coordinate", value: "main" })
    .editSemantic({ property: "guide.axis.x.title", value: "Population" })
    .editSemantic({ property: "guide.axis.y.scale", value: "y" })
    .editSemantic({ property: "guide.axis.y.coordinate", value: "main" })
    .editSemantic({ property: "guide.axis.y.title", value: "Fertility" })
    .editSemantic({ property: "guide.grid.horizontal.scale", value: "y" })
    .editSemantic({
      property: "guide.grid.horizontal.coordinate",
      value: "main"
    })
    .editSemantic({ property: "guide.grid.vertical.scale", value: "x" })
    .editSemantic({ property: "guide.grid.vertical.coordinate", value: "main" })
    .editSemantic({ property: "guide.legend.color.scale", value: "color" })
    .editSemantic({
      property: "guide.legend.color.title",
      value: "Life expectancy"
    })
    .editSemantic({
      property: "title.text",
      value: "Population, Fertility, and Life Expectancy"
    })
    .editSemantic({
      property: "title.subtitle",
      value: "Gapminder countries in 2005 · log population scale"
    })
    .createGraphics({ id: "canvas", type: "canvas" })
    .editGraphics({ target: "canvas", property: "width", value: width })
    .editGraphics({ target: "canvas", property: "height", value: height })
    .editGraphics({ target: "canvas", property: "background", value: "white" })
    .createGraphics({
      id: "horizontalGridLines",
      type: "line",
      length: yPositions.length
    })
    .editGraphics({ target: "horizontalGridLines", property: "x1", value: bounds.left })
    .editGraphics({ target: "horizontalGridLines", property: "y1", value: yPositions })
    .editGraphics({ target: "horizontalGridLines", property: "x2", value: bounds.right })
    .editGraphics({ target: "horizontalGridLines", property: "y2", value: yPositions })
    .editGraphics({ target: "horizontalGridLines", property: "stroke", value: GRID })
    .editGraphics({ target: "horizontalGridLines", property: "strokeWidth", value: 1 })
    .createGraphics({
      id: "verticalGridLines",
      type: "line",
      length: xPositions.length
    })
    .editGraphics({ target: "verticalGridLines", property: "x1", value: xPositions })
    .editGraphics({ target: "verticalGridLines", property: "y1", value: bounds.top })
    .editGraphics({ target: "verticalGridLines", property: "x2", value: xPositions })
    .editGraphics({ target: "verticalGridLines", property: "y2", value: bounds.bottom })
    .editGraphics({ target: "verticalGridLines", property: "stroke", value: GRID })
    .editGraphics({ target: "verticalGridLines", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "points", type: "circle", length: rows.length })
    .editGraphics({ target: "points", property: "x", value: pointX })
    .editGraphics({ target: "points", property: "y", value: pointY })
    .editGraphics({ target: "points", property: "radius", value: 4 })
    .editGraphics({ target: "points", property: "fill", value: pointFill })
    .editGraphics({ target: "points", property: "opacity", value: 0.72 })
    .editGraphics({ target: "points", property: "stroke", value: "#ffffff" })
    .editGraphics({ target: "points", property: "strokeWidth", value: 0.6 })
    .createGraphics({ id: "xAxisLine", type: "line" })
    .editGraphics({ target: "xAxisLine", property: "x1", value: bounds.left })
    .editGraphics({ target: "xAxisLine", property: "y1", value: bounds.bottom })
    .editGraphics({ target: "xAxisLine", property: "x2", value: bounds.right })
    .editGraphics({ target: "xAxisLine", property: "y2", value: bounds.bottom })
    .editGraphics({ target: "xAxisLine", property: "stroke", value: AXIS })
    .editGraphics({ target: "xAxisLine", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "yAxisLine", type: "line" })
    .editGraphics({ target: "yAxisLine", property: "x1", value: bounds.left })
    .editGraphics({ target: "yAxisLine", property: "y1", value: bounds.top })
    .editGraphics({ target: "yAxisLine", property: "x2", value: bounds.left })
    .editGraphics({ target: "yAxisLine", property: "y2", value: bounds.bottom })
    .editGraphics({ target: "yAxisLine", property: "stroke", value: AXIS })
    .editGraphics({ target: "yAxisLine", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "xAxisTicks", type: "line", length: xPositions.length })
    .editGraphics({ target: "xAxisTicks", property: "x1", value: xPositions })
    .editGraphics({ target: "xAxisTicks", property: "y1", value: bounds.bottom })
    .editGraphics({ target: "xAxisTicks", property: "x2", value: xPositions })
    .editGraphics({ target: "xAxisTicks", property: "y2", value: bounds.bottom + 6 })
    .editGraphics({ target: "xAxisTicks", property: "stroke", value: AXIS })
    .editGraphics({ target: "xAxisTicks", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "yAxisTicks", type: "line", length: yPositions.length })
    .editGraphics({ target: "yAxisTicks", property: "x1", value: bounds.left - 6 })
    .editGraphics({ target: "yAxisTicks", property: "y1", value: yPositions })
    .editGraphics({ target: "yAxisTicks", property: "x2", value: bounds.left })
    .editGraphics({ target: "yAxisTicks", property: "y2", value: yPositions })
    .editGraphics({ target: "yAxisTicks", property: "stroke", value: AXIS })
    .editGraphics({ target: "yAxisTicks", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "xAxisLabels", type: "text", length: xPositions.length })
    .editGraphics({ target: "xAxisLabels", property: "x", value: xPositions })
    .editGraphics({ target: "xAxisLabels", property: "y", value: bounds.bottom + 14 })
    .editGraphics({ target: "xAxisLabels", property: "text", value: axes.x.labels })
    .editGraphics({ target: "xAxisLabels", property: "fill", value: AXIS })
    .editGraphics({ target: "xAxisLabels", property: "fontSize", value: 11 })
    .editGraphics({ target: "xAxisLabels", property: "fontFamily", value: FONT })
    .editGraphics({ target: "xAxisLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "xAxisLabels", property: "textAlign", value: "center" })
    .editGraphics({ target: "xAxisLabels", property: "textBaseline", value: "top" })
    .createGraphics({ id: "yAxisLabels", type: "text", length: yPositions.length })
    .editGraphics({ target: "yAxisLabels", property: "x", value: bounds.left - 12 })
    .editGraphics({ target: "yAxisLabels", property: "y", value: yPositions })
    .editGraphics({ target: "yAxisLabels", property: "text", value: axes.y.labels })
    .editGraphics({ target: "yAxisLabels", property: "fill", value: AXIS })
    .editGraphics({ target: "yAxisLabels", property: "fontSize", value: 11 })
    .editGraphics({ target: "yAxisLabels", property: "fontFamily", value: FONT })
    .editGraphics({ target: "yAxisLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "yAxisLabels", property: "textAlign", value: "right" })
    .editGraphics({ target: "yAxisLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "xAxisTitle", type: "text" })
    .editGraphics({ target: "xAxisTitle", property: "x", value: (bounds.left + bounds.right) / 2 })
    .editGraphics({ target: "xAxisTitle", property: "y", value: 500 })
    .editGraphics({ target: "xAxisTitle", property: "text", value: "Population" })
    .editGraphics({ target: "xAxisTitle", property: "fill", value: AXIS })
    .editGraphics({ target: "xAxisTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "xAxisTitle", property: "fontFamily", value: FONT })
    .editGraphics({ target: "xAxisTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "xAxisTitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "xAxisTitle", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "yAxisTitle", type: "text" })
    .editGraphics({ target: "yAxisTitle", property: "x", value: 24 })
    .editGraphics({ target: "yAxisTitle", property: "y", value: (bounds.top + bounds.bottom) / 2 })
    .editGraphics({ target: "yAxisTitle", property: "text", value: "Fertility" })
    .editGraphics({ target: "yAxisTitle", property: "fill", value: AXIS })
    .editGraphics({ target: "yAxisTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "yAxisTitle", property: "fontFamily", value: FONT })
    .editGraphics({ target: "yAxisTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "yAxisTitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "yAxisTitle", property: "textBaseline", value: "middle" })
    .editGraphics({ target: "yAxisTitle", property: "rotation", value: -Math.PI / 2 })
    .createGraphics({ id: "legendGradient", type: "rect", length: legend.gradient.length })
    .editGraphics({ target: "legendGradient", property: "x", value: legend.gradient.map(item => item.x) })
    .editGraphics({ target: "legendGradient", property: "y", value: legend.gradient.map(item => item.y) })
    .editGraphics({ target: "legendGradient", property: "width", value: legend.gradient.map(item => item.width) })
    .editGraphics({ target: "legendGradient", property: "height", value: legend.gradient.map(item => item.height) })
    .editGraphics({ target: "legendGradient", property: "fill", value: legend.gradient.map(item => item.fill) })
    .editGraphics({ target: "legendGradient", property: "stroke", value: legend.gradient.map(item => item.fill) })
    .editGraphics({ target: "legendGradient", property: "strokeWidth", value: 0 })
    .createGraphics({ id: "legendOutline", type: "rect" })
    .editGraphics({ target: "legendOutline", property: "x", value: 646 })
    .editGraphics({ target: "legendOutline", property: "y", value: 152 })
    .editGraphics({ target: "legendOutline", property: "width", value: 16 })
    .editGraphics({ target: "legendOutline", property: "height", value: 220 })
    .editGraphics({ target: "legendOutline", property: "fill", value: "rgba(0,0,0,0)" })
    .editGraphics({ target: "legendOutline", property: "stroke", value: "#94a3b8" })
    .editGraphics({ target: "legendOutline", property: "strokeWidth", value: 0.75 })
    .createGraphics({ id: "legendTicks", type: "line", length: legend.positions.length })
    .editGraphics({ target: "legendTicks", property: "x1", value: 662 })
    .editGraphics({ target: "legendTicks", property: "y1", value: legend.positions })
    .editGraphics({ target: "legendTicks", property: "x2", value: 668 })
    .editGraphics({ target: "legendTicks", property: "y2", value: legend.positions })
    .editGraphics({ target: "legendTicks", property: "stroke", value: AXIS })
    .editGraphics({ target: "legendTicks", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "legendLabels", type: "text", length: legend.positions.length })
    .editGraphics({ target: "legendLabels", property: "x", value: 674 })
    .editGraphics({ target: "legendLabels", property: "y", value: legend.positions })
    .editGraphics({ target: "legendLabels", property: "text", value: legend.labels })
    .editGraphics({ target: "legendLabels", property: "fill", value: AXIS })
    .editGraphics({ target: "legendLabels", property: "fontSize", value: 11 })
    .editGraphics({ target: "legendLabels", property: "fontFamily", value: FONT })
    .editGraphics({ target: "legendLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "legendLabels", property: "textAlign", value: "left" })
    .editGraphics({ target: "legendLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "legendTitle", type: "text" })
    .editGraphics({ target: "legendTitle", property: "x", value: 646 })
    .editGraphics({ target: "legendTitle", property: "y", value: 128 })
    .editGraphics({ target: "legendTitle", property: "text", value: "Life expectancy" })
    .editGraphics({ target: "legendTitle", property: "fill", value: AXIS })
    .editGraphics({ target: "legendTitle", property: "fontSize", value: 12 })
    .editGraphics({ target: "legendTitle", property: "fontFamily", value: FONT })
    .editGraphics({ target: "legendTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "legendTitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "legendTitle", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "chartTitle", type: "text" })
    .editGraphics({ target: "chartTitle", property: "x", value: bounds.left })
    .editGraphics({ target: "chartTitle", property: "y", value: 30 })
    .editGraphics({ target: "chartTitle", property: "text", value: "Population, Fertility, and Life Expectancy" })
    .editGraphics({ target: "chartTitle", property: "fill", value: "#0f172a" })
    .editGraphics({ target: "chartTitle", property: "fontSize", value: 20 })
    .editGraphics({ target: "chartTitle", property: "fontFamily", value: FONT })
    .editGraphics({ target: "chartTitle", property: "fontWeight", value: 700 })
    .editGraphics({ target: "chartTitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "chartTitle", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "chartSubtitle", type: "text" })
    .editGraphics({ target: "chartSubtitle", property: "x", value: bounds.left })
    .editGraphics({ target: "chartSubtitle", property: "y", value: 58 })
    .editGraphics({ target: "chartSubtitle", property: "text", value: "Gapminder countries in 2005 · log population scale" })
    .editGraphics({ target: "chartSubtitle", property: "fill", value: "#64748b" })
    .editGraphics({ target: "chartSubtitle", property: "fontSize", value: 12 })
    .editGraphics({ target: "chartSubtitle", property: "fontFamily", value: FONT })
    .editGraphics({ target: "chartSubtitle", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "chartSubtitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "chartSubtitle", property: "textBaseline", value: "middle" });
}

export function renderGapminderTransformedScalePrimitives(program, context) {
  render(program, context);
}
