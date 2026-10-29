import { chart } from "../../src/index.js";
import { graphProgramOptions } from "./options.js";

export function createGraph(id = "directed") {
  const [canvas, nodes, edges, graph, layout, plot] = graphProgramOptions(id).map(([, options]) => options);
  return chart()
    .createCanvas(canvas)
    .createData(nodes)
    .createData(edges)
    .createGraphData(graph)
    .layoutGraph(layout)
    .createGraphPlot(plot);
}
