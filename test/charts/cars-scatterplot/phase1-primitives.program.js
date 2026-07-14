import {
  createCarsScatterplotPrimitives
} from "./primitive.program.js";
import {
  createCategoricalPalettePrimitiveValues,
  createDiamondPrimitiveValues,
  createEncodingReassignmentPrimitiveValues,
  createScaleReversePrimitiveValues,
  createShapeVocabularyPrimitiveValues
} from "./phase1-reference-values.js";

export function createEncodingReassignmentPrimitives(cars) {
  const values = createEncodingReassignmentPrimitiveValues(cars);
  const xLabels = values.xTicks.values.map(String);
  const yLabels = values.yTicks.values.map(String);

  return createCarsScatterplotPrimitives(cars)
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
      value: "Cylinders"
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
      value: "Weight_in_lbs"
    })
    .editSemantic({
      property: "layer[points].encoding.size.fieldType",
      value: "quantitative"
    })
    .editSemantic({ property: "layer[points].encoding.size.scale", value: "size" })
    .editSemantic({
      property: "layer[points].encoding.shape.field",
      value: "Origin"
    })
    .editSemantic({
      property: "layer[points].encoding.shape.fieldType",
      value: "nominal"
    })
    .editSemantic({ property: "layer[points].encoding.shape.scale", value: "shape" })
    .editSemantic({ property: "scale[x].type", value: "linear" })
    .editSemantic({ property: "scale[x].domain", value: "auto" })
    .editSemantic({ property: "scale[x].range", value: "auto" })
    .editSemantic({ property: "scale[y].type", value: "linear" })
    .editSemantic({ property: "scale[y].domain", value: "auto" })
    .editSemantic({ property: "scale[y].range", value: "auto" })
    .editSemantic({ property: "scale[color].type", value: "ordinal" })
    .editSemantic({ property: "scale[color].domain", value: "auto" })
    .editSemantic({ property: "scale[color].range", value: "auto" })
    .editSemantic({ property: "scale[size].type", value: "linear" })
    .editSemantic({ property: "scale[size].domain", value: "auto" })
    .editSemantic({ property: "scale[size].range", value: "auto" })
    .editSemantic({ property: "scale[shape].type", value: "ordinal" })
    .editSemantic({ property: "scale[shape].domain", value: "auto" })
    .editSemantic({ property: "scale[shape].range", value: "auto" })
    .editSemantic({ property: "guide.axis.x.title", value: "Displacement" })
    .editSemantic({ property: "guide.axis.y.title", value: "Acceleration" })
    .editGraphics({ target: "points", property: "children", value: values.children })
    .editGraphics({
      target: "horizontalGridLines",
      property: "length",
      value: values.yTicks.values.length
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "y1",
      value: values.yTicks.positions
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "y2",
      value: values.yTicks.positions
    })
    .editGraphics({
      target: "xAxisTicks",
      property: "x1",
      value: values.xTicks.positions
    })
    .editGraphics({
      target: "xAxisTicks",
      property: "x2",
      value: values.xTicks.positions
    })
    .editGraphics({ target: "xAxisLabels", property: "x", value: values.xTicks.positions })
    .editGraphics({ target: "xAxisLabels", property: "text", value: xLabels })
    .editGraphics({ target: "xAxisTitle", property: "text", value: "Displacement" })
    .editGraphics({
      target: "yAxisTicks",
      property: "length",
      value: values.yTicks.values.length
    })
    .editGraphics({
      target: "yAxisTicks",
      property: "y1",
      value: values.yTicks.positions
    })
    .editGraphics({
      target: "yAxisTicks",
      property: "y2",
      value: values.yTicks.positions
    })
    .editGraphics({
      target: "yAxisLabels",
      property: "length",
      value: values.yTicks.values.length
    })
    .editGraphics({ target: "yAxisLabels", property: "y", value: values.yTicks.positions })
    .editGraphics({ target: "yAxisLabels", property: "text", value: yLabels })
    .editGraphics({ target: "yAxisTitle", property: "text", value: "Acceleration" });
}

