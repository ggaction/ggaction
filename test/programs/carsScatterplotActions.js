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
  const { validCars } =
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
    .createXAxisTicksAndLabels()
    .createYAxisTicksAndLabels()
    .createXAxisTitle({ text: "Horsepower" })
    .createYAxisTitle({ text: "Miles per Gallon" });
}

export function renderCarsScatterplotActions(program, canvasContext) {
  render(program, canvasContext);
}
