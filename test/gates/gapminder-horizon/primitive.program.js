import { chart } from "../../../src/index.js";

import { createGapminderHorizonValues } from "./reference-values.js";

export function createGapminderHorizonPrimitiveResult(gapminder) {
  const values = createGapminderHorizonValues(gapminder);
  const { bounds, layout } = values;
  const xPositions = values.xTicks.map(tick => tick.x);
  const program = chart()
    .createCanvas({
      width: layout.width,
      height: layout.height,
      margin: layout.margin,
      background: "white"
    })
    .createData({ id: "kenya", values: values.rows })
    .createGraphics({
      id: "verticalGridLines",
      parent: "plot-main",
      type: "line",
      length: values.xTicks.length
    })
    .editGraphics({
      target: "verticalGridLines",
      property: "x1",
      value: xPositions
    })
    .editGraphics({
      target: "verticalGridLines",
      property: "y1",
      value: bounds.top
    })
    .editGraphics({
      target: "verticalGridLines",
      property: "x2",
      value: xPositions
    })
    .editGraphics({
      target: "verticalGridLines",
      property: "y2",
      value: bounds.bottom
    })
    .editGraphics({
      target: "verticalGridLines",
      property: "stroke",
      value: "#e2e8f0"
    })
    .editGraphics({
      target: "verticalGridLines",
      property: "strokeWidth",
      value: 1
    })
    .editGraphics({
      target: "verticalGridLines",
      property: "strokeDash",
      value: values.xTicks.map(() => [])
    })
    .createGraphics({
      id: "horizonBands",
      parent: "plot-main",
      type: "path",
      length: values.series.length
    })
    .editGraphics({
      target: "horizonBands",
      property: "commands",
      value: values.series.map(series => series.commands)
    })
    .editGraphics({
      target: "horizonBands",
      property: "fill",
      value: values.series.map(series => series.fill)
    })
    .editGraphics({
      target: "horizonBands",
      property: "opacity",
      value: 1
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
      length: values.xTicks.length
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
      length: values.xTicks.length
    })
    .editGraphics({ target: "xAxisLabels", property: "x", value: xPositions })
    .editGraphics({ target: "xAxisLabels", property: "y", value: bounds.bottom + 14 })
    .editGraphics({
      target: "xAxisLabels",
      property: "text",
      value: values.xTicks.map(tick => String(tick.value))
    })
    .editGraphics({ target: "xAxisLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "xAxisLabels", property: "fontSize", value: 12 })
    .editGraphics({ target: "xAxisLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "xAxisLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "xAxisLabels", property: "textAlign", value: "center" })
    .editGraphics({ target: "xAxisLabels", property: "textBaseline", value: "top" })
    .createGraphics({ id: "xAxisTitle", parent: "plot-main", type: "text" })
    .editGraphics({ target: "xAxisTitle", property: "x", value: values.title.x })
    .editGraphics({ target: "xAxisTitle", property: "y", value: bounds.bottom + 44 })
    .editGraphics({ target: "xAxisTitle", property: "text", value: "Year" })
    .editGraphics({ target: "xAxisTitle", property: "fill", value: "#334155" })
    .editGraphics({ target: "xAxisTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "xAxisTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "xAxisTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "xAxisTitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "xAxisTitle", property: "textBaseline", value: "middle" })
    .editGraphics({ target: "xAxisTitle", property: "rotation", value: 0 })
    .createGraphics({ id: "chartTitle", parent: "canvas", type: "text" })
    .editGraphics({ target: "chartTitle", property: "x", value: values.title.x })
    .editGraphics({ target: "chartTitle", property: "y", value: 24 })
    .editGraphics({ target: "chartTitle", property: "text", value: values.title.text })
    .editGraphics({ target: "chartTitle", property: "fill", value: "#0f172a" })
    .editGraphics({ target: "chartTitle", property: "fontSize", value: 22 })
    .editGraphics({ target: "chartTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "chartTitle", property: "fontWeight", value: 700 })
    .editGraphics({ target: "chartTitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "chartTitle", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "chartSubtitle", parent: "canvas", type: "text" })
    .editGraphics({ target: "chartSubtitle", property: "x", value: values.title.x })
    .editGraphics({ target: "chartSubtitle", property: "y", value: 51 })
    .editGraphics({
      target: "chartSubtitle",
      property: "text",
      value: values.title.subtitle
    })
    .editGraphics({ target: "chartSubtitle", property: "fill", value: "#64748b" })
    .editGraphics({ target: "chartSubtitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "chartSubtitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "chartSubtitle", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "chartSubtitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "chartSubtitle", property: "textBaseline", value: "middle" });

  return Object.freeze({ program, values });
}

export function createGapminderHorizonPrimitives(gapminder) {
  return createGapminderHorizonPrimitiveResult(gapminder).program;
}
