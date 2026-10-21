import { chart } from "../../../src/index.js";

const positions = Object.freeze([
  140, 122.85714285714286, 105.71428571428572, 88.57142857142858,
  71.42857142857143, 54.28571428571428, 37.14285714285715, 20
]);

export function createLinearNearestTicksPrimitives() {
  return chart()
    .createCanvas({ plot: { width: 200, height: 120 }, margin: { left: 40, top: 20, right: 20, bottom: 30 } })
    .createGraphics({ id: "linePlot", type: "path", length: 1, parent: "plot-main" })
    .editGraphics({ target: "linePlot", property: "commands", value: [[{ op: "M", x: 40, y: 140 }, { op: "L", x: 240, y: 26 }]] })
    .editGraphics({ target: "linePlot", property: "stroke", value: "#4c78a8" })
    .editGraphics({ target: "linePlot", property: "strokeWidth", value: 2 })
    .editGraphics({ target: "linePlot", property: "strokeDash", value: [[]] })
    .createGraphics({ id: "yAxisLine", type: "line", parent: "plot-main" })
    .editGraphics({ target: "yAxisLine", property: "x1", value: 40 })
    .editGraphics({ target: "yAxisLine", property: "y1", value: 140 })
    .editGraphics({ target: "yAxisLine", property: "x2", value: 40 })
    .editGraphics({ target: "yAxisLine", property: "y2", value: 20 })
    .editGraphics({ target: "yAxisLine", property: "stroke", value: "#334155" })
    .editGraphics({ target: "yAxisLine", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "yAxisTicks", type: "line", length: 8, parent: "plot-main" })
    .editGraphics({ target: "yAxisTicks", property: "x1", value: 34 })
    .editGraphics({ target: "yAxisTicks", property: "y1", value: positions })
    .editGraphics({ target: "yAxisTicks", property: "x2", value: 40 })
    .editGraphics({ target: "yAxisTicks", property: "y2", value: positions })
    .editGraphics({ target: "yAxisTicks", property: "stroke", value: "#64748b" })
    .editGraphics({ target: "yAxisTicks", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "yAxisLabels", type: "text", length: 8, parent: "plot-main" })
    .editGraphics({ target: "yAxisLabels", property: "x", value: 28 })
    .editGraphics({ target: "yAxisLabels", property: "y", value: positions })
    .editGraphics({ target: "yAxisLabels", property: "text", value: ["0", "20", "40", "60", "80", "100", "120", "140"] })
    .editGraphics({ target: "yAxisLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "yAxisLabels", property: "fontSize", value: 12 })
    .editGraphics({ target: "yAxisLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "yAxisLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "yAxisLabels", property: "textAlign", value: "right" })
    .editGraphics({ target: "yAxisLabels", property: "textBaseline", value: "middle" });
}

