import { chart } from "../../src/index.js";
import { edgeRouteProgramOptions } from "./options.js";

export function createEdgeRoutes(method = "edge-path") {
  const steps = edgeRouteProgramOptions(method), [canvas] = steps;
  let program = chart().createCanvas(canvas[1]);
  if (method === "hierarchical") program = program.createData(steps[1][1])
    .createHierarchyData(steps[2][1]).layoutHierarchy(steps[3][1]);
  const [nodes, edges, graph, layout, routes, plot] = steps.slice(method === "hierarchical" ? 4 : 1);
  return program.createData(nodes[1]).createData(edges[1])
    .createGraphData(graph[1]).layoutGraph(layout[1]).bundleGraphEdges(routes[1]).createGraphPlot(plot[1]);
}
