export const canvas = { width: 300, height: 240, margin: 0, background: "#ffffff" };
export const variants = [
  { id: "directed", title: "Directed graph", directed: true,
    nodes: [{ id: "A" }, { id: "B" }], edges: [{ source: "A", target: "B" }],
    positions: [{ key: "A", x: 60, y: 120 }, { key: "B", x: 240, y: 120 }],
    paths: [
      [{ op: "M", x: 70, y: 120 }, { op: "C", x1: 120, y1: 120, x2: 180, y2: 120, x: 230, y: 120 }],
      [{ op: "M", x: 230, y: 120 }, { op: "L", x: 222, y: 124 }, { op: "L", x: 222, y: 116 }, { op: "Z" }]
    ], pathFills: ["none", "#64748b"], pathStrokes: ["#64748b", "none"], pathWidths: [2, 0] },
  { id: "parallel", title: "Parallel directed edges", directed: true,
    nodes: [{ id: "A" }, { id: "B" }], edges: [{ source: "A", target: "B" }, { source: "A", target: "B" }],
    positions: [{ key: "A", x: 60, y: 120 }, { key: "B", x: 240, y: 120 }],
    paths: [
      [{ op: "M", x: 68, y: 114 }, { op: "C", x1: 120, y1: 75, x2: 180, y2: 75, x: 232, y: 114 }],
      [{ op: "M", x: 232, y: 114 }, { op: "L", x: 223.2, y: 112.4 }, { op: "L", x: 228, y: 106 }, { op: "Z" }],
      [{ op: "M", x: 68, y: 126 }, { op: "C", x1: 120, y1: 165, x2: 180, y2: 165, x: 232, y: 126 }],
      [{ op: "M", x: 232, y: 126 }, { op: "L", x: 228, y: 134 }, { op: "L", x: 223.2, y: 126 + 4.8 - 3.2 }, { op: "Z" }]
    ], pathFills: ["none", "#64748b", "none", "#64748b"], pathStrokes: ["#64748b", "none", "#64748b", "none"], pathWidths: [2, 0, 2, 0] },
  { id: "self-loop", title: "A retained self-loop", directed: false,
    nodes: [{ id: "A" }], edges: [{ source: "A", target: "A" }],
    positions: [{ key: "A", x: 150, y: 150 }],
    paths: [[{ op: "M", x: 140, y: 150 }, { op: "C", x1: 108, y1: 86, x2: 192, y2: 86, x: 160, y: 150 }]],
    pathFills: ["none"], pathStrokes: ["#64748b"], pathWidths: [2] }
];
variants.push({ ...variants[0], id: "induced", title: "Induced graph view",
  nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
  edges: [{ source: "A", target: "B" }, { source: "B", target: "C" }],
  positions: [...variants[0].positions, { key: "C", x: 240, y: 210 }],
  visiblePositions: variants[0].positions,
  filter: { target: "networkPlot", field: "key", op: "oneOf", values: ["A", "B"] }
});
variants.push({ ...variants[0], id: "recomputed", title: "Recomputed sequence after filtering",
  nodes: [{ id: "A", order: 0 }, { id: "B", order: 1 }, { id: "C", order: 2 }],
  positions: [{ key: "A", x: 60, y: 120 }, { key: "B", x: 150, y: 210 }, { key: "C", x: 240, y: 120 }],
  visiblePositions: [{ key: "A", x: 60, y: 120 }, { key: "C", x: 240, y: 120 }],
  inference: { nodeKey: "id", rule: "sequence", ruleId: "sequence", options: { orderField: "order" } },
  filter: { target: "networkPlot", field: "key", op: "oneOf", values: ["A", "C"], recompute: true }
});
export function graphVariant(id) {
  const variant = variants.find(value => value.id === id);
  if (!variant) throw new Error(`Unknown graph variant ${id}.`);
  return variant;
}
