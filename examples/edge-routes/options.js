import { routeNodes, routeEdges, routePositions, routeCanvas } from "./data.js";

export function edgeRouteProgramOptions(method = "edge-path") {
  return [
    ["createCanvas", routeCanvas],
    ["createData", { id: "nodes", values: routeNodes, keyField: "id" }],
    ["createData", { id: "edges", values: routeEdges, keyField: "id" }],
    ["createGraphData", { id: "network", nodes: "nodes", edges: "edges", nodeKey: "id", source: "source", target: "target", edgeKey: "id" }],
    ["layoutGraph", { id: "placement", method: "fixed", options: { positions: routePositions } }],
    ["bundleGraphEdges", { id: "routes", method }],
    ["createGraphPlot", { id: "routesPlot", routes: "routes", origin: [0, 0], nodes: { radius: 6 },
      edges: { stroke: "#2563eb", strokeWidth: 2, arrows: false }, labels: { fontSize: 14, offset: [0, 20] } }]
  ];
}
