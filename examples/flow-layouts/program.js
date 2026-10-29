import { chart } from "../../src/index.js";
import { flowProgramOptions } from "./options.js";
export function createFlow(id = "dag") {
  const options = flowProgramOptions(id);
  return chart()
    .createCanvas(options.canvas)
    .createData(options.nodes)
    .createData(options.edges)
    .createFlowData(options.flow)
    .layoutFlow(options.layout)
    .createFlowLinks(options.links)
    .createFlowNodes(options.marks)
    .createTitle(options.title);
}
