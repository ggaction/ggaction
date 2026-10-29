import { chart } from "../../src/index.js";
import { edgeRouteProgramOptions } from "./options.js";

export function createEdgeRoutes(method = "edge-path") {
  const [canvas, nodes, edges, graph, layout, routes, plot] = edgeRouteProgramOptions(method);
  return chart().createCanvas(canvas[1]).createData(nodes[1]).createData(edges[1])
    .createGraphData(graph[1]).layoutGraph(layout[1]).bundleGraphEdges(routes[1]).createGraphPlot(plot[1]);
}
