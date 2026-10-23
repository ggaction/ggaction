import { createRegionChart } from "../../../examples/facet-header-rotation/program.js";

export function createFacetFieldTitlesPrimitives() {
  return createRegionChart()
    .editCanvas({ margin: { left: 80, top: 20, right: 15, bottom: 30 } })
    .facet({ field: "region", columns: 1, headers: { fontSize: 12, fontWeight: 400,
      column: { side: "left", offset: 35, rotation: -Math.PI / 2 } } })
    .editFacetGuides({ axes: "outer", legend: false })
    .editCompositionLayout({ spacing: "plot", gap: 25 })
    .editGraphics({ target: "facet-headers", property: "items", value: [
      { type: "text", properties: { x: 39, y: 50, text: "North", fill: "#0f172a", fontSize: 12, fontFamily: "sans-serif", fontWeight: 400, textAlign: "center", textBaseline: "middle", rotation: -Math.PI / 2 } },
      { type: "text", properties: { x: 39, y: 135, text: "South", fill: "#0f172a", fontSize: 12, fontFamily: "sans-serif", fontWeight: 400, textAlign: "center", textBaseline: "middle", rotation: -Math.PI / 2 } },
      { type: "text", properties: { x: 10, y: 92.5, text: "Region", fill: "#0f172a", fontSize: 12, fontFamily: "sans-serif", fontWeight: 400, textAlign: "center", textBaseline: "middle", rotation: -Math.PI / 2 } }
    ] });
}
