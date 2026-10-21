import { chart } from "../../src/index.js";

export function createLinearNearestTicks() {
  return chart()
    .createCanvas({ plot: { width: 200, height: 120 }, margin: { left: 40, top: 20, right: 20, bottom: 30 } })
    .createData({ values: [{ x: 0, y: 0 }, { x: 1, y: 133 }] })
    .createLinePlot({
      x: { field: "x", scale: { domain: [0, 1] } },
      y: { field: "y", scale: { domain: [0, 140] } },
      guides: {
        axes: { x: false, y: { title: false, ticksAndLabels: { rounding: "nearest" } } },
        grid: false,
        legend: false
      }
    });
}
