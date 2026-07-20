import { chart } from "../../../src/index.js";

import {
  PARALLEL_COLORS,
  createCarsParallelValues
} from "./reference-values.js";

export function createCarsParallelPrimitiveResult(cars) {
  const values = createCarsParallelValues(cars);
  const { axes, bounds, layout, paths } = values;
  const tickValues = axes.flatMap(axis => axis.labels.map(label => ({
    x: axis.x,
    y: label.y,
    text: label.text
  })));
  const legend = Object.entries(PARALLEL_COLORS).map(([label, color], index) => ({
    color,
    label,
    y: 162 + index * 28
  }));
  const program = chart()
    .createCanvas({
      width: layout.width,
      height: layout.height,
      margin: layout.margin,
      background: "white"
    })
    .createData({ id: "cars1970", values: values.rows })
    .createGraphics({
      id: "parallelLines",
      parent: "plot-main",
      type: "path",
      length: paths.length
    })
    .editGraphics({
      target: "parallelLines",
      property: "commands",
      value: paths.map(path => path.commands)
    })
    .editGraphics({
      target: "parallelLines",
      property: "stroke",
      value: paths.map(path => path.stroke)
    })
    .editGraphics({
      target: "parallelLines",
      property: "strokeWidth",
      value: 1.25
    })
    .editGraphics({
      target: "parallelLines",
      property: "opacity",
      value: 0.48
    })
    .createGraphics({
      id: "parallelAxisLines",
      parent: "plot-main",
      type: "line",
      length: axes.length
    })
    .editGraphics({
      target: "parallelAxisLines",
      property: "x1",
      value: axes.map(axis => axis.x)
    })
    .editGraphics({
      target: "parallelAxisLines",
      property: "y1",
      value: bounds.top
    })
    .editGraphics({
      target: "parallelAxisLines",
      property: "x2",
      value: axes.map(axis => axis.x)
    })
    .editGraphics({
      target: "parallelAxisLines",
      property: "y2",
      value: bounds.bottom
    })
    .editGraphics({
      target: "parallelAxisLines",
      property: "stroke",
      value: "#475569"
    })
    .editGraphics({
      target: "parallelAxisLines",
      property: "strokeWidth",
      value: 1.25
    })
    .createGraphics({
      id: "parallelAxisTicks",
      parent: "plot-main",
      type: "line",
      length: tickValues.length
    })
    .editGraphics({
      target: "parallelAxisTicks",
      property: "x1",
      value: tickValues.map(tick => tick.x - 4)
    })
    .editGraphics({
      target: "parallelAxisTicks",
      property: "y1",
      value: tickValues.map(tick => tick.y)
    })
    .editGraphics({
      target: "parallelAxisTicks",
      property: "x2",
      value: tickValues.map(tick => tick.x + 4)
    })
    .editGraphics({
      target: "parallelAxisTicks",
      property: "y2",
      value: tickValues.map(tick => tick.y)
    })
    .editGraphics({
      target: "parallelAxisTicks",
      property: "stroke",
      value: "#64748b"
    })
    .editGraphics({
      target: "parallelAxisTicks",
      property: "strokeWidth",
      value: 1
    })
    .createGraphics({
      id: "parallelAxisLabels",
      parent: "plot-main",
      type: "text",
      length: tickValues.length
    })
    .editGraphics({
      target: "parallelAxisLabels",
      property: "x",
      value: tickValues.map(tick => tick.x - 9)
    })
    .editGraphics({
      target: "parallelAxisLabels",
      property: "y",
      value: tickValues.map(tick => tick.y)
    })
    .editGraphics({
      target: "parallelAxisLabels",
      property: "text",
      value: tickValues.map(tick => tick.text)
    })
    .editGraphics({
      target: "parallelAxisLabels",
      property: "fill",
      value: "#475569"
    })
    .editGraphics({
      target: "parallelAxisLabels",
      property: "fontSize",
      value: 11
    })
    .editGraphics({
      target: "parallelAxisLabels",
      property: "fontFamily",
      value: "sans-serif"
    })
    .editGraphics({
      target: "parallelAxisLabels",
      property: "fontWeight",
      value: "normal"
    })
    .editGraphics({
      target: "parallelAxisLabels",
      property: "textAlign",
      value: "right"
    })
    .editGraphics({
      target: "parallelAxisLabels",
      property: "textBaseline",
      value: "middle"
    })
    .createGraphics({
      id: "parallelAxisTitles",
      parent: "plot-main",
      type: "text",
      length: axes.length
    })
    .editGraphics({
      target: "parallelAxisTitles",
      property: "x",
      value: axes.map(axis => axis.x)
    })
    .editGraphics({
      target: "parallelAxisTitles",
      property: "y",
      value: bounds.top - 20
    })
    .editGraphics({
      target: "parallelAxisTitles",
      property: "text",
      value: axes.map(axis => axis.title)
    })
    .editGraphics({
      target: "parallelAxisTitles",
      property: "fill",
      value: "#1e293b"
    })
    .editGraphics({
      target: "parallelAxisTitles",
      property: "fontSize",
      value: 13
    })
    .editGraphics({
      target: "parallelAxisTitles",
      property: "fontFamily",
      value: "sans-serif"
    })
    .editGraphics({
      target: "parallelAxisTitles",
      property: "fontWeight",
      value: 600
    })
    .editGraphics({
      target: "parallelAxisTitles",
      property: "textAlign",
      value: "center"
    })
    .editGraphics({
      target: "parallelAxisTitles",
      property: "textBaseline",
      value: "middle"
    })
    .createGraphics({ id: "originLegendTitle", parent: "canvas", type: "text" })
    .editGraphics({ target: "originLegendTitle", property: "x", value: 742 })
    .editGraphics({ target: "originLegendTitle", property: "y", value: 130 })
    .editGraphics({ target: "originLegendTitle", property: "text", value: "Origin" })
    .editGraphics({ target: "originLegendTitle", property: "fill", value: "#1e293b" })
    .editGraphics({ target: "originLegendTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "originLegendTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "originLegendTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "originLegendTitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "originLegendTitle", property: "textBaseline", value: "middle" })
    .createGraphics({
      id: "originLegendSymbols",
      parent: "canvas",
      type: "line",
      length: legend.length
    })
    .editGraphics({ target: "originLegendSymbols", property: "x1", value: 742 })
    .editGraphics({ target: "originLegendSymbols", property: "y1", value: legend.map(item => item.y) })
    .editGraphics({ target: "originLegendSymbols", property: "x2", value: 766 })
    .editGraphics({ target: "originLegendSymbols", property: "y2", value: legend.map(item => item.y) })
    .editGraphics({ target: "originLegendSymbols", property: "stroke", value: legend.map(item => item.color) })
    .editGraphics({ target: "originLegendSymbols", property: "strokeWidth", value: 3 })
    .createGraphics({
      id: "originLegendLabels",
      parent: "canvas",
      type: "text",
      length: legend.length
    })
    .editGraphics({ target: "originLegendLabels", property: "x", value: 776 })
    .editGraphics({ target: "originLegendLabels", property: "y", value: legend.map(item => item.y) })
    .editGraphics({ target: "originLegendLabels", property: "text", value: legend.map(item => item.label) })
    .editGraphics({ target: "originLegendLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "originLegendLabels", property: "fontSize", value: 12 })
    .editGraphics({ target: "originLegendLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "originLegendLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "originLegendLabels", property: "textAlign", value: "left" })
    .editGraphics({ target: "originLegendLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "chartTitle", parent: "canvas", type: "text" })
    .editGraphics({ target: "chartTitle", property: "x", value: values.title.x })
    .editGraphics({ target: "chartTitle", property: "y", value: 28 })
    .editGraphics({ target: "chartTitle", property: "text", value: values.title.text })
    .editGraphics({ target: "chartTitle", property: "fill", value: "#0f172a" })
    .editGraphics({ target: "chartTitle", property: "fontSize", value: 22 })
    .editGraphics({ target: "chartTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "chartTitle", property: "fontWeight", value: 700 })
    .editGraphics({ target: "chartTitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "chartTitle", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "chartSubtitle", parent: "canvas", type: "text" })
    .editGraphics({ target: "chartSubtitle", property: "x", value: values.title.x })
    .editGraphics({ target: "chartSubtitle", property: "y", value: 55 })
    .editGraphics({ target: "chartSubtitle", property: "text", value: values.title.subtitle })
    .editGraphics({ target: "chartSubtitle", property: "fill", value: "#64748b" })
    .editGraphics({ target: "chartSubtitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "chartSubtitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "chartSubtitle", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "chartSubtitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "chartSubtitle", property: "textBaseline", value: "middle" });

  return Object.freeze({ program, values });
}

export function createCarsParallelPrimitives(cars) {
  return createCarsParallelPrimitiveResult(cars).program;
}
