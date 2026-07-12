import { chart, render } from "../../src/index.js";

import { createCarsScatterplotAxesValues } from "./carsScatterplotAxes.js";

export function createCarsScatterplotActions(cars) {
  const width = 640;
  const height = 400;
  const margin = {
    top: 30,
    right: 30,
    bottom: 60,
    left: 70
  };
  const { validCars, bounds, xTicks, yTicks } =
    createCarsScatterplotAxesValues(cars, { width, height, margin });

  return chart()
    .createCanvas({
      width,
      height,
      background: "white",
      margin
    })
    .createData({ id: "cars", values: validCars })
    .createPointMark({ id: "points" })
    .encodeX({ field: "Horsepower" })
    .encodeY({ field: "Miles_per_Gallon" })
    .encodeColor({ field: "Origin" })
    .encodeRadius({ value: 3 })
    .createXAxisLine()
    .createYAxisLine()
    .createXAxisTicks()
    .createYAxisTicks()
    .createGraphics({
      id: "xLabels",
      type: "text",
      length: xTicks.positions.length
    })
    .editGraphics({ target: "xLabels", property: "x", value: xTicks.positions })
    .editGraphics({
      target: "xLabels",
      property: "y",
      value: bounds.bottom + 18
    })
    .editGraphics({ target: "xLabels", property: "text", value: xTicks.labels })
    .editGraphics({ target: "xLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "xLabels", property: "fontSize", value: 12 })
    .editGraphics({
      target: "xLabels",
      property: "fontFamily",
      value: "sans-serif"
    })
    .editGraphics({ target: "xLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "xLabels", property: "textAlign", value: "center" })
    .editGraphics({ target: "xLabels", property: "textBaseline", value: "top" })
    .createGraphics({
      id: "yLabels",
      type: "text",
      length: yTicks.positions.length
    })
    .editGraphics({
      target: "yLabels",
      property: "x",
      value: bounds.left - 12
    })
    .editGraphics({ target: "yLabels", property: "y", value: yTicks.positions })
    .editGraphics({ target: "yLabels", property: "text", value: yTicks.labels })
    .editGraphics({ target: "yLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "yLabels", property: "fontSize", value: 12 })
    .editGraphics({
      target: "yLabels",
      property: "fontFamily",
      value: "sans-serif"
    })
    .editGraphics({ target: "yLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "yLabels", property: "textAlign", value: "right" })
    .editGraphics({
      target: "yLabels",
      property: "textBaseline",
      value: "middle"
    })
    .createGraphics({ id: "xTitle", type: "text" })
    .editGraphics({
      target: "xTitle",
      property: "x",
      value: (bounds.left + bounds.right) / 2
    })
    .editGraphics({ target: "xTitle", property: "y", value: 382 })
    .editGraphics({ target: "xTitle", property: "text", value: "Horsepower" })
    .editGraphics({ target: "xTitle", property: "fill", value: "#334155" })
    .editGraphics({ target: "xTitle", property: "fontSize", value: 13 })
    .editGraphics({
      target: "xTitle",
      property: "fontFamily",
      value: "sans-serif"
    })
    .editGraphics({ target: "xTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "xTitle", property: "textAlign", value: "center" })
    .editGraphics({
      target: "xTitle",
      property: "textBaseline",
      value: "middle"
    })
    .createGraphics({ id: "yTitle", type: "text" })
    .editGraphics({ target: "yTitle", property: "x", value: 18 })
    .editGraphics({
      target: "yTitle",
      property: "y",
      value: (bounds.top + bounds.bottom) / 2
    })
    .editGraphics({
      target: "yTitle",
      property: "text",
      value: "Miles per Gallon"
    })
    .editGraphics({ target: "yTitle", property: "fill", value: "#334155" })
    .editGraphics({ target: "yTitle", property: "fontSize", value: 13 })
    .editGraphics({
      target: "yTitle",
      property: "fontFamily",
      value: "sans-serif"
    })
    .editGraphics({ target: "yTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "yTitle", property: "textAlign", value: "center" })
    .editGraphics({
      target: "yTitle",
      property: "textBaseline",
      value: "middle"
    })
    .editGraphics({
      target: "yTitle",
      property: "rotation",
      value: -Math.PI / 2
    });
}

export function renderCarsScatterplotActions(program, canvasContext) {
  render(program, canvasContext);
}
