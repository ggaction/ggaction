import { chart } from "../../src/index.js";

export function createCarsGradientPlot(cars) {
  return chart()
    .createCanvas({
      width: 620,
      height: 460,
      margin: { top: 85, right: 170, bottom: 95, left: 80 }
    })
    .createData({ values: cars })
    .createGradientPlot({
      x: { field: "Origin", fieldType: "nominal" },
      y: { field: "Acceleration" },
      density: { bandwidth: "auto", steps: 64 },
      width: { band: 0.7 },
      gradient: { opacity: [0, 1] },
      center: { type: "median" },
      guides: {
        axes: {
          x: { title: { text: "Origin" } },
          y: { title: { text: "Acceleration" } }
        },
        legend: { title: "Relative density", position: "right" }
      }
    })
    .encodeColor({
      target: "gradientPlot",
      field: "Origin",
      fieldType: "nominal",
      scale: { palette: "tableau10" }
    })
    .createTitle({
      text: "Acceleration Distribution by Origin",
      subtitle: "Gradient intensity shows the within-origin density",
      align: "center"
    });
}
