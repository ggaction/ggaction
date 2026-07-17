import { chart, render } from "../../../../../src/index.js";
import {
  ERROR_BAR_COLOR,
  ERROR_BAR_FIELDS,
  ERROR_BAR_LAYOUT,
  ENCODED_LAYER_POINT_OPACITY,
  ENCODED_LAYER_POINT_RADIUS,
  RULE_GEOMETRY_LAYOUT,
  createEncodedLayerInferenceReferenceValues,
  createErrorBarReferenceValues,
  createRuleGeometryReferenceValues
} from "../../reference-values.js";

export function createErrorBarBaselinePrimitives(cars) {
  const values = createErrorBarReferenceValues(cars);
  const { x: xAxis, y: yAxis } = values.axes;
  const lineX1 = lines => lines.map(line => line.x1);
  const lineY1 = lines => lines.map(line => line.y1);
  const lineX2 = lines => lines.map(line => line.x2);
  const lineY2 = lines => lines.map(line => line.y2);

  return chart()
    .createCanvas({
      width: ERROR_BAR_LAYOUT.width,
      height: ERROR_BAR_LAYOUT.height,
      margin: ERROR_BAR_LAYOUT.margin
    })
    .createData({ values: cars })
    .editSemantic({
      property: "dataset[errorBarIntervalData].source",
      value: "data"
    })
    .editSemantic({
      property: "dataset[errorBarIntervalData].transform",
      value: [values.transform]
    })
    .editSemantic({
      property: "dataset[errorBarIntervalData].values",
      value: values.rows
    })
    .editSemantic({ property: "coordinate[main].type", value: "cartesian" })
    .editSemantic({ property: "scale[x].type", value: "point" })
    .editSemantic({ property: "scale[x].domain", value: "auto" })
    .editSemantic({ property: "scale[x].range", value: "auto" })
    .editSemantic({ property: "scale[x].padding", value: 0.5 })
    .editSemantic({ property: "scale[x].align", value: 0.5 })
    .editSemantic({ property: "scale[y].type", value: "linear" })
    .editSemantic({ property: "scale[y].domain", value: "auto" })
    .editSemantic({ property: "scale[y].range", value: "auto" })
    .editSemantic({ property: "scale[y].nice", value: true })
    .editSemantic({ property: "scale[y].zero", value: false })
    .editSemantic({ property: "layer[errorBar].mark.type", value: "rule" })
    .editSemantic({
      property: "layer[errorBar].data",
      value: "errorBarIntervalData"
    })
    .editSemantic({ property: "layer[errorBar].coordinate", value: "main" })
    .editSemantic({
      property: "layer[errorBar].encoding.x.field",
      value: "Origin"
    })
    .editSemantic({
      property: "layer[errorBar].encoding.x.fieldType",
      value: "nominal"
    })
    .editSemantic({ property: "layer[errorBar].encoding.x.scale", value: "x" })
    .editSemantic({
      property: "layer[errorBar].encoding.y.field",
      value: ERROR_BAR_FIELDS.lower
    })
    .editSemantic({
      property: "layer[errorBar].encoding.y.fieldType",
      value: "quantitative"
    })
    .editSemantic({ property: "layer[errorBar].encoding.y.scale", value: "y" })
    .editSemantic({
      property: "layer[errorBar].encoding.y2.field",
      value: ERROR_BAR_FIELDS.upper
    })
    .editSemantic({
      property: "layer[errorBar].encoding.y2.fieldType",
      value: "quantitative"
    })
    .editSemantic({ property: "layer[errorBar].encoding.y2.scale", value: "y" })
    .editSemantic({
      property: "layer[errorBar].encoding.strokeDash.datum",
      value: "solid"
    })
    .editSemantic({
      property: "layer[errorBarLowerCap].mark.type",
      value: "rule"
    })
    .editSemantic({
      property: "layer[errorBarLowerCap].data",
      value: "errorBarIntervalData"
    })
    .editSemantic({
      property: "layer[errorBarLowerCap].coordinate",
      value: "main"
    })
    .editSemantic({
      property: "layer[errorBarLowerCap].encoding.x.field",
      value: "Origin"
    })
    .editSemantic({
      property: "layer[errorBarLowerCap].encoding.x.fieldType",
      value: "nominal"
    })
    .editSemantic({
      property: "layer[errorBarLowerCap].encoding.x.scale",
      value: "x"
    })
    .editSemantic({
      property: "layer[errorBarLowerCap].encoding.y.field",
      value: ERROR_BAR_FIELDS.lower
    })
    .editSemantic({
      property: "layer[errorBarLowerCap].encoding.y.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[errorBarLowerCap].encoding.y.scale",
      value: "y"
    })
    .editSemantic({
      property: "layer[errorBarLowerCap].encoding.strokeDash.datum",
      value: "solid"
    })
    .editSemantic({
      property: "layer[errorBarUpperCap].mark.type",
      value: "rule"
    })
    .editSemantic({
      property: "layer[errorBarUpperCap].data",
      value: "errorBarIntervalData"
    })
    .editSemantic({
      property: "layer[errorBarUpperCap].coordinate",
      value: "main"
    })
    .editSemantic({
      property: "layer[errorBarUpperCap].encoding.x.field",
      value: "Origin"
    })
    .editSemantic({
      property: "layer[errorBarUpperCap].encoding.x.fieldType",
      value: "nominal"
    })
    .editSemantic({
      property: "layer[errorBarUpperCap].encoding.x.scale",
      value: "x"
    })
    .editSemantic({
      property: "layer[errorBarUpperCap].encoding.y.field",
      value: ERROR_BAR_FIELDS.upper
    })
    .editSemantic({
      property: "layer[errorBarUpperCap].encoding.y.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[errorBarUpperCap].encoding.y.scale",
      value: "y"
    })
    .editSemantic({
      property: "layer[errorBarUpperCap].encoding.strokeDash.datum",
      value: "solid"
    })
    .editSemantic({ property: "guide.axis.x.scale", value: "x" })
    .editSemantic({ property: "guide.axis.x.coordinate", value: "main" })
    .editSemantic({ property: "guide.axis.x.title", value: "Origin" })
    .editSemantic({ property: "guide.axis.y.scale", value: "y" })
    .editSemantic({ property: "guide.axis.y.coordinate", value: "main" })
    .editSemantic({
      property: "guide.axis.y.title",
      value: "mean(Acceleration)"
    })
    .editSemantic({ property: "guide.grid.horizontal.scale", value: "y" })
    .editSemantic({
      property: "guide.grid.horizontal.coordinate",
      value: "main"
    })
    .createGraphics({
      id: "horizontalGridLines",
      parent: "plot-main",
      type: "line",
      length: values.horizontalGrid.length
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "x1",
      value: lineX1(values.horizontalGrid)
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "y1",
      value: lineY1(values.horizontalGrid)
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "x2",
      value: lineX2(values.horizontalGrid)
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "y2",
      value: lineY2(values.horizontalGrid)
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
      value: values.horizontalGrid.map(() => [])
    })
    .createGraphics({ id: "errorBar", parent: "plot-main", type: "line", length: values.mainRules.length })
    .editGraphics({ target: "errorBar", property: "x1", value: lineX1(values.mainRules) })
    .editGraphics({ target: "errorBar", property: "y1", value: lineY1(values.mainRules) })
    .editGraphics({ target: "errorBar", property: "x2", value: lineX2(values.mainRules) })
    .editGraphics({ target: "errorBar", property: "y2", value: lineY2(values.mainRules) })
    .editGraphics({ target: "errorBar", property: "stroke", value: ERROR_BAR_COLOR })
    .editGraphics({ target: "errorBar", property: "strokeWidth", value: 1.5 })
    .editGraphics({
      target: "errorBar",
      property: "strokeDash",
      value: values.mainRules.map(() => [])
    })
    .editGraphics({ target: "errorBar", property: "opacity", value: 1 })
    .createGraphics({
      id: "errorBarLowerCap",
      parent: "plot-main",
      type: "line",
      length: values.lowerCaps.length
    })
    .editGraphics({ target: "errorBarLowerCap", property: "x1", value: lineX1(values.lowerCaps) })
    .editGraphics({ target: "errorBarLowerCap", property: "y1", value: lineY1(values.lowerCaps) })
    .editGraphics({ target: "errorBarLowerCap", property: "x2", value: lineX2(values.lowerCaps) })
    .editGraphics({ target: "errorBarLowerCap", property: "y2", value: lineY2(values.lowerCaps) })
    .editGraphics({ target: "errorBarLowerCap", property: "stroke", value: ERROR_BAR_COLOR })
    .editGraphics({ target: "errorBarLowerCap", property: "strokeWidth", value: 1.5 })
    .editGraphics({
      target: "errorBarLowerCap",
      property: "strokeDash",
      value: values.lowerCaps.map(() => [])
    })
    .editGraphics({ target: "errorBarLowerCap", property: "opacity", value: 1 })
    .createGraphics({
      id: "errorBarUpperCap",
      parent: "plot-main",
      type: "line",
      length: values.upperCaps.length
    })
    .editGraphics({ target: "errorBarUpperCap", property: "x1", value: lineX1(values.upperCaps) })
    .editGraphics({ target: "errorBarUpperCap", property: "y1", value: lineY1(values.upperCaps) })
    .editGraphics({ target: "errorBarUpperCap", property: "x2", value: lineX2(values.upperCaps) })
    .editGraphics({ target: "errorBarUpperCap", property: "y2", value: lineY2(values.upperCaps) })
    .editGraphics({ target: "errorBarUpperCap", property: "stroke", value: ERROR_BAR_COLOR })
    .editGraphics({ target: "errorBarUpperCap", property: "strokeWidth", value: 1.5 })
    .editGraphics({
      target: "errorBarUpperCap",
      property: "strokeDash",
      value: values.upperCaps.map(() => [])
    })
    .editGraphics({ target: "errorBarUpperCap", property: "opacity", value: 1 })
    .createGraphics({ id: "xAxisLine", parent: "plot-main", type: "line" })
    .editGraphics({ target: "xAxisLine", property: "x1", value: xAxis.line.x1 })
    .editGraphics({ target: "xAxisLine", property: "y1", value: xAxis.line.y1 })
    .editGraphics({ target: "xAxisLine", property: "x2", value: xAxis.line.x2 })
    .editGraphics({ target: "xAxisLine", property: "y2", value: xAxis.line.y2 })
    .editGraphics({ target: "xAxisLine", property: "stroke", value: "#334155" })
    .editGraphics({ target: "xAxisLine", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "xAxisTicks", parent: "plot-main", type: "line", length: xAxis.values.length })
    .editGraphics({ target: "xAxisTicks", property: "x1", value: xAxis.positions })
    .editGraphics({ target: "xAxisTicks", property: "y1", value: xAxis.line.y1 })
    .editGraphics({ target: "xAxisTicks", property: "x2", value: xAxis.positions })
    .editGraphics({ target: "xAxisTicks", property: "y2", value: xAxis.line.y1 + 6 })
    .editGraphics({ target: "xAxisTicks", property: "stroke", value: "#64748b" })
    .editGraphics({ target: "xAxisTicks", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "xAxisLabels", parent: "plot-main", type: "text", length: xAxis.values.length })
    .editGraphics({ target: "xAxisLabels", property: "x", value: xAxis.positions })
    .editGraphics({ target: "xAxisLabels", property: "y", value: xAxis.line.y1 + 18 })
    .editGraphics({ target: "xAxisLabels", property: "text", value: xAxis.values })
    .editGraphics({ target: "xAxisLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "xAxisLabels", property: "fontSize", value: 12 })
    .editGraphics({ target: "xAxisLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "xAxisLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "xAxisLabels", property: "textAlign", value: "center" })
    .editGraphics({ target: "xAxisLabels", property: "textBaseline", value: "top" })
    .createGraphics({ id: "xAxisTitle", parent: "plot-main", type: "text" })
    .editGraphics({ target: "xAxisTitle", property: "x", value: xAxis.title.x })
    .editGraphics({ target: "xAxisTitle", property: "y", value: xAxis.title.y })
    .editGraphics({ target: "xAxisTitle", property: "text", value: "Origin" })
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
    .createGraphics({ id: "yAxisTicks", parent: "plot-main", type: "line", length: yAxis.values.length })
    .editGraphics({ target: "yAxisTicks", property: "x1", value: yAxis.line.x1 - 6 })
    .editGraphics({ target: "yAxisTicks", property: "y1", value: yAxis.positions })
    .editGraphics({ target: "yAxisTicks", property: "x2", value: yAxis.line.x1 })
    .editGraphics({ target: "yAxisTicks", property: "y2", value: yAxis.positions })
    .editGraphics({ target: "yAxisTicks", property: "stroke", value: "#64748b" })
    .editGraphics({ target: "yAxisTicks", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "yAxisLabels", parent: "plot-main", type: "text", length: yAxis.values.length })
    .editGraphics({ target: "yAxisLabels", property: "x", value: yAxis.line.x1 - 12 })
    .editGraphics({ target: "yAxisLabels", property: "y", value: yAxis.positions })
    .editGraphics({
      target: "yAxisLabels",
      property: "text",
      value: yAxis.values.map(String)
    })
    .editGraphics({ target: "yAxisLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "yAxisLabels", property: "fontSize", value: 12 })
    .editGraphics({ target: "yAxisLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "yAxisLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "yAxisLabels", property: "textAlign", value: "right" })
    .editGraphics({ target: "yAxisLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "yAxisTitle", parent: "plot-main", type: "text" })
    .editGraphics({ target: "yAxisTitle", property: "x", value: yAxis.title.x })
    .editGraphics({ target: "yAxisTitle", property: "y", value: yAxis.title.y })
    .editGraphics({ target: "yAxisTitle", property: "text", value: "mean(Acceleration)" })
    .editGraphics({ target: "yAxisTitle", property: "fill", value: "#334155" })
    .editGraphics({ target: "yAxisTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "yAxisTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "yAxisTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "yAxisTitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "yAxisTitle", property: "textBaseline", value: "middle" })
    .editGraphics({ target: "yAxisTitle", property: "rotation", value: -Math.PI / 2 })
    .createTitle({
      text: "Mean Acceleration by Origin",
      subtitle: "95% confidence intervals"
    });
}

export function renderErrorBarBaselinePrimitives(cars, context) {
  return render(createErrorBarBaselinePrimitives(cars), context);
}