export function createScaleReversePrimitives(cars) {
  const values = createScaleReversePrimitiveValues(cars);

  return createCarsScatterplotPrimitives(cars)
    .editSemantic({
      property: "layer[points].encoding.x.field",
      value: "Horsepower"
    })
    .editSemantic({
      property: "layer[points].encoding.x.fieldType",
      value: "quantitative"
    })
    .editSemantic({ property: "layer[points].encoding.x.scale", value: "x" })
    .editSemantic({ property: "scale[x].type", value: "linear" })
    .editSemantic({ property: "scale[x].domain", value: "auto" })
    .editSemantic({
      property: "scale[x].range",
      value: [values.baseline.bounds.right, values.baseline.bounds.left]
    })
    .editSemantic({ property: "guide.axis.x.scale", value: "x" })
    .editSemantic({ property: "guide.axis.x.coordinate", value: "main" })
    .editSemantic({ property: "guide.axis.x.title", value: "Horsepower" })
    .editGraphics({
      target: "xAxisLine",
      property: "x1",
      value: values.baseline.bounds.right
    })
    .editGraphics({
      target: "xAxisLine",
      property: "x2",
      value: values.baseline.bounds.left
    })
    .editGraphics({ target: "points", property: "x", value: values.x })
    .editGraphics({
      target: "xAxisTicks",
      property: "x1",
      value: values.xTicks
    })
    .editGraphics({
      target: "xAxisTicks",
      property: "x2",
      value: values.xTicks
    })
    .editGraphics({
      target: "xAxisLabels",
      property: "x",
      value: values.xTicks
    });
}

export function createPointShapeDiamondPrimitives(cars) {
  const values = createDiamondPrimitiveValues(cars);

  return createCarsScatterplotPrimitives(cars)
    .editGraphics({
      target: "points",
      property: "children",
      value: values.children
    });
}

