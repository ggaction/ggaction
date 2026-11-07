import { routeNodes, routeEdges, routePositions, routeCanvas, routeMethods, routeHierarchyRows, hierarchyRoutePositions } from "./data.js";

export function edgeRouteProgramOptions(method = "edge-path") {
  if (!routeMethods.includes(method)) throw new Error(`Unknown edge route method: ${method}`);
  return [
    ["createCanvas", routeCanvas],
    ...(method === "hierarchical" ? hierarchyRouteProgramOptions() : []),
    ["createData", { id: "nodes", values: routeNodes, keyField: "id" }],
    ["createData", { id: "edges", values: routeEdges, keyField: "id" }],
    ["createGraphData", { id: "network", nodes: "nodes", edges: "edges", nodeKey: "id", source: "source", target: "target", edgeKey: "id" }],
    ["layoutGraph", { id: "placement", method: "fixed", options: { positions: method === "hierarchical" ? hierarchyRoutePositions : routePositions } }],
    ["bundleGraphEdges", { id: "routes", method, ...(method === "hierarchical" ? { options: {
      hierarchy: "hierarchy", hierarchyLayout: "branches", mapping: routeNodes.map(node => ({ nodeKey: node.id, hierarchyKey: node.id }))
    } } : {}) }],
    ["createGraphPlot", { id: "routesPlot", routes: "routes", origin: method === "hierarchical" ? [160, 60] : [0, 0], nodes: { radius: 6 },
      edges: { stroke: "#2563eb", strokeWidth: 2, arrows: false }, labels: { fontSize: 14, offset: [0, 20] } }]
  ];
}

export function hierarchyRouteProgramOptions() {
  return [
    ["createData", { id: "tree", keyField: "id", values: routeHierarchyRows }],
    ["createHierarchyData", { id: "hierarchy", data: "tree", key: "id", parent: "parent", value: "value" }],
    ["layoutHierarchy", { id: "branches", method: "tree", options: { nodeSize: [20, 20], siblingGap: 180, depthGap: 100, orientation: "vertical" } }]
  ];
}
