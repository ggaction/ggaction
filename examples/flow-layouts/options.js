import { canvas, variants, dagNodes, dagEdges, cyclicNodes, cyclicEdges, colors } from "./fixture.js";
export function flowProgramOptions(id = "dag") {
  const variant = variants.find(value => value.id === id);
  if (!variant) throw new Error(`Unknown flow variant ${id}.`);
  const nodes = variant.method === "dag" ? dagNodes : cyclicNodes;
  const edges = variant.method === "dag" ? dagEdges : cyclicEdges;
  return {
    canvas,
    nodes: { id: "nodes", values: nodes, keyField: "id" },
    edges: { id: "edges", values: edges, keyField: "id" },
    flow: { id: "flow", nodes: "nodes", edges: "edges", nodeKey: "id", source: "from", target: "to", edgeKey: "id", value: "value", balance: "strict" },
    layout: { id: "layout", method: variant.method, options: { width: variant.orientation === "vertical" ? 240 : 400,
      height: variant.orientation === "vertical" ? 400 : 240, nodeWidth: 20, nodePadding: variant.method === "dag" ? 20 : 160, iterations: 0, laneGap: 10, orientation: variant.orientation } },
    links: { links: { opacity: .55, overrides: edges.map((edge, i) => ({ key: edge.id, fill: colors[i] })) } },
    marks: { nodes: { overrides: nodes.map((node, i) => ({ key: node.id, fill: colors[i] })) },
      labels: { content: "value", fill: "#ffffff", fontSize: 14, fontWeight: 600 } },
    title: { text: variant.title, subtitle: "Ribbon thickness preserves the explicit source values",
      align: "left", alongOffset: 0, offset: 2, gap: 8,
      titleStyle: { color: "#0f172a", fontSize: 20, fontFamily: "sans-serif", fontWeight: 600 },
      subtitleStyle: { color: "#64748b", fontSize: 12, fontFamily: "sans-serif", fontWeight: 400 } }
  };
}
