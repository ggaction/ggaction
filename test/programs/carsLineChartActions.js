import { chart, render } from "../../src/index.js";

import { createCarsLineChartValues } from "./carsLineChartValues.js";

export function createCarsLineChartActions(cars) {
  const width = 720;
  const height = 460;
  const margin = { top: 80, right: 170, bottom: 60, left: 80 };
  const values = createCarsLineChartValues(cars, { width, height, margin });

  return chart()
    .createCanvas({ width, height, margin, background: "white" })
    .createData({ id: "cars", values: values.validCars })
    .createLineMark({ id: "trends" })
    .encodeX({
      field: "Year",
      fieldType: "temporal",
      scale: { nice: true }
    })
    .encodeY({
      field: "Acceleration",
      fieldType: "quantitative",
      aggregate: "mean",
      scale: { nice: true, zero: false }
    })
    .encodeColor({
      field: "Origin",
      fieldType: "nominal",
      scale: { palette: "tableau10" }
    })
    .encodeStrokeDash({
      field: "Origin",
      fieldType: "nominal"
    })
    .createGuides({
      axes: { y: { ticksAndLabels: { count: 6 } } },
      grid: false
    })
    .createTitle({
      text: "The trend of acceleration by year",
      subtitle: "from 1970 to 1982"
    });
}

export function renderCarsLineChartActions(program, canvasContext) {
  render(program, canvasContext);
}
