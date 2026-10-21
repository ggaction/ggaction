import { createRegionChart } from "../../../examples/facet-header-rotation/program.js";

// The established facet body is unchanged; its header target is an explicit concrete collection.
export function createFacetHeaderRotationPrimitives() {
  return createRegionChart()
    .facet({ field: "region", columns: 1, headers: { fontSize: 12, fontWeight: 400, labelMap: [{ value: "North", label: "" }, { value: "South", label: "" }] } })
    .editFacetGuides({ axes: "outer", legend: false })
    .editCompositionLayout({ spacing: "plot", gap: 25 })
    .editGraphics({ target: "facet-headers", property: "items", value: [
      { type: "text", properties: { x: 9, y: 50, text: "North", fill: "#0f172a", fontSize: 12, fontFamily: "sans-serif", fontWeight: 400, textAlign: "center", textBaseline: "middle", rotation: -Math.PI / 2 } },
      { type: "text", properties: { x: 9, y: 135, text: "South", fill: "#0f172a", fontSize: 12, fontFamily: "sans-serif", fontWeight: 400, textAlign: "center", textBaseline: "middle", rotation: -Math.PI / 2 } }
    ] });
}
