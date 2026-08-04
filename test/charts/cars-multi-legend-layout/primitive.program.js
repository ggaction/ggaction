import { createCarsMultiLegendLayoutBase } from
  "../../../examples/cars-multi-legend-layout/program.js";

import { LEGEND_LAYOUT } from "./reference-values.js";

export function createCarsMultiLegendLayoutPrimitives(cars, {
  position = "top"
} = {}) {
  const values = LEGEND_LAYOUT[position];
  const colorFills = LEGEND_LAYOUT.colorItems.map(item => item.fill);
  const colorTexts = LEGEND_LAYOUT.colorItems.map(item => item.text);
  const opacityValues = LEGEND_LAYOUT.opacityItems.map(item => item.opacity);
  const opacityTexts = LEGEND_LAYOUT.opacityItems.map(item => item.text);

  return createCarsMultiLegendLayoutBase(cars, { position })
    .editSemantic({ property: "guide.legend.color.scale", value: "color" })
    .editSemantic({ property: "guide.legend.color.title", value: "Origin" })
    .editSemantic({ property: "guide.legend.opacity.scale", value: "opacity" })
    .editSemantic({
      property: "guide.legend.opacity.title",
      value: "Acceleration"
    })
    .createGraphics({
      id: "colorLegendSymbols",
      parent: "canvas",
      type: "rect",
      length: 3
    })
    .editGraphics({
      target: "colorLegendSymbols",
      property: "x",
      value: values.colorSymbolX
    })
    .editGraphics({
      target: "colorLegendSymbols",
      property: "y",
      value: values.lineY - 6
    })
    .editGraphics({ target: "colorLegendSymbols", property: "width", value: 14 })
    .editGraphics({ target: "colorLegendSymbols", property: "height", value: 12 })
    .editGraphics({
      target: "colorLegendSymbols",
      property: "fill",
      value: colorFills
    })
    .editGraphics({
      target: "colorLegendSymbols",
      property: "stroke",
      value: "white"
    })
    .editGraphics({
      target: "colorLegendSymbols",
      property: "strokeWidth",
      value: 0.5
    })
    .createGraphics({
      id: "colorLegendLabels",
      parent: "canvas",
      type: "text",
      length: 3
    })
    .editGraphics({
      target: "colorLegendLabels",
      property: "x",
      value: values.colorLabelX
    })
    .editGraphics({ target: "colorLegendLabels", property: "y", value: values.lineY })
    .editGraphics({
      target: "colorLegendLabels",
      property: "text",
      value: colorTexts
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
    .editGraphics({
      target: "colorLegendLabels",
      property: "textAlign",
      value: "left"
    })
    .editGraphics({
      target: "colorLegendLabels",
      property: "textBaseline",
      value: "middle"
    })
    .createGraphics({ id: "colorLegendTitle", parent: "canvas", type: "text" })
    .editGraphics({ target: "colorLegendTitle", property: "x", value: 70 })
    .editGraphics({ target: "colorLegendTitle", property: "y", value: values.lineY })
    .editGraphics({ target: "colorLegendTitle", property: "text", value: "Origin" })
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
    })
    .createGraphics({
      id: "opacityLegendSymbols",
      parent: "canvas",
      type: "circle",
      length: 3
    })
    .editGraphics({
      target: "opacityLegendSymbols",
      property: "x",
      value: values.opacitySymbolX
    })
    .editGraphics({
      target: "opacityLegendSymbols",
      property: "y",
      value: values.lineY
    })
    .editGraphics({ target: "opacityLegendSymbols", property: "radius", value: 7 })
    .editGraphics({ target: "opacityLegendSymbols", property: "fill", value: "#4c78a8" })
    .editGraphics({
      target: "opacityLegendSymbols",
      property: "opacity",
      value: opacityValues
    })
    .createGraphics({
      id: "opacityLegendLabels",
      parent: "canvas",
      type: "text",
      length: 3
    })
    .editGraphics({
      target: "opacityLegendLabels",
      property: "x",
      value: values.opacityLabelX
    })
    .editGraphics({ target: "opacityLegendLabels", property: "y", value: values.lineY })
    .editGraphics({
      target: "opacityLegendLabels",
      property: "text",
      value: opacityTexts
    })
    .editGraphics({ target: "opacityLegendLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "opacityLegendLabels", property: "fontSize", value: 12 })
    .editGraphics({
      target: "opacityLegendLabels",
      property: "fontFamily",
      value: "sans-serif"
    })
    .editGraphics({
      target: "opacityLegendLabels",
      property: "fontWeight",
      value: "normal"
    })
    .editGraphics({
      target: "opacityLegendLabels",
      property: "textAlign",
      value: "left"
    })
    .editGraphics({
      target: "opacityLegendLabels",
      property: "textBaseline",
      value: "middle"
    })
    .createGraphics({ id: "opacityLegendTitle", parent: "canvas", type: "text" })
    .editGraphics({
      target: "opacityLegendTitle",
      property: "x",
      value: values.opacityTitleX
    })
    .editGraphics({ target: "opacityLegendTitle", property: "y", value: values.lineY })
    .editGraphics({
      target: "opacityLegendTitle",
      property: "text",
      value: "Acceleration"
    })
    .editGraphics({ target: "opacityLegendTitle", property: "fill", value: "#334155" })
    .editGraphics({ target: "opacityLegendTitle", property: "fontSize", value: 13 })
    .editGraphics({
      target: "opacityLegendTitle",
      property: "fontFamily",
      value: "sans-serif"
    })
    .editGraphics({ target: "opacityLegendTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "opacityLegendTitle", property: "textAlign", value: "left" })
    .editGraphics({
      target: "opacityLegendTitle",
      property: "textBaseline",
      value: "middle"
    });
}
