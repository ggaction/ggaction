import { chart } from "../../src/index.js";
import { graphProgramOptions } from "./options.js";

export function createGraph(id = "directed") {
  const steps = graphProgramOptions(id), [canvas, nodes] = steps;
  const source = chart().createCanvas(canvas[1]).createData(nodes[1]);
  const inferred = steps[2][0] === "createInferredGraphData";
  const graph = inferred ? source.createInferredGraphData(steps[2][1])
    : source.createData(steps[2][1]).createGraphData(steps[3][1]);
  const [layout, plot, filter] = steps.slice(inferred ? 3 : 4);
  const program = graph.layoutGraph(layout[1]).createGraphPlot(plot[1]);
  return filter === undefined ? program : program.filterMarks(filter[1]);
}
