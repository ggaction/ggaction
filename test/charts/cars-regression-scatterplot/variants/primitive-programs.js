import { createCarsRegressionScatterplotPrimitives } from
  "../primitive.program.js";
import { linearPathCommands } from "../../../support/path.js";
import { createLeftLegendPrimitiveValues } from "./reference-values.js";

function editTextStyle(program, target, style) {
  return program
    .editGraphics({ target, property: "fill", value: style.fill })
    .editGraphics({ target, property: "fontSize", value: style.fontSize })
    .editGraphics({ target, property: "fontFamily", value: style.fontFamily })
    .editGraphics({ target, property: "fontWeight", value: style.fontWeight });
}

export function createLeftLegendPrimitives(cars) {
  const values = createLeftLegendPrimitiveValues(cars);
  const chart = values.chart;
  const { origin, size, background, labelStyle, titleStyle } = values.legend;
  const { x: xAxis, y: yAxis } = chart.axes;
  const xPositions = xAxis.ticks.map(tick => tick.position);
  const yPositions = yAxis.ticks.map(tick => tick.position);

  let program = createCarsRegressionScatterplotPrimitives(cars)
    .editGraphics({
      target: "horizontalGridLines",
      property: "x1",
      value: chart.grid.horizontal.map(line => line.x1)
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "x2",
      value: chart.grid.horizontal.map(line => line.x2)
    })
    .editGraphics({
      target: "points",
      property: "items",
      value: chart.pointChildren.map(child => ({
        type: child.type,
        properties: child.properties
      }))
    })
    .editGraphics({
      target: "pointsRegressionBands",
      property: "commands",
      value: chart.regressionBands.map(band =>
        linearPathCommands(band.points, { close: true })
      )
    })
    .editGraphics({
      target: "pointsRegressionLines",
      property: "commands",
      value: chart.regressionLines.map(line => linearPathCommands(line.points))
    })
    .editGraphics({ target: "xAxisLine", property: "x1", value: xAxis.line.x1 })
    .editGraphics({ target: "xAxisLine", property: "x2", value: xAxis.line.x2 })
    .editGraphics({ target: "xAxisTicks", property: "x1", value: xPositions })
    .editGraphics({ target: "xAxisTicks", property: "x2", value: xPositions })
    .editGraphics({ target: "xAxisLabels", property: "x", value: xPositions })
    .editGraphics({ target: "xAxisTitle", property: "x", value: xAxis.title.x })
    .editGraphics({ target: "yAxisLine", property: "x1", value: yAxis.line.x1 })
    .editGraphics({ target: "yAxisLine", property: "x2", value: yAxis.line.x2 })
    .editGraphics({ target: "yAxisTicks", property: "x1", value: yAxis.line.x1 - 6 })
    .editGraphics({ target: "yAxisTicks", property: "x2", value: yAxis.line.x1 })
    .editGraphics({ target: "yAxisLabels", property: "x", value: yAxis.line.x1 - 12 })
    .editGraphics({ target: "yAxisTitle", property: "x", value: yAxis.title.x })
    .createGraphics({
      id: "seriesLegendBackground",
      type: "rect",
      parent: "canvas",
      before: "seriesLegendSymbolLines"
    })
    .editGraphics({ target: "seriesLegendBackground", property: "x", value: background.x })
    .editGraphics({ target: "seriesLegendBackground", property: "y", value: background.y })
    .editGraphics({
      target: "seriesLegendBackground",
      property: "width",
      value: background.width
    })
    .editGraphics({
      target: "seriesLegendBackground",
      property: "height",
      value: background.height
    })
    .editGraphics({
      target: "seriesLegendBackground",
      property: "fill",
      value: background.fill
    })
    .editGraphics({
      target: "seriesLegendBackground",
      property: "stroke",
      value: background.stroke
    })
    .editGraphics({
      target: "seriesLegendBackground",
      property: "strokeWidth",
      value: background.strokeWidth
    })
    .editGraphics({
      target: "seriesLegendSymbolLines",
      property: "x1",
      value: origin.items.map(item => item.line.x1)
    })
    .editGraphics({
      target: "seriesLegendSymbolLines",
      property: "x2",
      value: origin.items.map(item => item.line.x2)
    })
    .editGraphics({
      target: "seriesLegendSymbolPoints",
      property: "items",
      value: origin.items.map(item => item.symbol)
    })
    .editGraphics({
      target: "seriesLegendLabels",
      property: "x",
      value: origin.items.map(item => item.label.x)
    })
    .editGraphics({ target: "seriesLegendSymbolLines", property: "y1", value: origin.items.map(item => item.line.y1) })
    .editGraphics({ target: "seriesLegendSymbolLines", property: "y2", value: origin.items.map(item => item.line.y2) })
    .editGraphics({ target: "seriesLegendLabels", property: "y", value: origin.items.map(item => item.label.y) })
    .editGraphics({ target: "seriesLegendTitle", property: "y", value: origin.title.y })
    .editGraphics({ target: "seriesLegendTitle", property: "x", value: origin.title.x })
    .editGraphics({
      target: "sizeLegendSymbols",
      property: "x",
      value: size.items.map(item => item.symbol.x)
    })
    .editGraphics({
      target: "sizeLegendLabels",
      property: "x",
      value: size.items.map(item => item.label.x)
    })
    .editGraphics({ target: "sizeLegendSymbols", property: "y", value: size.items.map(item => item.symbol.y) })
    .editGraphics({ target: "sizeLegendLabels", property: "y", value: size.items.map(item => item.label.y) })
    .editGraphics({ target: "sizeLegendTitle", property: "y", value: size.title.y })
    .editGraphics({ target: "sizeLegendTitle", property: "x", value: size.title.x });

  program = editTextStyle(program, "seriesLegendLabels", labelStyle);
  program = editTextStyle(program, "sizeLegendLabels", labelStyle);
  program = editTextStyle(program, "seriesLegendTitle", titleStyle);
  return editTextStyle(program, "sizeLegendTitle", titleStyle);
}

