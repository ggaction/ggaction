import { chart } from "../../src/index.js";
import { regionRows } from "./data.js";

export function createRegionChart(values = regionRows) {
  return chart()
    .createCanvas({ plot: { width: 120, height: 60 }, margin: { left: 50, top: 20, right: 15, bottom: 30 } })
    .createData({ values })
    .createLinePlot({ x: { field: "month", scale: { domain: [1, 3] } }, y: { field: "value", scale: { domain: [0, 4] } }, guides: false })
    .createAxes({ x: { title: false, ticksAndLabels: { values: [1, 2, 3], labels: { fontSize: 10 } } }, y: { title: false, ticksAndLabels: { values: [0, 2, 4], labels: { fontSize: 10 } } } })
    .createGrid({ horizontal: { values: [0, 2, 4], color: "#e2e8f0" } });
}

export function createFacetHeaderRotation(values = regionRows) {
  return createRegionChart(values)
    .facet({ field: "region", columns: 1, headers: { fontSize: 12, fontWeight: 400, column: { side: "left", offset: 35, rotation: { value: -90, unit: "degrees" } } } })
    .editFacetGuides({ axes: "outer", legend: false })
    .editCompositionLayout({ spacing: "plot", gap: 25 });
}
