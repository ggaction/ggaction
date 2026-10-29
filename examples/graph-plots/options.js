import { canvas, graphVariant } from "./fixture.js";
export function graphProgramOptions(id = "directed") {
  const variant = graphVariant(id);
  return [
    ["createCanvas", canvas],
    ["createData", { id: "nodes", values: variant.nodes, keyField: "id" }],
    ...(variant.inference ? [["createInferredGraphData", { id: "network", data: "nodes", ...variant.inference }]] : [
    ["createData", { id: "edges", values: variant.edges }],
    ["createGraphData", { id: "network", nodes: "nodes", edges: "edges", nodeKey: "id", source: "source", target: "target", directed: variant.directed, selfLoops: true }]]),
    ["layoutGraph", { id: "positions", graph: "network", method: "fixed", options: { positions: variant.positions } }],
    ["createGraphPlot", { id: "networkPlot", layout: "positions", origin: [0, 0], nodes: { radius: 10 }, edges: { stroke: "#64748b", strokeWidth: 2, parallelGap: 90, loopRadius: 32 }, labels: { offset: [0, 24], fontSize: 14 } }],
    ...(variant.filter === undefined ? [] : [["filterMarks", variant.filter]])
  ];
}
