import { chart } from "../../src/index.js";

export function createCarsBoxPlot(cars) {
  return chart()
    .createCanvas({
      width: 360,
      height: 460,
      margin: { top: 140, right: 40, bottom: 70, left: 80 }
    })
    .createData({ values: cars })
    .createBoxPlot({
      x: { field: "Origin", fieldType: "nominal" },
      y: { field: "Miles_per_Gallon" }
    })
    .encodeColor({
      target: "boxPlot",
      field: "Origin",
      fieldType: "nominal",
      scale: { palette: "tableau10" }
    })
    .createGuides({ legend: false })
    .createTitle({
      text: "Fuel Economy Distribution by Origin",
      subtitle: "Tukey box plot with 1.5× IQR whiskers",
      maxWidth: 240
    });
}

export function createCarsHorizontalMinmaxBoxPlot(cars) {
  return chart()
    .createCanvas({
      width: 560,
      height: 340,
      margin: { top: 90, right: 40, bottom: 65, left: 80 }
    })
    .createData({ values: cars })
    .createBoxPlot({
      x: { field: "Horsepower" },
      y: { field: "Origin", fieldType: "nominal" },
      whisker: { type: "minmax" }
    })
    .encodeColor({
      target: "boxPlot",
      field: "Origin",
      fieldType: "nominal",
      scale: { palette: "tableau10" }
    })
    .createGuides({
      grid: { horizontal: false, vertical: {} },
      legend: false
    })
    .createTitle({
      text: "Horsepower Range by Origin",
      subtitle: "Min–max whiskers with no outlier layer"
    });
}
