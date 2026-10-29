import { chart, hconcat } from "../../src/index.js";

export const nestedRows = Array.from({ length: 5 }, (_, group) =>
  Array.from({ length: 4 }, (_, index) => ({
    panel: `Region ${group + 1}`, category: `Category ${index + 1} long caption`,
    value: (index + 1) * (group + 1), series: index % 2 ? "B" : "A"
  }))).flat();

export function createNestedResponsiveSource() {
  return chart()
    .createCanvas({ width: 340, height: 300, margin: 20,
      responsive: { minPlotSize: { width: 100, height: 100 } },
      plotBorder: { color: "#334155", lineWidth: 2 } })
    .createData({ id: "rows", values: nestedRows })
    .createBarPlot({ id: "bars", x: "category", y: "value", color: "series", guides: {
      axes: { x: { ticksAndLabels: { labels: { responsive: { maxLines: 2 } } } }, y: {} },
      legend: false
    } });
}

export function createNestedResponsive() {
  const source = createNestedResponsiveSource();
  const panels = source.facet({ field: "panel", columns: 2, spacing: "content",
    gap: { x: 24, y: 32 }, headers: { anchor: "view", rotation: 0.2 },
    guides: { axes: "outer", legend: { position: "right", border: { color: "#334155", lineWidth: 1 } } }
  }).createTitle({ text: "Regional detail" });
  return hconcat({ id: "report", programs: [
    { id: "panels", program: panels },
    { id: "overview", program: source.createTitle({ text: "All regions" }) }
  ], gap: 32, align: "start" });
}
