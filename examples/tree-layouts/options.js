import { canvas, rows, labels, colors, variants } from "./fixture.js";

export function treeProgramOptions(variantId = "vertical") {
  const variant = variants.find(item => item.id === variantId);
  if (!variant) throw new Error(`Unknown tree variant ${variantId}.`);
  const keys = ["Root", "A", "A1", "A2", "B"];
  return {
    createCanvas: canvas,
    createData: { id: "hierarchy-source", values: rows, keyField: "id" },
    createHierarchyData: { id: "hierarchy", key: "id", parent: "parent", value: "value" },
    layoutHierarchy: { id: "layout", method: "tree", options: variant.options },
    createTreePlot: { origin: [variant.translate[0], variant.translate[1] - canvas.margin.top],
      nodes: { radius: 18, strokeWidth: 2, overrides: keys.map((key, index) => ({ key, fill: colors[index] })) },
      links: { strokeWidth: 2 },
      labels: { offset: [0, 32], fontSize: 14, overrides: keys.map((key, index) => ({ key, text: labels[index] })) } },
    createTitle: { text: variant.title, subtitle: "One hierarchy, five stable nodes and four parent links",
      align: "left", alongOffset: 32, offset: 2, gap: 8,
      titleStyle: { color: "#0f172a", fontSize: 20, fontFamily: "sans-serif", fontWeight: 600 },
      subtitleStyle: { color: "#64748b", fontSize: 12, fontFamily: "sans-serif", fontWeight: 400 } }
  };
}
