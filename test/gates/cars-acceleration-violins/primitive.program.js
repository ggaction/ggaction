import { chart } from "../../../src/index.js";
import { linearPathCommands } from "../../support/path.js";
import {
  ORIGIN_DOMAIN,
  createCarsViolinValues
} from "./reference-values.js";

export function createCarsViolinPrimitiveResult(cars, { split = false } = {}) {
  const values = createCarsViolinValues(cars, { split });
  const { bounds, layout } = values;
  const xPositions = values.centers.map(center => center.x);
  const yPositions = values.yTicks.map(tick => tick.y);
  let program = chart()
    .createCanvas({
      width: layout.width,
      height: layout.height,
      margin: layout.margin,
      background: "white"
    })
    .createData({ id: "cars", values: values.rows })
    .createGraphics({
      id: "horizontalGridLines",
      parent: "plot-main",
      type: "line",
      length: values.yTicks.length
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "x1",
      value: bounds.left
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "y1",
      value: yPositions
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "x2",
      value: bounds.right
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "y2",
      value: yPositions
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
      value: values.yTicks.map(() => [])
    })
    .createGraphics({
      id: "violins",
      parent: "plot-main",
      type: "path",
      length: values.paths.length
    })
    .editGraphics({
      target: "violins",
      property: "commands",
      value: values.paths.map(path =>
        linearPathCommands(path.points, { close: true })
      )
    })
    .editGraphics({
      target: "violins",
      property: "fill",
      value: values.paths.map(path => path.fill)
    })
    .editGraphics({
      target: "violins",
      property: "stroke",
      value: values.paths.map(path => path.fill)
    })
    .editGraphics({
      target: "violins",
      property: "strokeWidth",
      value: 1.2
    })
    .editGraphics({
      target: "violins",
      property: "opacity",
      value: 0.8
    })
    .createGraphics({ id: "xAxisLine", parent: "plot-main", type: "line" })
    .editGraphics({ target: "xAxisLine", property: "x1", value: bounds.left })
    .editGraphics({ target: "xAxisLine", property: "y1", value: bounds.bottom })
    .editGraphics({ target: "xAxisLine", property: "x2", value: bounds.right })
    .editGraphics({ target: "xAxisLine", property: "y2", value: bounds.bottom })
    .editGraphics({ target: "xAxisLine", property: "stroke", value: "#334155" })
    .editGraphics({ target: "xAxisLine", property: "strokeWidth", value: 1 })
    .createGraphics({
      id: "xAxisTicks",
      parent: "plot-main",
      type: "line",
      length: xPositions.length
    })
    .editGraphics({ target: "xAxisTicks", property: "x1", value: xPositions })
    .editGraphics({ target: "xAxisTicks", property: "y1", value: bounds.bottom })
    .editGraphics({ target: "xAxisTicks", property: "x2", value: xPositions })
    .editGraphics({ target: "xAxisTicks", property: "y2", value: bounds.bottom + 6 })
    .editGraphics({ target: "xAxisTicks", property: "stroke", value: "#64748b" })
    .editGraphics({ target: "xAxisTicks", property: "strokeWidth", value: 1 })
    .createGraphics({
      id: "xAxisLabels",
      parent: "plot-main",
      type: "text",
      length: xPositions.length
    })
    .editGraphics({ target: "xAxisLabels", property: "x", value: xPositions })
    .editGraphics({ target: "xAxisLabels", property: "y", value: bounds.bottom + 18 })
    .editGraphics({ target: "xAxisLabels", property: "text", value: ORIGIN_DOMAIN })
    .editGraphics({ target: "xAxisLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "xAxisLabels", property: "fontSize", value: 13 })
    .editGraphics({ target: "xAxisLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "xAxisLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "xAxisLabels", property: "textAlign", value: "center" })
    .editGraphics({ target: "xAxisLabels", property: "textBaseline", value: "top" })
    .createGraphics({ id: "xAxisTitle", parent: "plot-main", type: "text" })
    .editGraphics({
      target: "xAxisTitle",
      property: "x",
      value: bounds.left + bounds.width / 2
    })
    .editGraphics({ target: "xAxisTitle", property: "y", value: bounds.bottom + 58 })
    .editGraphics({ target: "xAxisTitle", property: "text", value: "Origin" })
    .editGraphics({ target: "xAxisTitle", property: "fill", value: "#334155" })
    .editGraphics({ target: "xAxisTitle", property: "fontSize", value: 14 })
    .editGraphics({ target: "xAxisTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "xAxisTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "xAxisTitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "xAxisTitle", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "yAxisLine", parent: "plot-main", type: "line" })
    .editGraphics({ target: "yAxisLine", property: "x1", value: bounds.left })
    .editGraphics({ target: "yAxisLine", property: "y1", value: bounds.top })
    .editGraphics({ target: "yAxisLine", property: "x2", value: bounds.left })
    .editGraphics({ target: "yAxisLine", property: "y2", value: bounds.bottom })
    .editGraphics({ target: "yAxisLine", property: "stroke", value: "#334155" })
    .editGraphics({ target: "yAxisLine", property: "strokeWidth", value: 1 })
    .createGraphics({
      id: "yAxisTicks",
      parent: "plot-main",
      type: "line",
      length: yPositions.length
    })
    .editGraphics({ target: "yAxisTicks", property: "x1", value: bounds.left - 6 })
    .editGraphics({ target: "yAxisTicks", property: "y1", value: yPositions })
    .editGraphics({ target: "yAxisTicks", property: "x2", value: bounds.left })
    .editGraphics({ target: "yAxisTicks", property: "y2", value: yPositions })
    .editGraphics({ target: "yAxisTicks", property: "stroke", value: "#64748b" })
    .editGraphics({ target: "yAxisTicks", property: "strokeWidth", value: 1 })
    .createGraphics({
      id: "yAxisLabels",
      parent: "plot-main",
      type: "text",
      length: yPositions.length
    })
    .editGraphics({ target: "yAxisLabels", property: "x", value: bounds.left - 12 })
    .editGraphics({ target: "yAxisLabels", property: "y", value: yPositions })
    .editGraphics({
      target: "yAxisLabels",
      property: "text",
      value: values.yTicks.map(tick => String(tick.value))
    })
    .editGraphics({ target: "yAxisLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "yAxisLabels", property: "fontSize", value: 12 })
    .editGraphics({ target: "yAxisLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "yAxisLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "yAxisLabels", property: "textAlign", value: "right" })
    .editGraphics({ target: "yAxisLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "yAxisTitle", parent: "plot-main", type: "text" })
    .editGraphics({ target: "yAxisTitle", property: "x", value: bounds.left - 54 })
    .editGraphics({
      target: "yAxisTitle",
      property: "y",
      value: bounds.top + bounds.height / 2
    })
    .editGraphics({ target: "yAxisTitle", property: "text", value: "Acceleration" })
    .editGraphics({ target: "yAxisTitle", property: "fill", value: "#334155" })
    .editGraphics({ target: "yAxisTitle", property: "fontSize", value: 14 })
    .editGraphics({ target: "yAxisTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "yAxisTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "yAxisTitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "yAxisTitle", property: "textBaseline", value: "middle" })
    .editGraphics({
      target: "yAxisTitle",
      property: "rotation",
      value: -Math.PI / 2
    })
    .createGraphics({ id: "chartTitle", parent: "canvas", type: "text" })
    .editGraphics({ target: "chartTitle", property: "x", value: values.title.x })
    .editGraphics({ target: "chartTitle", property: "y", value: 32 })
    .editGraphics({ target: "chartTitle", property: "text", value: values.title.text })
    .editGraphics({ target: "chartTitle", property: "fill", value: "#0f172a" })
    .editGraphics({ target: "chartTitle", property: "fontSize", value: 24 })
    .editGraphics({ target: "chartTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "chartTitle", property: "fontWeight", value: 700 })
    .editGraphics({ target: "chartTitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "chartTitle", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "chartSubtitle", parent: "canvas", type: "text" })
    .editGraphics({ target: "chartSubtitle", property: "x", value: values.title.x })
    .editGraphics({ target: "chartSubtitle", property: "y", value: 62 })
    .editGraphics({
      target: "chartSubtitle",
      property: "text",
      value: values.title.subtitle
    })
    .editGraphics({ target: "chartSubtitle", property: "fill", value: "#64748b" })
    .editGraphics({ target: "chartSubtitle", property: "fontSize", value: 14 })
    .editGraphics({ target: "chartSubtitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "chartSubtitle", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "chartSubtitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "chartSubtitle", property: "textBaseline", value: "middle" });

  if (values.legend !== undefined) {
    const legend = values.legend;
    program = program
      .createGraphics({
        id: "splitLegendSymbols",
        parent: "canvas",
        type: "rect",
        length: legend.items.length
      })
      .editGraphics({
        target: "splitLegendSymbols",
        property: "x",
        value: legend.items.map(item => item.x)
      })
      .editGraphics({
        target: "splitLegendSymbols",
        property: "y",
        value: legend.items.map(item => item.y)
      })
      .editGraphics({ target: "splitLegendSymbols", property: "width", value: 16 })
      .editGraphics({ target: "splitLegendSymbols", property: "height", value: 16 })
      .editGraphics({
        target: "splitLegendSymbols",
        property: "fill",
        value: legend.items.map(item => item.fill)
      })
      .editGraphics({ target: "splitLegendSymbols", property: "stroke", value: "white" })
      .editGraphics({ target: "splitLegendSymbols", property: "strokeWidth", value: 0.75 })
      .createGraphics({
        id: "splitLegendLabels",
        parent: "canvas",
        type: "text",
        length: legend.items.length
      })
      .editGraphics({
        target: "splitLegendLabels",
        property: "x",
        value: legend.items.map(item => item.x + 26)
      })
      .editGraphics({
        target: "splitLegendLabels",
        property: "y",
        value: legend.items.map(item => item.y + 8)
      })
      .editGraphics({
        target: "splitLegendLabels",
        property: "text",
        value: legend.items.map(item => item.label)
      })
      .editGraphics({ target: "splitLegendLabels", property: "fill", value: "#334155" })
      .editGraphics({ target: "splitLegendLabels", property: "fontSize", value: 13 })
      .editGraphics({ target: "splitLegendLabels", property: "fontFamily", value: "sans-serif" })
      .editGraphics({ target: "splitLegendLabels", property: "fontWeight", value: "normal" })
      .editGraphics({ target: "splitLegendLabels", property: "textAlign", value: "left" })
      .editGraphics({ target: "splitLegendLabels", property: "textBaseline", value: "middle" })
      .createGraphics({ id: "splitLegendTitle", parent: "canvas", type: "text" })
      .editGraphics({ target: "splitLegendTitle", property: "x", value: legend.title.x })
      .editGraphics({ target: "splitLegendTitle", property: "y", value: legend.title.y })
      .editGraphics({ target: "splitLegendTitle", property: "text", value: legend.title.text })
      .editGraphics({ target: "splitLegendTitle", property: "fill", value: "#334155" })
      .editGraphics({ target: "splitLegendTitle", property: "fontSize", value: 14 })
      .editGraphics({ target: "splitLegendTitle", property: "fontFamily", value: "sans-serif" })
      .editGraphics({ target: "splitLegendTitle", property: "fontWeight", value: 600 })
      .editGraphics({ target: "splitLegendTitle", property: "textAlign", value: "left" })
      .editGraphics({ target: "splitLegendTitle", property: "textBaseline", value: "middle" });
  }

  return Object.freeze({ program, values });
}

export function createCarsViolinPrimitives(cars, options) {
  return createCarsViolinPrimitiveResult(cars, options).program;
}
