import { chart, render } from "../../../src/index.js";
import { linearPathCommands } from "../../support/path.js";

import { createCarsRegressionScatterplotValues } from
  "./reference-values.js";

function markSelector(filter) {
  if (filter.oneOf !== undefined) {
    return { grain: "item", field: filter.field, op: "oneOf", values: filter.oneOf };
  }
  if (filter.predicate !== undefined) {
    return { grain: "item", field: filter.field, ...filter.predicate };
  }
  return { grain: "item", field: filter.field, op: "range", ...filter.range };
}

export function createCarsRegressionScatterplotPrimitives(cars, {
  filter = {
    field: "Origin",
    oneOf: ["Japan", "USA"]
  },
  regression = {}
} = {}) {
  const width = 760;
  const height = 480;
  const margin = { top: 40, right: 190, bottom: 70, left: 80 };
  const values = createCarsRegressionScatterplotValues(cars, {
    width,
    height,
    margin,
    filter,
    ...regression
  });
  const { x: xAxis, y: yAxis } = values.axes;
  const xTickPositions = xAxis.ticks.map(tick => tick.position);
  const yTickPositions = yAxis.ticks.map(tick => tick.position);
  const originLegend = values.legends.origin;
  const sizeLegend = values.legends.size;

  let program = chart()
    .createCanvas({ width, height, margin, background: "white" })
    .createData({ id: "cars", values: cars })
    .editSemantic({ property: "dataset[pointsFilteredData].source", value: "cars" })
    .editSemantic({
      property: "dataset[pointsFilteredData].transform",
      value: [{
        type: "markFilter",
        target: "points",
        selector: markSelector(filter)
      }]
    })
    .editSemantic({
      property: "dataset[pointsFilteredData].values",
      value: values.filteredRows
    })
    .editSemantic({
      property: "dataset[pointsRegressionData].source",
      value: "pointsFilteredData"
    })
    .editSemantic({
      property: "dataset[pointsRegressionData].transform",
      value: [values.regressionTransform]
    })
    .editSemantic({
      property: "dataset[pointsRegressionData].values",
      value: values.regressionRows
    })
    .editSemantic({ property: "layer[points].mark.type", value: "point" })
    .editSemantic({ property: "layer[points].data", value: "pointsFilteredData" })
    .editSemantic({ property: "layer[points].coordinate", value: "main" })
    .editSemantic({
      property: "layer[points].encoding.x.field",
      value: "Displacement"
    })
    .editSemantic({
      property: "layer[points].encoding.x.fieldType",
      value: "quantitative"
    })
    .editSemantic({ property: "layer[points].encoding.x.scale", value: "x" })
    .editSemantic({
      property: "layer[points].encoding.y.field",
      value: "Acceleration"
    })
    .editSemantic({
      property: "layer[points].encoding.y.fieldType",
      value: "quantitative"
    })
    .editSemantic({ property: "layer[points].encoding.y.scale", value: "y" })
    .editSemantic({
      property: "layer[points].encoding.color.field",
      value: "Origin"
    })
    .editSemantic({
      property: "layer[points].encoding.color.fieldType",
      value: "nominal"
    })
    .editSemantic({
      property: "layer[points].encoding.color.scale",
      value: "color"
    })
    .editSemantic({
      property: "layer[points].encoding.size.field",
      value: "Acceleration"
    })
    .editSemantic({
      property: "layer[points].encoding.size.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[points].encoding.size.scale",
      value: "size"
    })
    .editSemantic({
      property: "layer[points].encoding.shape.field",
      value: "Origin"
    })
    .editSemantic({
      property: "layer[points].encoding.shape.fieldType",
      value: "nominal"
    })
    .editSemantic({
      property: "layer[points].encoding.shape.scale",
      value: "shape"
    });

  if (values.regressionBands.length > 0) {
    program = program.editSemantic({
      property: "layer[pointsRegressionBands].mark.type",
      value: "area"
    })
    .editSemantic({
      property: "layer[pointsRegressionBands].data",
      value: "pointsRegressionData"
    })
    .editSemantic({
      property: "layer[pointsRegressionBands].coordinate",
      value: "main"
    })
    .editSemantic({
      property: "layer[pointsRegressionBands].encoding.x.field",
      value: "Displacement"
    })
    .editSemantic({
      property: "layer[pointsRegressionBands].encoding.x.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[pointsRegressionBands].encoding.x.scale",
      value: "x"
    })
    .editSemantic({
      property: "layer[pointsRegressionBands].encoding.y.field",
      value: "__regression_ci_lower"
    })
    .editSemantic({
      property: "layer[pointsRegressionBands].encoding.y.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[pointsRegressionBands].encoding.y.scale",
      value: "y"
    })
    .editSemantic({
      property: "layer[pointsRegressionBands].encoding.y2.field",
      value: "__regression_ci_upper"
    })
    .editSemantic({
      property: "layer[pointsRegressionBands].encoding.y2.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[pointsRegressionBands].encoding.y2.scale",
      value: "y"
    })
    .editSemantic({
      property: "layer[pointsRegressionBands].encoding.group.field",
      value: "Origin"
    })
    .editSemantic({
      property: "layer[pointsRegressionBands].encoding.group.fieldType",
      value: "nominal"
    });
  }

  program = program.editSemantic({
      property: "layer[pointsRegressionLines].mark.type",
      value: "line"
    })
    .editSemantic({
      property: "layer[pointsRegressionLines].data",
      value: "pointsRegressionData"
    })
    .editSemantic({
      property: "layer[pointsRegressionLines].coordinate",
      value: "main"
    })
    .editSemantic({
      property: "layer[pointsRegressionLines].encoding.x.field",
      value: "Displacement"
    })
    .editSemantic({
      property: "layer[pointsRegressionLines].encoding.x.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[pointsRegressionLines].encoding.x.scale",
      value: "x"
    })
    .editSemantic({
      property: "layer[pointsRegressionLines].encoding.y.field",
      value: "Acceleration"
    })
    .editSemantic({
      property: "layer[pointsRegressionLines].encoding.y.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[pointsRegressionLines].encoding.y.scale",
      value: "y"
    })
    .editSemantic({
      property: "layer[pointsRegressionLines].encoding.color.field",
      value: "Origin"
    })
    .editSemantic({
      property: "layer[pointsRegressionLines].encoding.color.fieldType",
      value: "nominal"
    })
    .editSemantic({
      property: "layer[pointsRegressionLines].encoding.color.scale",
      value: "color"
    })
    .editSemantic({
      property: "layer[pointsRegressionLines].encoding.group.field",
      value: "Origin"
    })
    .editSemantic({
      property: "layer[pointsRegressionLines].encoding.group.fieldType",
      value: "nominal"
    })
    .editSemantic({ property: "scale[x].type", value: "linear" })
    .editSemantic({ property: "scale[x].domain", value: "auto" })
    .editSemantic({ property: "scale[x].range", value: "auto" })
    .editSemantic({ property: "scale[x].nice", value: true })
    .editSemantic({ property: "scale[x].zero", value: false })
    .editSemantic({ property: "scale[y].type", value: "linear" })
    .editSemantic({ property: "scale[y].domain", value: "auto" })
    .editSemantic({ property: "scale[y].range", value: "auto" })
    .editSemantic({ property: "scale[y].nice", value: true })
    .editSemantic({ property: "scale[y].zero", value: false })
    .editSemantic({ property: "scale[color].type", value: "ordinal" })
    .editSemantic({ property: "scale[color].domain", value: "auto" })
    .editSemantic({
      property: "scale[color].range",
      value: { palette: "tableau10" }
    })
    .editSemantic({ property: "scale[size].type", value: "linear" })
    .editSemantic({ property: "scale[size].domain", value: "auto" })
    .editSemantic({ property: "scale[size].range", value: "auto" })
    .editSemantic({ property: "scale[shape].type", value: "ordinal" })
    .editSemantic({ property: "scale[shape].domain", value: "auto" })
    .editSemantic({ property: "scale[shape].range", value: "auto" })
    .editSemantic({ property: "coordinate[main].type", value: "cartesian" })
    .editSemantic({ property: "guide.axis.x.scale", value: "x" })
    .editSemantic({ property: "guide.axis.x.coordinate", value: "main" })
    .editSemantic({ property: "guide.axis.x.title", value: "Displacement" })
    .editSemantic({ property: "guide.axis.y.scale", value: "y" })
    .editSemantic({ property: "guide.axis.y.coordinate", value: "main" })
    .editSemantic({ property: "guide.axis.y.title", value: "Acceleration" })
    .editSemantic({ property: "guide.grid.horizontal.scale", value: "y" })
    .editSemantic({
      property: "guide.grid.horizontal.coordinate",
      value: "main"
    })
    .editSemantic({
      property: "guide.legend.series.channels",
      value: ["color", "shape"]
    })
    .editSemantic({
      property: "guide.legend.series.scales",
      value: ["color", "shape"]
    })
    .editSemantic({ property: "guide.legend.series.title", value: "Origin" })
    .editSemantic({ property: "guide.legend.size.scale", value: "size" })
    .editSemantic({
      property: "guide.legend.size.title",
      value: "Acceleration"
    })
    .createGraphics({
      id: "horizontalGridLines",
      type: "line",
      length: values.grid.horizontal.length
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "x1",
      value: values.grid.horizontal.map(line => line.x1)
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "y1",
      value: values.grid.horizontal.map(line => line.y1)
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "x2",
      value: values.grid.horizontal.map(line => line.x2)
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "y2",
      value: values.grid.horizontal.map(line => line.y2)
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
      value: values.grid.horizontal.map(() => [])
    })
    .createGraphics({ id: "points", type: "collection" })
    .editGraphics({
      target: "points",
      property: "children",
      value: values.pointChildren.map(child => ({
        type: child.type,
        properties: child.properties
      }))
    });

  if (values.regressionBands.length > 0) {
    program = program.createGraphics({
      id: "pointsRegressionBands",
      type: "path",
      length: values.regressionBands.length
    })
    .editGraphics({
      target: "pointsRegressionBands",
      property: "commands",
      value: values.regressionBands.map(band =>
        linearPathCommands(band.points, { close: true })
      )
    })
    .editGraphics({
      target: "pointsRegressionBands",
      property: "fill",
      value: "#111111"
    })
    .editGraphics({
      target: "pointsRegressionBands",
      property: "opacity",
      value: 0.18
    });
  }

  return program.createGraphics({
      id: "pointsRegressionLines",
      type: "path",
      length: values.regressionLines.length
    })
    .editGraphics({
      target: "pointsRegressionLines",
      property: "commands",
      value: values.regressionLines.map(line => linearPathCommands(line.points))
    })
    .editGraphics({
      target: "pointsRegressionLines",
      property: "stroke",
      value: values.regressionLines.map(line => line.stroke)
    })
    .editGraphics({
      target: "pointsRegressionLines",
      property: "strokeWidth",
      value: 3
    })
    .editGraphics({
      target: "pointsRegressionLines",
      property: "strokeDash",
      value: values.regressionLines.map(line => line.strokeDash)
    })
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
      id: "seriesLegendSymbolLines",
      type: "line",
      length: originLegend.items.length
    })
    .editGraphics({
      target: "seriesLegendSymbolLines",
      property: "x1",
      value: originLegend.items.map(item => item.line.x1)
    })
    .editGraphics({
      target: "seriesLegendSymbolLines",
      property: "y1",
      value: originLegend.items.map(item => item.line.y1)
    })
    .editGraphics({
      target: "seriesLegendSymbolLines",
      property: "x2",
      value: originLegend.items.map(item => item.line.x2)
    })
    .editGraphics({
      target: "seriesLegendSymbolLines",
      property: "y2",
      value: originLegend.items.map(item => item.line.y2)
    })
    .editGraphics({
      target: "seriesLegendSymbolLines",
      property: "stroke",
      value: originLegend.items.map(item => item.color)
    })
    .editGraphics({
      target: "seriesLegendSymbolLines",
      property: "strokeWidth",
      value: 3
    })
    .editGraphics({
      target: "seriesLegendSymbolLines",
      property: "strokeDash",
      value: originLegend.items.map(item => item.line.strokeDash)
    })
    .createGraphics({ id: "seriesLegendSymbolPoints", type: "collection" })
    .editGraphics({
      target: "seriesLegendSymbolPoints",
      property: "children",
      value: originLegend.items.map(item => item.symbol)
    })
    .createGraphics({
      id: "seriesLegendLabels",
      type: "text",
      length: originLegend.items.length
    })
    .editGraphics({
      target: "seriesLegendLabels",
      property: "x",
      value: originLegend.items.map(item => item.label.x)
    })
    .editGraphics({
      target: "seriesLegendLabels",
      property: "y",
      value: originLegend.items.map(item => item.label.y)
    })
    .editGraphics({
      target: "seriesLegendLabels",
      property: "text",
      value: originLegend.items.map(item => item.label.text)
    })
    .editGraphics({ target: "seriesLegendLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "seriesLegendLabels", property: "fontSize", value: 12 })
    .editGraphics({ target: "seriesLegendLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "seriesLegendLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "seriesLegendLabels", property: "textAlign", value: "left" })
    .editGraphics({ target: "seriesLegendLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "seriesLegendTitle", type: "text" })
    .editGraphics({ target: "seriesLegendTitle", property: "x", value: originLegend.title.x })
    .editGraphics({ target: "seriesLegendTitle", property: "y", value: originLegend.title.y })
    .editGraphics({ target: "seriesLegendTitle", property: "text", value: originLegend.title.text })
    .editGraphics({ target: "seriesLegendTitle", property: "fill", value: "#334155" })
    .editGraphics({ target: "seriesLegendTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "seriesLegendTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "seriesLegendTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "seriesLegendTitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "seriesLegendTitle", property: "textBaseline", value: "middle" })
    .createGraphics({
      id: "sizeLegendSymbols",
      type: "circle",
      length: sizeLegend.items.length
    })
    .editGraphics({
      target: "sizeLegendSymbols",
      property: "x",
      value: sizeLegend.items.map(item => item.symbol.x)
    })
    .editGraphics({
      target: "sizeLegendSymbols",
      property: "y",
      value: sizeLegend.items.map(item => item.symbol.y)
    })
    .editGraphics({
      target: "sizeLegendSymbols",
      property: "radius",
      value: sizeLegend.items.map(item => item.symbol.radius)
    })
    .editGraphics({ target: "sizeLegendSymbols", property: "fill", value: "#94a3b8" })
    .editGraphics({ target: "sizeLegendSymbols", property: "opacity", value: 0.7 })
    .createGraphics({
      id: "sizeLegendLabels",
      type: "text",
      length: sizeLegend.items.length
    })
    .editGraphics({
      target: "sizeLegendLabels",
      property: "x",
      value: sizeLegend.items.map(item => item.label.x)
    })
    .editGraphics({
      target: "sizeLegendLabels",
      property: "y",
      value: sizeLegend.items.map(item => item.label.y)
    })
    .editGraphics({
      target: "sizeLegendLabels",
      property: "text",
      value: sizeLegend.items.map(item => item.label.text)
    })
    .editGraphics({ target: "sizeLegendLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "sizeLegendLabels", property: "fontSize", value: 12 })
    .editGraphics({ target: "sizeLegendLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "sizeLegendLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "sizeLegendLabels", property: "textAlign", value: "left" })
    .editGraphics({ target: "sizeLegendLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "sizeLegendTitle", type: "text" })
    .editGraphics({ target: "sizeLegendTitle", property: "x", value: sizeLegend.title.x })
    .editGraphics({ target: "sizeLegendTitle", property: "y", value: sizeLegend.title.y })
    .editGraphics({ target: "sizeLegendTitle", property: "text", value: sizeLegend.title.text })
    .editGraphics({ target: "sizeLegendTitle", property: "fill", value: "#0f172a" })
    .editGraphics({ target: "sizeLegendTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "sizeLegendTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "sizeLegendTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "sizeLegendTitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "sizeLegendTitle", property: "textBaseline", value: "middle" });
}

export function renderCarsRegressionScatterplotPrimitives(program, context) {
  render(program, context);
}
