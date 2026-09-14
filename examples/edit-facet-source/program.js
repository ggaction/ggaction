import { chart } from "../../src/index.js";

export function createFacetSourceWorkflow() {
  function source(values) {
    return chart()
      .createCanvas({ width: 320, height: 300, margin: { top: 55, right: 25, bottom: 95, left: 65 } })
      .createData({ id: "rows", values })
      .createScatterPlot({ id: "points", x: "x", y: "y", color: "kind",
        guides: { legend: false } });
  }
  const values = [
    { panel: "N", kind: "A", x: 1, y: 2 }, { panel: "N", kind: "B", x: 3, y: 4 },
    { panel: "S", kind: "A", x: 2, y: 3 }, { panel: "S", kind: "B", x: 4, y: 1 }
  ];
  const before = source(values).facet({ field: "panel", values: ["N", "S"],
    scales: { x: "shared", y: "shared", color: "shared" },
    guides: { axes: "each", legend: "shared" }, gap: 20 });
  return before
    .editFacetSource({ program: source(values.map(row => ({ ...row, y: row.y + 1 }))) })
    .editFacetHeaders({ role: "column", labelMap: [
      { value: "N", label: "North: revised source" },
      { value: "S", label: "South: revised source" }
    ], align: "center", side: "top" })
    .editFacetGuides({ axes: "outer", legend: "shared" });
}