export function createShapeVocabularyPrimitives(cars) {
  const values = createShapeVocabularyPrimitiveValues(cars);
  const labelX = values.legend.labels.map(label => label.x);
  const labelY = values.legend.labels.map(label => label.y);
  const labelText = values.legend.labels.map(label => label.text);

  return createCarsScatterplotPrimitives(cars)
    .editSemantic({ property: "dataset[shapeCars].values", value: values.rows })
    .editSemantic({ property: "layer[points].data", value: "shapeCars" })
    .editSemantic({
      property: "layer[points].encoding.shape.field",
      value: "ShapeCategory"
    })
    .editSemantic({
      property: "layer[points].encoding.shape.fieldType",
      value: "nominal"
    })
    .editSemantic({
      property: "layer[points].encoding.shape.scale",
      value: "shape"
    })
    .editSemantic({ property: "scale[shape].type", value: "ordinal" })
    .editSemantic({ property: "scale[shape].domain", value: values.shapes })
    .editSemantic({ property: "scale[shape].range", value: values.shapes })
    .editSemantic({
      property: "guide.legend.series.channels",
      value: ["shape"]
    })
    .editSemantic({
      property: "guide.legend.series.scales",
      value: ["shape"]
    })
    .editSemantic({ property: "guide.legend.series.title", value: "Shape" })
    .editGraphics({ target: "canvas", property: "width", value: 860 })
    .editGraphics({
      target: "points",
      property: "children",
      value: values.children
    })
    .createGraphics({ id: "seriesLegendSymbolPoints", type: "collection" })
    .editGraphics({
      target: "seriesLegendSymbolPoints",
      property: "children",
      value: values.legend.symbols
    })
    .createGraphics({
      id: "seriesLegendLabels",
      type: "text",
      length: values.legend.labels.length
    })
    .editGraphics({ target: "seriesLegendLabels", property: "x", value: labelX })
    .editGraphics({ target: "seriesLegendLabels", property: "y", value: labelY })
    .editGraphics({
      target: "seriesLegendLabels",
      property: "text",
      value: labelText
    })
    .editGraphics({ target: "seriesLegendLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "seriesLegendLabels", property: "fontSize", value: 12 })
    .editGraphics({
      target: "seriesLegendLabels",
      property: "fontFamily",
      value: "sans-serif"
    })
    .editGraphics({
      target: "seriesLegendLabels",
      property: "fontWeight",
      value: "normal"
    })
    .editGraphics({
      target: "seriesLegendLabels",
      property: "textAlign",
      value: "left"
    })
    .editGraphics({
      target: "seriesLegendLabels",
      property: "textBaseline",
      value: "middle"
    })
    .createGraphics({ id: "seriesLegendTitle", type: "text" })
    .editGraphics({
      target: "seriesLegendTitle",
      property: "x",
      value: values.legend.title.x
    })
    .editGraphics({
      target: "seriesLegendTitle",
      property: "y",
      value: values.legend.title.y
    })
    .editGraphics({
      target: "seriesLegendTitle",
      property: "text",
      value: values.legend.title.text
    })
    .editGraphics({ target: "seriesLegendTitle", property: "fill", value: "#334155" })
    .editGraphics({ target: "seriesLegendTitle", property: "fontSize", value: 13 })
    .editGraphics({
      target: "seriesLegendTitle",
      property: "fontFamily",
      value: "sans-serif"
    })
    .editGraphics({ target: "seriesLegendTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "seriesLegendTitle", property: "textAlign", value: "left" })
    .editGraphics({
      target: "seriesLegendTitle",
      property: "textBaseline",
      value: "middle"
    });
}

export function createCategoricalPalettePrimitives(cars) {
  const values = createCategoricalPalettePrimitiveValues(cars);
  const symbolX = values.legend.symbols.map(symbol => symbol.x);
  const symbolY = values.legend.symbols.map(symbol => symbol.y);
  const symbolWidth = values.legend.symbols.map(symbol => symbol.width);
  const symbolHeight = values.legend.symbols.map(symbol => symbol.height);
  const symbolFill = values.legend.symbols.map(symbol => symbol.fill);
  const symbolStroke = values.legend.symbols.map(symbol => symbol.stroke);
  const symbolStrokeWidth = values.legend.symbols.map(
    symbol => symbol.strokeWidth
  );
  const labelX = values.legend.labels.map(label => label.x);
  const labelY = values.legend.labels.map(label => label.y);
  const labelText = values.legend.labels.map(label => label.text);

  return createCarsScatterplotPrimitives(cars)
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
    .editSemantic({ property: "scale[color].type", value: "ordinal" })
    .editSemantic({ property: "scale[color].domain", value: values.domain })
    .editSemantic({ property: "scale[color].range", value: values.range })
    .editSemantic({ property: "guide.legend.color.scale", value: "color" })
    .editSemantic({ property: "guide.legend.color.title", value: "Origin" })
    .editGraphics({ target: "canvas", property: "width", value: 760 })
    .editGraphics({ target: "points", property: "fill", value: values.fill })
    .createGraphics({
      id: "colorLegendSymbols",
      type: "rect",
      length: values.legend.symbols.length
    })
    .editGraphics({ target: "colorLegendSymbols", property: "x", value: symbolX })
    .editGraphics({ target: "colorLegendSymbols", property: "y", value: symbolY })
    .editGraphics({
      target: "colorLegendSymbols",
      property: "width",
      value: symbolWidth
    })
    .editGraphics({
      target: "colorLegendSymbols",
      property: "height",
      value: symbolHeight
    })
    .editGraphics({
      target: "colorLegendSymbols",
      property: "fill",
      value: symbolFill
    })
    .editGraphics({
      target: "colorLegendSymbols",
      property: "stroke",
      value: symbolStroke
    })
    .editGraphics({
      target: "colorLegendSymbols",
      property: "strokeWidth",
      value: symbolStrokeWidth
    })
    .createGraphics({
      id: "colorLegendLabels",
      type: "text",
      length: values.legend.labels.length
    })
    .editGraphics({ target: "colorLegendLabels", property: "x", value: labelX })
    .editGraphics({ target: "colorLegendLabels", property: "y", value: labelY })
    .editGraphics({
      target: "colorLegendLabels",
      property: "text",
      value: labelText
    })
    .editGraphics({ target: "colorLegendLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "colorLegendLabels", property: "fontSize", value: 12 })
    .editGraphics({
      target: "colorLegendLabels",
      property: "fontFamily",
      value: "sans-serif"
    })
    .editGraphics({
      target: "colorLegendLabels",
      property: "fontWeight",
      value: "normal"
    })
    .editGraphics({ target: "colorLegendLabels", property: "textAlign", value: "left" })
    .editGraphics({
      target: "colorLegendLabels",
      property: "textBaseline",
      value: "middle"
    })
    .createGraphics({ id: "colorLegendTitle", type: "text" })
    .editGraphics({
      target: "colorLegendTitle",
      property: "x",
      value: values.legend.title.x
    })
    .editGraphics({
      target: "colorLegendTitle",
      property: "y",
      value: values.legend.title.y
    })
    .editGraphics({
      target: "colorLegendTitle",
      property: "text",
      value: values.legend.title.text
    })
    .editGraphics({ target: "colorLegendTitle", property: "fill", value: "#334155" })
    .editGraphics({ target: "colorLegendTitle", property: "fontSize", value: 13 })
    .editGraphics({
      target: "colorLegendTitle",
      property: "fontFamily",
      value: "sans-serif"
    })
    .editGraphics({ target: "colorLegendTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "colorLegendTitle", property: "textAlign", value: "left" })
    .editGraphics({
      target: "colorLegendTitle",
      property: "textBaseline",
      value: "middle"
    });
}
