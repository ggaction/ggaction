import { chart } from "../../src/index.js";
import { treeProgramOptions } from "./options.js";

export function createTree(variantId = "vertical") {
  const options = treeProgramOptions(variantId);
  return chart()
    .createCanvas(options.createCanvas)
    .createData(options.createData)
    .createHierarchyData(options.createHierarchyData)
    .layoutHierarchy(options.layoutHierarchy)
    .createTreePlot(options.createTreePlot)
    .createTitle(options.createTitle);
}
