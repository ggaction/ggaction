import {
  createCarsScatterplotPrimitives
} from "../primitive.program.js";
import {
  createCategoricalPalettePrimitiveValues,
  createContinuousColorPrimitiveValues,
  createDiamondPrimitiveValues,
  createEncodingReassignmentPrimitiveValues,
  createFieldOpacityPrimitiveValues,
  createScaleReversePrimitiveValues,
  createShapeVocabularyPrimitiveValues
} from "./reference-values.js";

function editLegendText(program, id, values) {
  return program
    .editGraphics({ target: id, property: "x", value: values.map(value => value.x) })
    .editGraphics({ target: id, property: "y", value: values.map(value => value.y) })
    .editGraphics({
      target: id,
      property: "text",
      value: values.map(value => value.text)
    })
    .editGraphics({ target: id, property: "fill", value: "#334155" })
    .editGraphics({ target: id, property: "fontSize", value: 12 })
    .editGraphics({ target: id, property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: id, property: "fontWeight", value: "normal" })
    .editGraphics({ target: id, property: "textAlign", value: "left" })
    .editGraphics({ target: id, property: "textBaseline", value: "middle" });
}

function editLegendTitle(program, id, title) {
  return program
    .editGraphics({ target: id, property: "x", value: title.x })
    .editGraphics({ target: id, property: "y", value: title.y })
    .editGraphics({ target: id, property: "text", value: title.text })
    .editGraphics({ target: id, property: "fill", value: "#334155" })
    .editGraphics({ target: id, property: "fontSize", value: 13 })
    .editGraphics({ target: id, property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: id, property: "fontWeight", value: 600 })
    .editGraphics({ target: id, property: "textAlign", value: "left" })
    .editGraphics({ target: id, property: "textBaseline", value: "middle" });
}

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

export function createContinuousColorPrimitives(cars) {
  const values = createContinuousColorPrimitiveValues(cars);
  const strips = values.legend.strips;
  const ticks = values.legend.ticks;

  let program = createCarsScatterplotPrimitives(cars)
    .editSemantic({
      property: "layer[points].encoding.color.field",
      value: "Acceleration"
    })
    .editSemantic({
      property: "layer[points].encoding.color.fieldType",
      value: "quantitative"
    })
    .editSemantic({ property: "layer[points].encoding.color.scale", value: "color" })
    .editSemantic({ property: "scale[color].type", value: "linear" })
    .editSemantic({ property: "scale[color].domain", value: values.domain })
    .editSemantic({ property: "scale[color].range", value: values.range })
    .editSemantic({ property: "guide.legend.color.scale", value: "color" })
    .editSemantic({ property: "guide.legend.color.title", value: "Acceleration" })
    .editGraphics({ target: "canvas", property: "width", value: 760 })
    .editGraphics({ target: "points", property: "fill", value: values.fill })
    .createGraphics({
      id: "colorGradientStrips",
      type: "rect",
      length: strips.length,
      after: "points"
    })
    .editGraphics({
      target: "colorGradientStrips",
      property: "x",
      value: strips.map(strip => strip.x)
    })
    .editGraphics({
      target: "colorGradientStrips",
      property: "y",
      value: strips.map(strip => strip.y)
    })
    .editGraphics({
      target: "colorGradientStrips",
      property: "width",
      value: strips.map(strip => strip.width)
    })
    .editGraphics({
      target: "colorGradientStrips",
      property: "height",
      value: strips.map(strip => strip.height)
    })
    .editGraphics({
      target: "colorGradientStrips",
      property: "fill",
      value: strips.map(strip => strip.fill)
    })
    .editGraphics({
      target: "colorGradientStrips",
      property: "stroke",
      value: strips.map(strip => strip.stroke)
    })
    .editGraphics({
      target: "colorGradientStrips",
      property: "strokeWidth",
      value: strips.map(strip => strip.strokeWidth)
    })
    .createGraphics({
      id: "colorGradientTicks",
      type: "line",
      length: ticks.length
    })
    .editGraphics({
      target: "colorGradientTicks",
      property: "x1",
      value: ticks.map(tick => tick.x1)
    })
    .editGraphics({
      target: "colorGradientTicks",
      property: "y1",
      value: ticks.map(tick => tick.y1)
    })
    .editGraphics({
      target: "colorGradientTicks",
      property: "x2",
      value: ticks.map(tick => tick.x2)
    })
    .editGraphics({
      target: "colorGradientTicks",
      property: "y2",
      value: ticks.map(tick => tick.y2)
    })
    .editGraphics({ target: "colorGradientTicks", property: "stroke", value: "#64748b" })
    .editGraphics({ target: "colorGradientTicks", property: "strokeWidth", value: 1 })
    .createGraphics({
      id: "colorGradientLabels",
      type: "text",
      length: values.legend.labels.length
    });
  program = editLegendText(program, "colorGradientLabels", values.legend.labels)
    .createGraphics({ id: "colorGradientTitle", type: "text" });

  return editLegendTitle(program, "colorGradientTitle", values.legend.title);
}

export function createFieldOpacityPrimitives(cars) {
  const values = createFieldOpacityPrimitiveValues(cars);
  const symbols = values.legend.symbols;

  let program = createCarsScatterplotPrimitives(cars)
    .editSemantic({
      property: "layer[points].encoding.color",
      remove: true
    })
    .editSemantic({
      property: "layer[points].encoding.opacity.field",
      value: "Acceleration"
    })
    .editSemantic({
      property: "layer[points].encoding.opacity.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[points].encoding.opacity.scale",
      value: "opacity"
    })
    .editSemantic({ property: "scale[opacity].type", value: "linear" })
    .editSemantic({ property: "scale[opacity].domain", value: values.domain })
    .editSemantic({ property: "scale[opacity].range", value: values.range })
    .editSemantic({ property: "guide.legend.opacity.scale", value: "opacity" })
    .editSemantic({ property: "guide.legend.opacity.title", value: "Acceleration" })
    .editGraphics({ target: "canvas", property: "width", value: 760 })
    .editGraphics({ target: "points", property: "fill", value: "#4c78a8" })
    .editGraphics({ target: "points", property: "radius", value: 4 })
    .editGraphics({ target: "points", property: "opacity", value: values.opacity })
    .createGraphics({
      id: "opacityLegendSymbols",
      type: "circle",
      length: symbols.length,
      after: "points"
    })
    .editGraphics({
      target: "opacityLegendSymbols",
      property: "x",
      value: symbols.map(symbol => symbol.x)
    })
    .editGraphics({
      target: "opacityLegendSymbols",
      property: "y",
      value: symbols.map(symbol => symbol.y)
    })
    .editGraphics({
      target: "opacityLegendSymbols",
      property: "radius",
      value: symbols.map(symbol => symbol.radius)
    })
    .editGraphics({
      target: "opacityLegendSymbols",
      property: "fill",
      value: symbols.map(symbol => symbol.fill)
    })
    .editGraphics({
      target: "opacityLegendSymbols",
      property: "opacity",
      value: symbols.map(symbol => symbol.opacity)
    })
    .createGraphics({
      id: "opacityLegendLabels",
      type: "text",
      length: values.legend.labels.length
    });
  program = editLegendText(program, "opacityLegendLabels", values.legend.labels)
    .createGraphics({ id: "opacityLegendTitle", type: "text" });

  return editLegendTitle(program, "opacityLegendTitle", values.legend.title);
}
