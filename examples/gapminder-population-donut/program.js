import { chart } from "../../src/index.js";

export const CLUSTER_ORDER = Object.freeze([0, 1, 2, 3, 4, 5]);
export const CLUSTER_COLORS = Object.freeze([
  "#4c78a8",
  "#f58518",
  "#e45756",
  "#72b7b2",
  "#54a24b",
  "#eeca3b"
]);

export function createGapminderPopulationDonut(gapminder) {
  const rows = gapminder.filter(row => row.year === 2005);
  return chart()
    .createCanvas({
      width: 680,
      height: 520,
      margin: { top: 65, right: 200, bottom: 55, left: 55 }
    })
    .createData({ values: rows })
    .createArcMark({ innerRadius: 0.5, padAngle: 1.25, opacity: 0.96 })
    .encodeTheta({
      field: "cluster",
      fieldType: "nominal",
      aggregate: "sum",
      weight: "pop",
      scale: { domain: CLUSTER_ORDER }
    })
    .encodeColor({
      field: "cluster",
      fieldType: "nominal",
      scale: { domain: CLUSTER_ORDER, range: CLUSTER_COLORS }
    })
    .createGuides({
      axes: false,
      grid: false,
      legend: { position: "right", title: "Cluster" }
    });
}
