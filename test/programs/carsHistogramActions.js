import { chart, render } from "../../src/index.js";

import { createCarsHistogramValues } from "./carsHistogramValues.js";

export function createCarsHistogramActions(cars) {
  const width = 432;
  const height = 460;
  const margin = { top: 80, right: 60, bottom: 130, left: 80 };
  const values = createCarsHistogramValues(cars, {
    width,
    height,
    margin,
    maxBins: 10
  });
  const horizontalGrid = values.grid.horizontal;
  const legendItems = values.legend.items;

  return chart()
    .createCanvas({ width, height, margin, background: "white" })
    .createData({ id: "cars", values: values.validCars })
    .createBarMark({ id: "bars" })
    .encodeHistogram({
      field: "Displacement",
      maxBins: 10,
      xScale: { nice: true, zero: false }
    })
    .encodeColor({
      field: "Origin",
      scale: { palette: "tableau10" }
    })
    .createGraphics({
      id: "horizontalGridLines",
      type: "line",
      length: horizontalGrid.length
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "x1",
      value: horizontalGrid.map(line => line.x1)
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "y1",
      value: horizontalGrid.map(line => line.y1)
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "x2",
      value: horizontalGrid.map(line => line.x2)
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "y2",
      value: horizontalGrid.map(line => line.y2)
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
      value: horizontalGrid.map(() => [])
    })
    .editSemantic({ property: "guide.grid.horizontal.scale", value: "y" })
    .editSemantic({
      property: "guide.grid.horizontal.coordinate",
      value: "main"
    })
    .editSemantic({ property: "guide.legend.color.scale", value: "color" })
    .editSemantic({ property: "guide.legend.color.title", value: "Origin" })
    .createAxes()
    .createGraphics({
      id: "colorLegendSymbols",
      type: "rect",
      length: legendItems.length
    })
    .editGraphics({
      target: "colorLegendSymbols",
      property: "x",
      value: legendItems.map(item => item.x)
    })
    .editGraphics({
      target: "colorLegendSymbols",
      property: "y",
      value: legendItems.map(item => item.y)
    })
    .editGraphics({
      target: "colorLegendSymbols",
      property: "width",
      value: legendItems.map(item => item.width)
    })
    .editGraphics({
      target: "colorLegendSymbols",
      property: "height",
      value: legendItems.map(item => item.height)
    })
    .editGraphics({
      target: "colorLegendSymbols",
      property: "fill",
      value: legendItems.map(item => item.color)
    })
    .editGraphics({ target: "colorLegendSymbols", property: "stroke", value: "white" })
    .editGraphics({ target: "colorLegendSymbols", property: "strokeWidth", value: 0.5 })
    .createGraphics({
      id: "colorLegendLabels",
      type: "text",
      length: legendItems.length
    })
    .editGraphics({
      target: "colorLegendLabels",
      property: "x",
      value: legendItems.map(item => item.labelX)
    })
    .editGraphics({
      target: "colorLegendLabels",
      property: "y",
      value: legendItems.map(item => item.labelY)
    })
    .editGraphics({
      target: "colorLegendLabels",
      property: "text",
      value: legendItems.map(item => item.origin)
    })
    .editGraphics({ target: "colorLegendLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "colorLegendLabels", property: "fontSize", value: 12 })
    .editGraphics({ target: "colorLegendLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "colorLegendLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "colorLegendLabels", property: "textAlign", value: "left" })
    .editGraphics({ target: "colorLegendLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "colorLegendTitle", type: "text" })
    .editGraphics({ target: "colorLegendTitle", property: "x", value: values.legend.title.x })
    .editGraphics({ target: "colorLegendTitle", property: "y", value: values.legend.title.y })
    .editGraphics({ target: "colorLegendTitle", property: "text", value: values.legend.title.text })
    .editGraphics({ target: "colorLegendTitle", property: "fill", value: "#334155" })
    .editGraphics({ target: "colorLegendTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "colorLegendTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "colorLegendTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "colorLegendTitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "colorLegendTitle", property: "textBaseline", value: "middle" })
    .createTitle({
      text: values.title.text,
      subtitle: values.title.subtitle,
      align: "center"
    });
}

export function renderCarsHistogramActions(program, canvasContext) {
  render(program, canvasContext);
}
