import { chart } from "../../../src/index.js";

import {
  DISCRETIZED_COLOR_LAYOUT,
  createDiscretizedColorReference
} from "./reference-values.js";

const FONT = "sans-serif";
const AXIS = "#334155";
const GRID = "#e2e8f0";

export function createGapminderDiscretizedColorPrimitives(gapminder, type) {
  const values = createDiscretizedColorReference(gapminder, type);
  const { width, height } = DISCRETIZED_COLOR_LAYOUT;
  const { rows, bounds, domains, points, axes, legend, colors, title } = values;
  const xPositions = axes.x.positions;
  const yPositions = axes.y.positions;

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
    .editSemantic({ property: "scale[color].type", value: type })
    .editSemantic({ property: "scale[color].domain", value: domains.color })
    .editSemantic({ property: "scale[color].range", value: colors })
    .editSemantic({ property: "coordinate[main].type", value: "cartesian" })
    .editSemantic({ property: "guide.axis.x.scale", value: "x" })
    .editSemantic({ property: "guide.axis.x.coordinate", value: "main" })
    .editSemantic({ property: "guide.axis.x.title", value: "Population" })
    .editSemantic({ property: "guide.axis.y.scale", value: "y" })
    .editSemantic({ property: "guide.axis.y.coordinate", value: "main" })
    .editSemantic({ property: "guide.axis.y.title", value: "Fertility" })
    .editSemantic({ property: "guide.grid.horizontal.scale", value: "y" })
    .editSemantic({ property: "guide.grid.horizontal.coordinate", value: "main" })
    .editSemantic({ property: "guide.grid.vertical.scale", value: "x" })
    .editSemantic({ property: "guide.grid.vertical.coordinate", value: "main" })
    .editSemantic({ property: "guide.legend.color.scale", value: "color" })
    .editSemantic({
      property: "guide.legend.color.title",
      value: "Life expectancy"
    })
    .editSemantic({ property: "title.text", value: title.text })
    .editSemantic({ property: "title.subtitle", value: title.subtitle })
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
    .editGraphics({ target: "point", property: "x", value: points.map(point => point.x) })
    .editGraphics({ target: "point", property: "y", value: points.map(point => point.y) })
    .editGraphics({ target: "point", property: "radius", value: 4 })
    .editGraphics({ target: "point", property: "fill", value: points.map(point => point.fill) })
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
    .editGraphics({ target: "xAxisTicks", property: "y2", value: bounds.bottom + 3.6 })
    .editGraphics({ target: "xAxisTicks", property: "stroke", value: AXIS })
    .editGraphics({ target: "xAxisTicks", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "yAxisTicks", type: "line", length: yPositions.length })
    .editGraphics({ target: "yAxisTicks", property: "x1", value: bounds.left - 3.6 })
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
    .editGraphics({ target: "xAxisLabels", property: "y", value: bounds.bottom + 8.4 })
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
    .editGraphics({ target: "xAxisTitle", property: "y", value: 300 })
    .editGraphics({ target: "xAxisTitle", property: "text", value: "Population" })
    .editGraphics({ target: "xAxisTitle", property: "fill", value: AXIS })
    .editGraphics({ target: "xAxisTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "xAxisTitle", property: "fontFamily", value: FONT })
    .editGraphics({ target: "xAxisTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "xAxisTitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "xAxisTitle", property: "textBaseline", value: "middle" })
    .editGraphics({ target: "xAxisTitle", property: "rotation", value: 0 })
    .createGraphics({ id: "yAxisTitle", type: "text" })
    .editGraphics({ target: "yAxisTitle", property: "x", value: 14.4 })
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
      id: "colorLegendSymbols",
      type: "rect",
      length: colors.length
    })
    .editGraphics({ target: "colorLegendSymbols", property: "x", value: legend.symbolX })
    .editGraphics({
      target: "colorLegendSymbols",
      property: "y",
      value: legend.itemY.map(value => value - 6)
    })
    .editGraphics({ target: "colorLegendSymbols", property: "width", value: 14 })
    .editGraphics({ target: "colorLegendSymbols", property: "height", value: 12 })
    .editGraphics({ target: "colorLegendSymbols", property: "fill", value: colors })
    .editGraphics({ target: "colorLegendSymbols", property: "stroke", value: "white" })
    .editGraphics({ target: "colorLegendSymbols", property: "strokeWidth", value: 0.5 })
    .createGraphics({ id: "colorLegendLabels", type: "text", length: colors.length })
    .editGraphics({ target: "colorLegendLabels", property: "x", value: legend.labelX })
    .editGraphics({ target: "colorLegendLabels", property: "y", value: legend.itemY })
    .editGraphics({ target: "colorLegendLabels", property: "text", value: legend.labels })
    .editGraphics({ target: "colorLegendLabels", property: "fill", value: AXIS })
    .editGraphics({ target: "colorLegendLabels", property: "fontSize", value: 10 })
    .editGraphics({ target: "colorLegendLabels", property: "fontFamily", value: FONT })
    .editGraphics({ target: "colorLegendLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "colorLegendLabels", property: "textAlign", value: "left" })
    .editGraphics({ target: "colorLegendLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "colorLegendTitle", type: "text" })
    .editGraphics({ target: "colorLegendTitle", property: "x", value: legend.titleX })
    .editGraphics({ target: "colorLegendTitle", property: "y", value: legend.titleY })
    .editGraphics({ target: "colorLegendTitle", property: "text", value: "Life expectancy" })
    .editGraphics({ target: "colorLegendTitle", property: "fill", value: AXIS })
    .editGraphics({ target: "colorLegendTitle", property: "fontSize", value: 10 })
    .editGraphics({ target: "colorLegendTitle", property: "fontFamily", value: FONT })
    .editGraphics({ target: "colorLegendTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "colorLegendTitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "colorLegendTitle", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "chartTitle", type: "text" })
    .editGraphics({ target: "chartTitle", property: "x", value: bounds.left })
    .editGraphics({ target: "chartTitle", property: "y", value: 18 })
    .editGraphics({ target: "chartTitle", property: "text", value: title.text })
    .editGraphics({ target: "chartTitle", property: "fill", value: "#0f172a" })
    .editGraphics({ target: "chartTitle", property: "fontSize", value: 16 })
    .editGraphics({ target: "chartTitle", property: "fontFamily", value: FONT })
    .editGraphics({ target: "chartTitle", property: "fontWeight", value: 700 })
    .editGraphics({ target: "chartTitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "chartTitle", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "chartSubtitle", type: "text" })
    .editGraphics({ target: "chartSubtitle", property: "x", value: bounds.left })
    .editGraphics({ target: "chartSubtitle", property: "y", value: 35.8 })
    .editGraphics({ target: "chartSubtitle", property: "text", value: title.subtitle })
    .editGraphics({ target: "chartSubtitle", property: "fill", value: "#64748b" })
    .editGraphics({ target: "chartSubtitle", property: "fontSize", value: 10 })
    .editGraphics({ target: "chartSubtitle", property: "fontFamily", value: FONT })
    .editGraphics({ target: "chartSubtitle", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "chartSubtitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "chartSubtitle", property: "textBaseline", value: "middle" });
}
