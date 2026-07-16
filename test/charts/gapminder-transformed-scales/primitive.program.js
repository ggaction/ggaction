import { chart, render } from "../../../src/index.js";

import {
  TRANSFORMED_SCATTER_LAYOUT,
  TRANSFORMED_SCATTER_SCALE,
  createGapminderTransformedScaleValues
} from "./reference-values.js";

const FONT = "sans-serif";
const AXIS = "#334155";
const GRID = "#e2e8f0";
const scaled = value => value * TRANSFORMED_SCATTER_SCALE;

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
    .editSemantic({ property: "layer[point].mark.type", value: "point" })
    .editSemantic({ property: "layer[point].data", value: "gapminder2005" })
    .editSemantic({ property: "layer[point].coordinate", value: "main" })
    .editSemantic({ property: "layer[point].encoding.x.field", value: "pop" })
    .editSemantic({
      property: "layer[point].encoding.x.fieldType",
      value: "quantitative"
    })
    .editSemantic({ property: "layer[point].encoding.x.scale", value: "x" })
    .editSemantic({ property: "layer[point].encoding.y.field", value: "fertility" })
    .editSemantic({
      property: "layer[point].encoding.y.fieldType",
      value: "quantitative"
    })
    .editSemantic({ property: "layer[point].encoding.y.scale", value: "y" })
    .editSemantic({
      property: "layer[point].encoding.color.field",
      value: "life_expect"
    })
    .editSemantic({
      property: "layer[point].encoding.color.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[point].encoding.color.scale",
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
      value: { palette: { name: "viridis" } }
    })
    .editSemantic({ property: "scale[color].interpolate", value: "rgb" })
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
    .editGraphics({
      target: "horizontalGridLines",
      property: "strokeDash",
      value: yPositions.map(() => [])
    })
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
    .editGraphics({
      target: "verticalGridLines",
      property: "strokeDash",
      value: xPositions.map(() => [])
    })
    .createGraphics({ id: "point", type: "circle", length: rows.length })
    .editGraphics({ target: "point", property: "x", value: pointX })
    .editGraphics({ target: "point", property: "y", value: pointY })
    .editGraphics({ target: "point", property: "radius", value: 4 })
    .editGraphics({ target: "point", property: "fill", value: pointFill })
    .editGraphics({ target: "point", property: "opacity", value: 0.72 })
    .editGraphics({ target: "point", property: "stroke", value: "#ffffff" })
    .editGraphics({ target: "point", property: "strokeWidth", value: 0.6 })
    .createGraphics({ id: "xAxisLine", type: "line" })
    .editGraphics({ target: "xAxisLine", property: "x1", value: bounds.left })
    .editGraphics({ target: "xAxisLine", property: "y1", value: bounds.bottom })
    .editGraphics({ target: "xAxisLine", property: "x2", value: bounds.right })
    .editGraphics({ target: "xAxisLine", property: "y2", value: bounds.bottom })
    .editGraphics({ target: "xAxisLine", property: "stroke", value: AXIS })
    .editGraphics({ target: "xAxisLine", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "yAxisLine", type: "line" })
    .editGraphics({ target: "yAxisLine", property: "x1", value: bounds.left })
    .editGraphics({ target: "yAxisLine", property: "y1", value: bounds.bottom })
    .editGraphics({ target: "yAxisLine", property: "x2", value: bounds.left })
    .editGraphics({ target: "yAxisLine", property: "y2", value: bounds.top })
    .editGraphics({ target: "yAxisLine", property: "stroke", value: AXIS })
    .editGraphics({ target: "yAxisLine", property: "strokeWidth", value: 1 })
    .createGraphics({
      id: "xAxisTicks",
      type: "line",
      length: xPositions.length,
      before: "yAxisLine"
    })
    .editGraphics({ target: "xAxisTicks", property: "x1", value: xPositions })
    .editGraphics({ target: "xAxisTicks", property: "y1", value: bounds.bottom })
    .editGraphics({ target: "xAxisTicks", property: "x2", value: xPositions })
    .editGraphics({ target: "xAxisTicks", property: "y2", value: bounds.bottom + scaled(6) })
    .editGraphics({ target: "xAxisTicks", property: "stroke", value: AXIS })
    .editGraphics({ target: "xAxisTicks", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "yAxisTicks", type: "line", length: yPositions.length })
    .editGraphics({ target: "yAxisTicks", property: "x1", value: bounds.left - scaled(6) })
    .editGraphics({ target: "yAxisTicks", property: "y1", value: yPositions })
    .editGraphics({ target: "yAxisTicks", property: "x2", value: bounds.left })
    .editGraphics({ target: "yAxisTicks", property: "y2", value: yPositions })
    .editGraphics({ target: "yAxisTicks", property: "stroke", value: AXIS })
    .editGraphics({ target: "yAxisTicks", property: "strokeWidth", value: 1 })
    .createGraphics({
      id: "xAxisLabels",
      type: "text",
      length: xPositions.length,
      before: "yAxisLine"
    })
    .editGraphics({ target: "xAxisLabels", property: "x", value: xPositions })
    .editGraphics({ target: "xAxisLabels", property: "y", value: bounds.bottom + scaled(14) })
    .editGraphics({ target: "xAxisLabels", property: "text", value: axes.x.labels })
    .editGraphics({ target: "xAxisLabels", property: "fill", value: AXIS })
    .editGraphics({ target: "xAxisLabels", property: "fontSize", value: 11 })
    .editGraphics({ target: "xAxisLabels", property: "fontFamily", value: FONT })
    .editGraphics({ target: "xAxisLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "xAxisLabels", property: "textAlign", value: "center" })
    .editGraphics({ target: "xAxisLabels", property: "textBaseline", value: "top" })
    .createGraphics({ id: "yAxisLabels", type: "text", length: yPositions.length })
    .editGraphics({ target: "yAxisLabels", property: "x", value: bounds.left - 7.2 })
    .editGraphics({ target: "yAxisLabels", property: "y", value: yPositions })
    .editGraphics({ target: "yAxisLabels", property: "text", value: axes.y.labels })
    .editGraphics({ target: "yAxisLabels", property: "fill", value: AXIS })
    .editGraphics({ target: "yAxisLabels", property: "fontSize", value: 11 })
    .editGraphics({ target: "yAxisLabels", property: "fontFamily", value: FONT })
    .editGraphics({ target: "yAxisLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "yAxisLabels", property: "textAlign", value: "right" })
    .editGraphics({ target: "yAxisLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "xAxisTitle", type: "text", before: "yAxisLine" })
    .editGraphics({ target: "xAxisTitle", property: "x", value: (bounds.left + bounds.right) / 2 })
    .editGraphics({ target: "xAxisTitle", property: "y", value: scaled(500) })
    .editGraphics({ target: "xAxisTitle", property: "text", value: "Population" })
    .editGraphics({ target: "xAxisTitle", property: "fill", value: AXIS })
    .editGraphics({ target: "xAxisTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "xAxisTitle", property: "fontFamily", value: FONT })
    .editGraphics({ target: "xAxisTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "xAxisTitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "xAxisTitle", property: "textBaseline", value: "middle" })
    .editGraphics({ target: "xAxisTitle", property: "rotation", value: 0 })
    .createGraphics({ id: "yAxisTitle", type: "text" })
    .editGraphics({ target: "yAxisTitle", property: "x", value: scaled(24) })
    .editGraphics({ target: "yAxisTitle", property: "y", value: (bounds.top + bounds.bottom) / 2 })
    .editGraphics({ target: "yAxisTitle", property: "text", value: "Fertility" })
    .editGraphics({ target: "yAxisTitle", property: "fill", value: AXIS })
    .editGraphics({ target: "yAxisTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "yAxisTitle", property: "fontFamily", value: FONT })
    .editGraphics({ target: "yAxisTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "yAxisTitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "yAxisTitle", property: "textBaseline", value: "middle" })
    .editGraphics({ target: "yAxisTitle", property: "rotation", value: -Math.PI / 2 })
    .createGraphics({
      id: "colorGradientStrips",
      type: "rect",
      length: legend.gradient.length,
      before: "xAxisLine"
    })
    .editGraphics({ target: "colorGradientStrips", property: "x", value: legend.gradient.map(item => item.x) })
    .editGraphics({ target: "colorGradientStrips", property: "y", value: legend.gradient.map(item => item.y) })
    .editGraphics({ target: "colorGradientStrips", property: "width", value: legend.gradient.map(item => item.width) })
    .editGraphics({ target: "colorGradientStrips", property: "height", value: legend.gradient.map(item => item.height) })
    .editGraphics({ target: "colorGradientStrips", property: "fill", value: legend.gradient.map(item => item.fill) })
    .editGraphics({ target: "colorGradientStrips", property: "stroke", value: legend.gradient.map(item => item.fill) })
    .editGraphics({ target: "colorGradientStrips", property: "strokeWidth", value: 0 })
    .createGraphics({ id: "colorGradientTicks", type: "line", length: legend.positions.length })
    .editGraphics({ target: "colorGradientTicks", property: "x1", value: 387.6 + 9.6 })
    .editGraphics({ target: "colorGradientTicks", property: "y1", value: legend.positions })
    .editGraphics({ target: "colorGradientTicks", property: "x2", value: 387.6 + 9.6 + 6 })
    .editGraphics({ target: "colorGradientTicks", property: "y2", value: legend.positions })
    .editGraphics({ target: "colorGradientTicks", property: "stroke", value: "#64748b" })
    .editGraphics({ target: "colorGradientTicks", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "colorGradientLabels", type: "text", length: legend.positions.length })
    .editGraphics({ target: "colorGradientLabels", property: "x", value: 387.6 + 9.6 + 7.2 })
    .editGraphics({ target: "colorGradientLabels", property: "y", value: legend.positions })
    .editGraphics({ target: "colorGradientLabels", property: "text", value: legend.labels })
    .editGraphics({ target: "colorGradientLabels", property: "fill", value: AXIS })
    .editGraphics({ target: "colorGradientLabels", property: "fontSize", value: 11 })
    .editGraphics({ target: "colorGradientLabels", property: "fontFamily", value: FONT })
    .editGraphics({ target: "colorGradientLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "colorGradientLabels", property: "textAlign", value: "left" })
    .editGraphics({ target: "colorGradientLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "colorGradientTitle", type: "text" })
    .editGraphics({ target: "colorGradientTitle", property: "x", value: 387.6 })
    .editGraphics({ target: "colorGradientTitle", property: "y", value: 77.6 })
    .editGraphics({ target: "colorGradientTitle", property: "text", value: "Life expectancy" })
    .editGraphics({ target: "colorGradientTitle", property: "fill", value: AXIS })
    .editGraphics({ target: "colorGradientTitle", property: "fontSize", value: 10 })
    .editGraphics({ target: "colorGradientTitle", property: "fontFamily", value: FONT })
    .editGraphics({ target: "colorGradientTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "colorGradientTitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "colorGradientTitle", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "chartTitle", type: "text" })
    .editGraphics({ target: "chartTitle", property: "x", value: bounds.left })
    .editGraphics({ target: "chartTitle", property: "y", value: scaled(30) })
    .editGraphics({ target: "chartTitle", property: "text", value: "Population, Fertility, and Life Expectancy" })
    .editGraphics({ target: "chartTitle", property: "fill", value: "#0f172a" })
    .editGraphics({ target: "chartTitle", property: "fontSize", value: 16 })
    .editGraphics({ target: "chartTitle", property: "fontFamily", value: FONT })
    .editGraphics({ target: "chartTitle", property: "fontWeight", value: 700 })
    .editGraphics({ target: "chartTitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "chartTitle", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "chartSubtitle", type: "text" })
    .editGraphics({ target: "chartSubtitle", property: "x", value: bounds.left })
    .editGraphics({ target: "chartSubtitle", property: "y", value: 35.8 })
    .editGraphics({ target: "chartSubtitle", property: "text", value: "Gapminder countries in 2005 · log population scale" })
    .editGraphics({ target: "chartSubtitle", property: "fill", value: "#64748b" })
    .editGraphics({ target: "chartSubtitle", property: "fontSize", value: 10 })
    .editGraphics({ target: "chartSubtitle", property: "fontFamily", value: FONT })
    .editGraphics({ target: "chartSubtitle", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "chartSubtitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "chartSubtitle", property: "textBaseline", value: "middle" });
}

export function renderGapminderTransformedScalePrimitives(program, context) {
  render(program, context);
}
