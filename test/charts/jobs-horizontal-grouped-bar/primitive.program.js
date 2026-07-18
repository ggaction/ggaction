import { chart } from "../../../src/index.js";

import { createHorizontalGroupedBarValues } from "./reference-values.js";

export function createHorizontalGroupedBarPrimitives(rows) {
  const values = createHorizontalGroupedBarValues(rows);
  const { x: xAxis, y: yAxis } = values.axes;
  const xPositions = xAxis.ticks.map(tick => tick.position);
  const yPositions = yAxis.ticks.map(tick => tick.position);
  const legendItems = values.legend.items;

  return chart()
    .createGraphics({ id: "canvas", type: "canvas" })
    .editGraphics({ target: "canvas", property: "width", value: values.width })
    .editGraphics({ target: "canvas", property: "height", value: values.height })
    .editGraphics({ target: "canvas", property: "background", value: "white" })
    .createGraphics({ id: "plot-main", parent: "canvas", type: "collection" })
    .createGraphics({
      id: "verticalGridLines",
      parent: "plot-main",
      type: "line",
      length: values.grid.length
    })
    .editGraphics({
      target: "verticalGridLines",
      property: "x1",
      value: values.grid.map(line => line.x1)
    })
    .editGraphics({
      target: "verticalGridLines",
      property: "y1",
      value: values.grid.map(line => line.y1)
    })
    .editGraphics({
      target: "verticalGridLines",
      property: "x2",
      value: values.grid.map(line => line.x2)
    })
    .editGraphics({
      target: "verticalGridLines",
      property: "y2",
      value: values.grid.map(line => line.y2)
    })
    .editGraphics({ target: "verticalGridLines", property: "stroke", value: "#e2e8f0" })
    .editGraphics({ target: "verticalGridLines", property: "strokeWidth", value: 1 })
    .editGraphics({
      target: "verticalGridLines",
      property: "strokeDash",
      value: values.grid.map(() => [])
    })
    .createGraphics({
      id: "bar",
      parent: "plot-main",
      type: "rect",
      length: values.rects.length
    })
    .editGraphics({ target: "bar", property: "x", value: values.rects.map(rect => rect.x) })
    .editGraphics({ target: "bar", property: "y", value: values.rects.map(rect => rect.y) })
    .editGraphics({ target: "bar", property: "width", value: values.rects.map(rect => rect.width) })
    .editGraphics({ target: "bar", property: "height", value: values.rects.map(rect => rect.height) })
    .editGraphics({ target: "bar", property: "fill", value: values.rects.map(rect => rect.fill) })
    .editGraphics({ target: "bar", property: "stroke", value: "white" })
    .editGraphics({ target: "bar", property: "strokeWidth", value: 0.5 })
    .createGraphics({ id: "xAxisLine", parent: "plot-main", type: "line" })
    .editGraphics({ target: "xAxisLine", property: "x1", value: xAxis.line.x1 })
    .editGraphics({ target: "xAxisLine", property: "y1", value: xAxis.line.y1 })
    .editGraphics({ target: "xAxisLine", property: "x2", value: xAxis.line.x2 })
    .editGraphics({ target: "xAxisLine", property: "y2", value: xAxis.line.y2 })
    .editGraphics({ target: "xAxisLine", property: "stroke", value: "#334155" })
    .editGraphics({ target: "xAxisLine", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "xAxisTicks", parent: "plot-main", type: "line", length: xPositions.length })
    .editGraphics({ target: "xAxisTicks", property: "x1", value: xPositions })
    .editGraphics({ target: "xAxisTicks", property: "y1", value: xPositions.map(() => xAxis.line.y1) })
    .editGraphics({ target: "xAxisTicks", property: "x2", value: xPositions })
    .editGraphics({ target: "xAxisTicks", property: "y2", value: xPositions.map(() => xAxis.line.y1 + 6) })
    .editGraphics({ target: "xAxisTicks", property: "stroke", value: "#64748b" })
    .editGraphics({ target: "xAxisTicks", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "xAxisLabels", parent: "plot-main", type: "text", length: xPositions.length })
    .editGraphics({ target: "xAxisLabels", property: "x", value: xPositions })
    .editGraphics({ target: "xAxisLabels", property: "y", value: xPositions.map(() => xAxis.line.y1 + 18) })
    .editGraphics({ target: "xAxisLabels", property: "text", value: xAxis.ticks.map(tick => tick.label) })
    .editGraphics({ target: "xAxisLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "xAxisLabels", property: "fontSize", value: 12 })
    .editGraphics({ target: "xAxisLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "xAxisLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "xAxisLabels", property: "textAlign", value: "center" })
    .editGraphics({ target: "xAxisLabels", property: "textBaseline", value: "top" })
    .createGraphics({ id: "xAxisTitle", parent: "plot-main", type: "text" })
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
    .createGraphics({ id: "yAxisLine", parent: "plot-main", type: "line" })
    .editGraphics({ target: "yAxisLine", property: "x1", value: yAxis.line.x1 })
    .editGraphics({ target: "yAxisLine", property: "y1", value: yAxis.line.y1 })
    .editGraphics({ target: "yAxisLine", property: "x2", value: yAxis.line.x2 })
    .editGraphics({ target: "yAxisLine", property: "y2", value: yAxis.line.y2 })
    .editGraphics({ target: "yAxisLine", property: "stroke", value: "#334155" })
    .editGraphics({ target: "yAxisLine", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "yAxisTicks", parent: "plot-main", type: "line", length: yPositions.length })
    .editGraphics({ target: "yAxisTicks", property: "x1", value: yPositions.map(() => yAxis.line.x1 - 6) })
    .editGraphics({ target: "yAxisTicks", property: "y1", value: yPositions })
    .editGraphics({ target: "yAxisTicks", property: "x2", value: yPositions.map(() => yAxis.line.x1) })
    .editGraphics({ target: "yAxisTicks", property: "y2", value: yPositions })
    .editGraphics({ target: "yAxisTicks", property: "stroke", value: "#64748b" })
    .editGraphics({ target: "yAxisTicks", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "yAxisLabels", parent: "plot-main", type: "text", length: yPositions.length })
    .editGraphics({ target: "yAxisLabels", property: "x", value: yPositions.map(() => yAxis.line.x1 - 12) })
    .editGraphics({ target: "yAxisLabels", property: "y", value: yPositions })
    .editGraphics({ target: "yAxisLabels", property: "text", value: yAxis.ticks.map(tick => tick.label) })
    .editGraphics({ target: "yAxisLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "yAxisLabels", property: "fontSize", value: 12 })
    .editGraphics({ target: "yAxisLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "yAxisLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "yAxisLabels", property: "textAlign", value: "right" })
    .editGraphics({ target: "yAxisLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "yAxisTitle", parent: "plot-main", type: "text" })
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
    .createGraphics({ id: "colorLegendSymbols", parent: "canvas", type: "rect", length: legendItems.length })
    .editGraphics({ target: "colorLegendSymbols", property: "x", value: legendItems.map(item => item.x) })
    .editGraphics({ target: "colorLegendSymbols", property: "y", value: legendItems.map(item => item.y) })
    .editGraphics({ target: "colorLegendSymbols", property: "width", value: legendItems.map(item => item.width) })
    .editGraphics({ target: "colorLegendSymbols", property: "height", value: legendItems.map(item => item.height) })
    .editGraphics({ target: "colorLegendSymbols", property: "fill", value: legendItems.map(item => item.color) })
    .editGraphics({ target: "colorLegendSymbols", property: "stroke", value: "white" })
    .editGraphics({ target: "colorLegendSymbols", property: "strokeWidth", value: 0.5 })
    .createGraphics({ id: "colorLegendLabels", parent: "canvas", type: "text", length: legendItems.length })
    .editGraphics({ target: "colorLegendLabels", property: "x", value: legendItems.map(item => item.labelX) })
    .editGraphics({ target: "colorLegendLabels", property: "y", value: legendItems.map(item => item.labelY) })
    .editGraphics({ target: "colorLegendLabels", property: "text", value: legendItems.map(item => item.label) })
    .editGraphics({ target: "colorLegendLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "colorLegendLabels", property: "fontSize", value: 12 })
    .editGraphics({ target: "colorLegendLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "colorLegendLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "colorLegendLabels", property: "textAlign", value: "left" })
    .editGraphics({ target: "colorLegendLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "colorLegendTitle", parent: "canvas", type: "text" })
    .editGraphics({ target: "colorLegendTitle", property: "x", value: values.legend.title.x })
    .editGraphics({ target: "colorLegendTitle", property: "y", value: values.legend.title.y })
    .editGraphics({ target: "colorLegendTitle", property: "text", value: values.legend.title.text })
    .editGraphics({ target: "colorLegendTitle", property: "fill", value: "#334155" })
    .editGraphics({ target: "colorLegendTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "colorLegendTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "colorLegendTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "colorLegendTitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "colorLegendTitle", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "chartTitle", parent: "canvas", type: "text" })
    .editGraphics({ target: "chartTitle", property: "x", value: values.title.x })
    .editGraphics({ target: "chartTitle", property: "y", value: values.title.y })
    .editGraphics({ target: "chartTitle", property: "text", value: values.title.text })
    .editGraphics({ target: "chartTitle", property: "fill", value: "#0f172a" })
    .editGraphics({ target: "chartTitle", property: "fontSize", value: 20 })
    .editGraphics({ target: "chartTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "chartTitle", property: "fontWeight", value: 700 })
    .editGraphics({ target: "chartTitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "chartTitle", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "chartSubtitle", parent: "canvas", type: "text" })
    .editGraphics({ target: "chartSubtitle", property: "x", value: values.title.x })
    .editGraphics({ target: "chartSubtitle", property: "y", value: values.title.subtitleY })
    .editGraphics({ target: "chartSubtitle", property: "text", value: values.title.subtitle })
    .editGraphics({ target: "chartSubtitle", property: "fill", value: "#475569" })
    .editGraphics({ target: "chartSubtitle", property: "fontSize", value: 12 })
    .editGraphics({ target: "chartSubtitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "chartSubtitle", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "chartSubtitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "chartSubtitle", property: "textBaseline", value: "middle" });
}
