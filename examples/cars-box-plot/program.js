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
