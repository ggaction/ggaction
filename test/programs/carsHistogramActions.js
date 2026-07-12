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
    .createGuides()
    .createTitle({
      text: values.title.text,
      subtitle: values.title.subtitle,
      align: "center"
    });
}

export function renderCarsHistogramActions(program, canvasContext) {
  render(program, canvasContext);
}
