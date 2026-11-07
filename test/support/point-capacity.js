import { chart } from "../../src/index.js";

export const pointCapacityRows = count => Array.from({ length: count }, (_, x) => ({ x, y: x % 101, group: x % 2 }));

export function pointCapacityScatter(count, factory = chart) {
  return factory().createCanvas({ width: 400, height: 300, margin: 20 })
    .createData({ id: "raw", values: pointCapacityRows(count) })
    .createScatterPlot({ x: "x", y: "y", point: { maxItems: 100000 }, guides: false });
}