export function createComponentEditPrimitives(cars) {
  return createCarsRegressionScatterplotPrimitives(cars)
    .editGraphics({
      target: "pointsRegressionBands",
      property: "fill",
      value: "#475569"
    })
    .editGraphics({
      target: "pointsRegressionBands",
      property: "opacity",
      value: 0.12
    })
    .editGraphics({
      target: "pointsRegressionBands",
      property: "stroke",
      value: "#111827"
    })
    .editGraphics({
      target: "pointsRegressionBands",
      property: "strokeWidth",
      value: 1.5
    })
    .editGraphics({
      target: "pointsRegressionLines",
      property: "strokeWidth",
      value: 5
    });
}

export function createGraphicHierarchyPrimitives(cars) {
  return createCarsRegressionScatterplotPrimitives(cars, {
    hierarchy: true
  });
}

export function createComparisonFilterPrimitives(cars) {
  return createCarsRegressionScatterplotPrimitives(cars, {
    filter: {
      field: "Horsepower",
      predicate: { op: "gte", value: 150 }
    }
  });
}

export function createRangeFilterPrimitives(cars) {
  return createCarsRegressionScatterplotPrimitives(cars, {
    filter: {
      field: "Displacement",
      range: { min: 100, max: 300, inclusive: true }
    }
  });
}

export function createPolynomialRegressionPrimitives(cars) {
  return createCarsRegressionScatterplotPrimitives(cars, {
    regression: { method: "polynomial", degree: 2 }
  });
}

export function createLoessRegressionPrimitives(cars) {
  return createCarsRegressionScatterplotPrimitives(cars, {
    regression: { method: "loess", span: 0.55 }
  });
}

export function createPredictionIntervalPrimitives(cars) {
  return createCarsRegressionScatterplotPrimitives(cars, {
    regression: { interval: "prediction" }
  });
}
