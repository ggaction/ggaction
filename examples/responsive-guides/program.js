import { chart } from "../../src/index.js";

export const responsiveRows = ["A long alpha category", "A long beta category", "A long gamma category", "A long delta category"]
  .map((x, index) => ({ x, y: index + 1 }));

export function createResponsiveGuides(width = 400) {
  return chart()
    .createCanvas({ width, height: 320, margin: 20, responsive: {} })
    .createData({ values: responsiveRows })
    .createBarPlot({ x: "x", y: "y", guides: {
      axes: { x: { ticksAndLabels: { labels: { responsive: {} } } }, y: {} },
      legend: false
    } });
}
