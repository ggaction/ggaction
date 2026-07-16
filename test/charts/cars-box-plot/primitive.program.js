import { chart } from "../../../src/index.js";
import {
  BOX_PLOT_FIELDS,
  BOX_PLOT_LAYOUT,
  BOX_PLOT_STYLE,
  createCarsBoxPlotReferenceValues
} from "./reference-values.js";

function repeated(length, value) {
  return Array.from({ length }, () => value);
}

export function createCarsBoxPlotPrimitives(cars, options = {}) {
  const factor = options.factor ?? 1.5;
  const values = options.values ?? createCarsBoxPlotReferenceValues(cars, { factor });
  const color = options.color !== false;
  const outliers = options.outliers !== false;
  const box = options.box ?? {};
  const median = options.median ?? {};
  const { x: xAxis, y: yAxis } = values.axes;
  const xPositions = xAxis.ticks.map(tick => tick.position);
  const yPositions = yAxis.ticks.map(tick => tick.position);

  let program = chart()
    .createCanvas({
      width: BOX_PLOT_LAYOUT.width,
      height: BOX_PLOT_LAYOUT.height,
      margin: BOX_PLOT_LAYOUT.margin
    })
    .createData({ id: "data", values: cars })
    .editSemantic({ property: "dataset[boxPlotSummaryData].source", value: "data" })
    .editSemantic({
      property: "dataset[boxPlotSummaryData].transform",
      value: [{
        type: "boxSummary",
        category: "Origin",
        field: "Miles_per_Gallon",
        method: "linear",
        factor,
        as: BOX_PLOT_FIELDS
      }]
    })
    .editSemantic({ property: "dataset[boxPlotSummaryData].values", value: values.summaries });

  if (outliers) {
    program = program
    .editSemantic({ property: "dataset[boxPlotOutlierData].source", value: "data" })
    .editSemantic({
      property: "dataset[boxPlotOutlierData].transform",
      value: [{
        type: "boxOutlier",
        category: "Origin",
        field: "Miles_per_Gallon",
        method: "linear",
        factor,
        as: BOX_PLOT_FIELDS
      }]
    })
    .editSemantic({ property: "dataset[boxPlotOutlierData].values", value: values.outliers });
  }

  program = program
    .editSemantic({ property: "coordinate[main].type", value: "cartesian" })
    .editSemantic({ property: "scale[x].type", value: "ordinal" })
    .editSemantic({ property: "scale[x].domain", value: "auto" })
    .editSemantic({ property: "scale[x].range", value: "auto" })
    .editSemantic({ property: "scale[y].type", value: "linear" })
    .editSemantic({ property: "scale[y].domain", value: "auto" })
    .editSemantic({ property: "scale[y].range", value: "auto" })
    .editSemantic({ property: "scale[y].nice", value: true })
    .editSemantic({ property: "scale[y].zero", value: false });

  if (color) {
    program = program
      .editSemantic({ property: "scale[color].type", value: "ordinal" })
      .editSemantic({ property: "scale[color].domain", value: "auto" })
      .editSemantic({ property: "scale[color].range", value: { palette: "tableau10" } });
  }

  program = program
    .editSemantic({ property: "guide.axis.x.scale", value: "x" })
    .editSemantic({ property: "guide.axis.x.coordinate", value: "main" })
    .editSemantic({ property: "guide.axis.x.title", value: "Origin" })
    .editSemantic({ property: "guide.axis.y.scale", value: "y" })
    .editSemantic({ property: "guide.axis.y.coordinate", value: "main" })
    .editSemantic({ property: "guide.axis.y.title", value: "Miles_per_Gallon" })
    .editSemantic({ property: "guide.grid.horizontal.scale", value: "y" })
    .editSemantic({ property: "guide.grid.horizontal.coordinate", value: "main" })
    .createGraphics({
      id: "horizontalGridLines",
      type: "line",
      length: values.horizontalGrid.length
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "x1",
      value: values.horizontalGrid.map(rule => rule.x1)
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "y1",
      value: values.horizontalGrid.map(rule => rule.y1)
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "x2",
      value: values.horizontalGrid.map(rule => rule.x2)
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "y2",
      value: values.horizontalGrid.map(rule => rule.y2)
    })
    .editGraphics({ target: "horizontalGridLines", property: "stroke", value: "#e2e8f0" })
    .editGraphics({ target: "horizontalGridLines", property: "strokeWidth", value: 1 })
    .editGraphics({
      target: "horizontalGridLines",
      property: "strokeDash",
      value: repeated(values.horizontalGrid.length, [])
    })
    .editSemantic({ property: "layer[boxPlot].mark.type", value: "bar" })
    .editSemantic({ property: "layer[boxPlot].data", value: "boxPlotSummaryData" })
    .editSemantic({ property: "layer[boxPlot].coordinate", value: "main" })
    .editSemantic({ property: "layer[boxPlot].encoding.x.field", value: "Origin" })
    .editSemantic({ property: "layer[boxPlot].encoding.x.fieldType", value: "nominal" })
    .editSemantic({ property: "layer[boxPlot].encoding.x.scale", value: "x" })
    .editSemantic({ property: "layer[boxPlot].encoding.y.field", value: BOX_PLOT_FIELDS.q1 })
    .editSemantic({ property: "layer[boxPlot].encoding.y.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[boxPlot].encoding.y.scale", value: "y" })
    .editSemantic({ property: "layer[boxPlot].encoding.y.title", value: "Miles_per_Gallon" })
    .editSemantic({ property: "layer[boxPlot].encoding.y2.field", value: BOX_PLOT_FIELDS.q3 })
    .editSemantic({ property: "layer[boxPlot].encoding.y2.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[boxPlot].encoding.y2.scale", value: "y" });

  if (color) {
    program = program
      .editSemantic({ property: "layer[boxPlot].encoding.color.field", value: "Origin" })
      .editSemantic({ property: "layer[boxPlot].encoding.color.fieldType", value: "nominal" })
      .editSemantic({ property: "layer[boxPlot].encoding.color.scale", value: "color" })
      .editSemantic({ property: "layer[boxPlot].encoding.color.layout", value: "overlay" });
  }

  program = program
    .editSemantic({ property: "layer[boxPlotWhisker].mark.type", value: "rule" })
    .editSemantic({ property: "layer[boxPlotWhisker].data", value: "boxPlotSummaryData" })
    .editSemantic({ property: "layer[boxPlotWhisker].coordinate", value: "main" })
    .editSemantic({ property: "layer[boxPlotWhisker].encoding.x.field", value: "Origin" })
    .editSemantic({ property: "layer[boxPlotWhisker].encoding.x.fieldType", value: "nominal" })
    .editSemantic({ property: "layer[boxPlotWhisker].encoding.x.scale", value: "x" })
    .editSemantic({
      property: "layer[boxPlotWhisker].encoding.y.field",
      value: BOX_PLOT_FIELDS.lowerWhisker
    })
    .editSemantic({ property: "layer[boxPlotWhisker].encoding.y.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[boxPlotWhisker].encoding.y.scale", value: "y" })
    .editSemantic({ property: "layer[boxPlotWhisker].encoding.y.title", value: "Miles_per_Gallon" })
    .editSemantic({
      property: "layer[boxPlotWhisker].encoding.y2.field",
      value: BOX_PLOT_FIELDS.upperWhisker
    })
    .editSemantic({ property: "layer[boxPlotWhisker].encoding.y2.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[boxPlotWhisker].encoding.y2.scale", value: "y" })
    .editSemantic({ property: "layer[boxPlotWhisker].encoding.strokeDash.datum", value: "solid" })
    .createGraphics({ id: "boxPlotWhisker", type: "line", length: values.whiskers.length })
    .editGraphics({ target: "boxPlotWhisker", property: "x1", value: values.whiskers.map(rule => rule.x1) })
    .editGraphics({ target: "boxPlotWhisker", property: "y1", value: values.whiskers.map(rule => rule.y1) })
    .editGraphics({ target: "boxPlotWhisker", property: "x2", value: values.whiskers.map(rule => rule.x2) })
    .editGraphics({ target: "boxPlotWhisker", property: "y2", value: values.whiskers.map(rule => rule.y2) })
    .editGraphics({ target: "boxPlotWhisker", property: "stroke", value: BOX_PLOT_STYLE.whiskerStroke })
    .editGraphics({ target: "boxPlotWhisker", property: "strokeWidth", value: BOX_PLOT_STYLE.whiskerStrokeWidth })
    .editGraphics({ target: "boxPlotWhisker", property: "strokeDash", value: repeated(values.whiskers.length, []) })
    .editGraphics({ target: "boxPlotWhisker", property: "opacity", value: 1 })
    .editSemantic({ property: "layer[boxPlotWhiskerLowerCap].mark.type", value: "rule" })
    .editSemantic({ property: "layer[boxPlotWhiskerLowerCap].data", value: "boxPlotSummaryData" })
    .editSemantic({ property: "layer[boxPlotWhiskerLowerCap].coordinate", value: "main" })
    .editSemantic({ property: "layer[boxPlotWhiskerLowerCap].encoding.x.field", value: "Origin" })
    .editSemantic({ property: "layer[boxPlotWhiskerLowerCap].encoding.x.fieldType", value: "nominal" })
    .editSemantic({ property: "layer[boxPlotWhiskerLowerCap].encoding.x.scale", value: "x" })
    .editSemantic({
      property: "layer[boxPlotWhiskerLowerCap].encoding.y.field",
      value: BOX_PLOT_FIELDS.lowerWhisker
    })
    .editSemantic({ property: "layer[boxPlotWhiskerLowerCap].encoding.y.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[boxPlotWhiskerLowerCap].encoding.y.scale", value: "y" })
    .editSemantic({ property: "layer[boxPlotWhiskerLowerCap].encoding.strokeDash.datum", value: "solid" })
    .createGraphics({ id: "boxPlotWhiskerLowerCap", type: "line", length: values.lowerCaps.length })
    .editGraphics({ target: "boxPlotWhiskerLowerCap", property: "x1", value: values.lowerCaps.map(rule => rule.x1) })
    .editGraphics({ target: "boxPlotWhiskerLowerCap", property: "y1", value: values.lowerCaps.map(rule => rule.y1) })
    .editGraphics({ target: "boxPlotWhiskerLowerCap", property: "x2", value: values.lowerCaps.map(rule => rule.x2) })
    .editGraphics({ target: "boxPlotWhiskerLowerCap", property: "y2", value: values.lowerCaps.map(rule => rule.y2) })
    .editGraphics({ target: "boxPlotWhiskerLowerCap", property: "stroke", value: BOX_PLOT_STYLE.whiskerStroke })
    .editGraphics({ target: "boxPlotWhiskerLowerCap", property: "strokeWidth", value: BOX_PLOT_STYLE.whiskerStrokeWidth })
    .editGraphics({ target: "boxPlotWhiskerLowerCap", property: "strokeDash", value: repeated(values.lowerCaps.length, []) })
    .editGraphics({ target: "boxPlotWhiskerLowerCap", property: "opacity", value: 1 })
    .editSemantic({ property: "layer[boxPlotWhiskerUpperCap].mark.type", value: "rule" })
    .editSemantic({ property: "layer[boxPlotWhiskerUpperCap].data", value: "boxPlotSummaryData" })
    .editSemantic({ property: "layer[boxPlotWhiskerUpperCap].coordinate", value: "main" })
    .editSemantic({ property: "layer[boxPlotWhiskerUpperCap].encoding.x.field", value: "Origin" })
    .editSemantic({ property: "layer[boxPlotWhiskerUpperCap].encoding.x.fieldType", value: "nominal" })
    .editSemantic({ property: "layer[boxPlotWhiskerUpperCap].encoding.x.scale", value: "x" })
    .editSemantic({
      property: "layer[boxPlotWhiskerUpperCap].encoding.y.field",
      value: BOX_PLOT_FIELDS.upperWhisker
    })
    .editSemantic({ property: "layer[boxPlotWhiskerUpperCap].encoding.y.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[boxPlotWhiskerUpperCap].encoding.y.scale", value: "y" })
    .editSemantic({ property: "layer[boxPlotWhiskerUpperCap].encoding.strokeDash.datum", value: "solid" })
    .createGraphics({ id: "boxPlotWhiskerUpperCap", type: "line", length: values.upperCaps.length })
    .editGraphics({ target: "boxPlotWhiskerUpperCap", property: "x1", value: values.upperCaps.map(rule => rule.x1) })
    .editGraphics({ target: "boxPlotWhiskerUpperCap", property: "y1", value: values.upperCaps.map(rule => rule.y1) })
    .editGraphics({ target: "boxPlotWhiskerUpperCap", property: "x2", value: values.upperCaps.map(rule => rule.x2) })
    .editGraphics({ target: "boxPlotWhiskerUpperCap", property: "y2", value: values.upperCaps.map(rule => rule.y2) })
    .editGraphics({ target: "boxPlotWhiskerUpperCap", property: "stroke", value: BOX_PLOT_STYLE.whiskerStroke })
    .editGraphics({ target: "boxPlotWhiskerUpperCap", property: "strokeWidth", value: BOX_PLOT_STYLE.whiskerStrokeWidth })
    .editGraphics({ target: "boxPlotWhiskerUpperCap", property: "strokeDash", value: repeated(values.upperCaps.length, []) })
    .editGraphics({ target: "boxPlotWhiskerUpperCap", property: "opacity", value: 1 })
    .createGraphics({ id: "boxPlot", type: "rect", length: values.boxes.length })
    .editGraphics({ target: "boxPlot", property: "x", value: values.boxes.map(box => box.x) })
    .editGraphics({ target: "boxPlot", property: "y", value: values.boxes.map(box => box.y) })
    .editGraphics({ target: "boxPlot", property: "width", value: values.boxes.map(box => box.width) })
    .editGraphics({ target: "boxPlot", property: "height", value: values.boxes.map(box => box.height) })
    .editGraphics({ target: "boxPlot", property: "fill", value: box.fill ?? values.boxColors })
    .editGraphics({ target: "boxPlot", property: "opacity", value: box.opacity ?? BOX_PLOT_STYLE.boxOpacity })
    .editGraphics({ target: "boxPlot", property: "stroke", value: box.stroke ?? values.boxColors })
    .editGraphics({
      target: "boxPlot",
      property: "strokeWidth",
      value: box.strokeWidth ?? BOX_PLOT_STYLE.boxStrokeWidth
    })
    .editSemantic({ property: "layer[boxPlotMedian].mark.type", value: "rule" })
    .editSemantic({ property: "layer[boxPlotMedian].data", value: "boxPlotSummaryData" })
    .editSemantic({ property: "layer[boxPlotMedian].coordinate", value: "main" })
    .editSemantic({ property: "layer[boxPlotMedian].encoding.x.field", value: "Origin" })
    .editSemantic({ property: "layer[boxPlotMedian].encoding.x.fieldType", value: "nominal" })
    .editSemantic({ property: "layer[boxPlotMedian].encoding.x.scale", value: "x" })
    .editSemantic({ property: "layer[boxPlotMedian].encoding.y.field", value: BOX_PLOT_FIELDS.median })
    .editSemantic({ property: "layer[boxPlotMedian].encoding.y.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[boxPlotMedian].encoding.y.scale", value: "y" })
    .createGraphics({ id: "boxPlotMedian", type: "line", length: values.medians.length })
    .editGraphics({ target: "boxPlotMedian", property: "x1", value: values.medians.map(rule => rule.x1) })
    .editGraphics({ target: "boxPlotMedian", property: "y1", value: values.medians.map(rule => rule.y1) })
    .editGraphics({ target: "boxPlotMedian", property: "x2", value: values.medians.map(rule => rule.x2) })
    .editGraphics({ target: "boxPlotMedian", property: "y2", value: values.medians.map(rule => rule.y2) })
    .editGraphics({
      target: "boxPlotMedian",
      property: "stroke",
      value: median.stroke ?? BOX_PLOT_STYLE.medianStroke
    })
    .editGraphics({
      target: "boxPlotMedian",
      property: "strokeWidth",
      value: median.strokeWidth ?? BOX_PLOT_STYLE.medianStrokeWidth
    })
    .editGraphics({ target: "boxPlotMedian", property: "strokeDash", value: repeated(values.medians.length, []) })
    .editGraphics({ target: "boxPlotMedian", property: "opacity", value: 1 });

  if (outliers) {
    program = program
    .editSemantic({ property: "layer[boxPlotOutliers].mark.type", value: "point" })
    .editSemantic({ property: "layer[boxPlotOutliers].data", value: "boxPlotOutlierData" })
    .editSemantic({ property: "layer[boxPlotOutliers].coordinate", value: "main" })
    .editSemantic({ property: "layer[boxPlotOutliers].encoding.x.field", value: "Origin" })
    .editSemantic({ property: "layer[boxPlotOutliers].encoding.x.fieldType", value: "nominal" })
    .editSemantic({ property: "layer[boxPlotOutliers].encoding.x.scale", value: "x" })
    .editSemantic({ property: "layer[boxPlotOutliers].encoding.y.field", value: "Miles_per_Gallon" })
    .editSemantic({ property: "layer[boxPlotOutliers].encoding.y.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[boxPlotOutliers].encoding.y.scale", value: "y" })
    .createGraphics({ id: "boxPlotOutliers", type: "collection" })
    .editGraphics({ target: "boxPlotOutliers", property: "children", value: values.outlierGraphics });
  }

  return program
    .createGraphics({ id: "xAxisLine", type: "line" })
    .editGraphics({ target: "xAxisLine", property: "x1", value: xAxis.line.x1 })
    .editGraphics({ target: "xAxisLine", property: "y1", value: xAxis.line.y1 })
    .editGraphics({ target: "xAxisLine", property: "x2", value: xAxis.line.x2 })
    .editGraphics({ target: "xAxisLine", property: "y2", value: xAxis.line.y2 })
    .editGraphics({ target: "xAxisLine", property: "stroke", value: "#334155" })
    .editGraphics({ target: "xAxisLine", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "xAxisTicks", type: "line", length: xAxis.ticks.length })
    .editGraphics({ target: "xAxisTicks", property: "x1", value: xPositions })
    .editGraphics({ target: "xAxisTicks", property: "y1", value: xAxis.line.y1 })
    .editGraphics({ target: "xAxisTicks", property: "x2", value: xPositions })
    .editGraphics({ target: "xAxisTicks", property: "y2", value: xAxis.line.y1 + 6 })
    .editGraphics({ target: "xAxisTicks", property: "stroke", value: "#64748b" })
    .editGraphics({ target: "xAxisTicks", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "xAxisLabels", type: "text", length: xAxis.ticks.length })
    .editGraphics({ target: "xAxisLabels", property: "x", value: xPositions })
    .editGraphics({ target: "xAxisLabels", property: "y", value: xAxis.line.y1 + 18 })
    .editGraphics({ target: "xAxisLabels", property: "text", value: xAxis.ticks.map(tick => tick.label) })
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
    .createGraphics({ id: "yAxisTicks", type: "line", length: yAxis.ticks.length })
    .editGraphics({ target: "yAxisTicks", property: "x1", value: yAxis.line.x1 - 6 })
    .editGraphics({ target: "yAxisTicks", property: "y1", value: yPositions })
    .editGraphics({ target: "yAxisTicks", property: "x2", value: yAxis.line.x1 })
    .editGraphics({ target: "yAxisTicks", property: "y2", value: yPositions })
    .editGraphics({ target: "yAxisTicks", property: "stroke", value: "#64748b" })
    .editGraphics({ target: "yAxisTicks", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "yAxisLabels", type: "text", length: yAxis.ticks.length })
    .editGraphics({ target: "yAxisLabels", property: "x", value: yAxis.line.x1 - 12 })
    .editGraphics({ target: "yAxisLabels", property: "y", value: yPositions })
    .editGraphics({ target: "yAxisLabels", property: "text", value: yAxis.ticks.map(tick => tick.label) })
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
    .createTitle({
      text: values.title.text,
      subtitle: values.title.subtitle,
      maxWidth: values.bounds.width
    });
}
