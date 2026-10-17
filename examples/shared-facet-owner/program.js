import { chart } from "../../src/index.js";
export const layout = Object.freeze({ plot: { width: 60, height: 120 },
  margin: { top: 33, right: 35, bottom: 30, left: 35 } });
export const rows = Object.freeze([
  { x: 1, y: 1, panel: "One", group: "A" }, { x: 2, y: 2, panel: "Two", group: "B" },
  { x: 3, y: 3, panel: "Three", group: "C" }, { x: 4, y: 4, panel: "Four", group: "A" }
]);
export const scatter = Object.freeze({
  x: { field: "x", scale: { domain: [0, 5], nice: false } },
  y: { field: "y", scale: { domain: [0, 5], nice: false } },
  color: { field: "group", scale: { range: ["#4c78a8", "#f58518", "#54a24b"] } }, guides: false
});
export const facets = Object.freeze({ field: "panel", columns: 4, spacing: "plot", gap: 45,
  guides: { legend: { position: "bottom", direction: "horizontal", columns: 3,
    title: false, itemGap: 87.52, symbol: { layers: [{ type: "point", size: 4 }] },
    border: { color: "#999999", lineWidth: 1, padding: 12, background: "none" } } } });
export const publicCalls = Object.freeze([
  { op: "createCanvas", args: layout }, { op: "createData", args: { id: "source", values: rows } },
  { op: "createScatterPlot", args: scatter },
  { op: "editCanvas", args: { plotBorder: { color: "#dddddd", lineWidth: 1 } } },
  { op: "facet", args: facets }, { op: "editLegendLayout", args: { position: "bottom" } }
]);
export function createSharedFacetOwner() {
  return chart().createCanvas(layout).createData({ id: "source", values: rows }).createScatterPlot(scatter)
    .editCanvas({ plotBorder: { color: "#dddddd", lineWidth: 1 } })
    .facet(facets).editLegendLayout({ position: "bottom" });
}
