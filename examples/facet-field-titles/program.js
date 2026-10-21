import { createRegionChart } from "../facet-header-rotation/program.js";

export function createFacetFieldTitles() {
  return createRegionChart()
    .editCanvas({ margin: { left: 80, top: 20, right: 15, bottom: 30 } })
    .facet({ field: "region", columns: 1, headers: { fontSize: 12, fontWeight: 400,
      column: { side: "left", offset: 35, rotation: -Math.PI / 2 } } })
    .editFacetGuides({ axes: "outer", legend: false })
    .editCompositionLayout({ spacing: "plot", gap: 25 })
    .editFacetHeaders({ role: "column", title: { text: "Region", offset: 64 } });
}
