import { chart } from "../../../src/index.js";

const density = Object.freeze({
  bandwidth: "auto",
  extent: "auto",
  steps: 64,
  kernel: "gaussian",
  normalization: "unit"
});
const width = Object.freeze({ band: 0.7 });
const gradient = Object.freeze({ palette: "blues", opacity: Object.freeze([0, 1]) });
const center = Object.freeze({
  type: "median",
  stroke: "#0f172a",
  strokeWidth: 1.5
});
const guides = Object.freeze({
  axes: Object.freeze({
    x: Object.freeze({ title: Object.freeze({ text: "Origin" }) }),
    y: Object.freeze({ title: Object.freeze({ text: "Acceleration" }) })
  }),
  legend: Object.freeze({ title: "Relative density", position: "right" })
});

export function createCarsGradientPlotExpanded(cars) {
  return chart()
    .createCanvas({
      width: 620,
      height: 460,
      margin: { top: 85, right: 170, bottom: 95, left: 80 }
    })
    .createData({ values: cars })
    .createRectMark({ id: "gradientPlot", data: "data" })
    ._withMarkConfig("gradientPlot", {
      gradientPlot: {
        materialized: false,
        density,
        width,
        gradient,
        center,
        guides
      },
      stroke: false,
      strokeWidth: 0
    })
    .encodeX({
      target: "gradientPlot",
      field: "Origin",
      fieldType: "nominal"
    })
    .encodeY({
      target: "gradientPlot",
      field: "Acceleration",
      fieldType: "quantitative"
    })
    .materializeGradientPlot({ id: "gradientPlot" })
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
