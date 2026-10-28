import { canvas, rows, labels, colors, offset, variants } from "./fixture.js";

export function treemapProgramOptions(variantId = "slice-dice") {
  const variant = variants.find(item => item.id === variantId);
  if (!variant) throw new Error(`Unknown treemap variant ${variantId}.`);
  const keys = ["Root", "A", "A1", "A2", "B"];
  return {
    createCanvas: canvas,
    createData: { id: "hierarchy-source", values: rows, keyField: "id" },
    createHierarchyData: { id: "hierarchy", key: "id", parent: "parent", value: "value" },
    layoutHierarchy: { id: "layout", method: "treemap", options: variant.options },
    createTreemapPlot: { origin: [offset[0], offset[1] - canvas.margin.top],
      cells: { strokeWidth: 2, overrides: keys.map((key, index) => ({ key, fill: colors[index] })) },
      labels: { fontWeight: 500, overrides: keys.map((key, index) => ({ key, text: labels[index],
        fill: ["#475569", "#1e40af", "#0f172a", "#ffffff", "#0f172a"][index], fontSize: index < 2 ? 11 : 16 })) } },
    createTitle: { text: variant.title, subtitle: "Leaf values 2, 4 and 4; nested padding preserves the hierarchy",
      align: "left", alongOffset: 32, offset: 2, gap: 8,
      titleStyle: { color: "#0f172a", fontSize: 20, fontFamily: "sans-serif", fontWeight: 600 },
      subtitleStyle: { color: "#64748b", fontSize: 12, fontFamily: "sans-serif", fontWeight: 400 } }
  };
}
