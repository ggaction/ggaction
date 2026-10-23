import { chart } from "../../src/index.js";

export function createLinearNiceCount() {
  return chart()
    .createCanvas({ plot: { width: 200, height: 120 }, margin: { left: 40, top: 20, right: 20, bottom: 30 } })
    .createData({ values: [{ x: 0, y: 0 }, { x: 0.5, y: 54 }, { x: 1, y: 108 }] })
    .createLinePlot({
      x: { field: "x", scale: { domain: [0, 1] } },
      y: { field: "y", scale: { zero: true, nice: { count: 10 } } },
      guides: false
    });
}
