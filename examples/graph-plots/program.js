import { chart } from "../../src/index.js";
import { graphProgramOptions } from "./options.js";

export function createGraph(id = "directed") {
  const [canvas, nodes, edges, graph, layout, plot, filter] = graphProgramOptions(id).map(([, options]) => options);
  const program = chart()
    .createCanvas(canvas)
    .createData(nodes)
    .createData(edges)
    .createGraphData(graph)
    .layoutGraph(layout)
    .createGraphPlot(plot);
  return filter === undefined ? program : program.filterMarks(filter);
}
