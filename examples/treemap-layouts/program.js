import { chart } from "../../src/index.js";
import { treemapProgramOptions } from "./options.js";

export function createTreemap(variantId = "slice-dice") {
  const options = treemapProgramOptions(variantId);
  return chart()
    .createCanvas(options.createCanvas)
    .createData(options.createData)
    .createHierarchyData(options.createHierarchyData)
    .layoutHierarchy(options.layoutHierarchy)
    .createTreemapPlot(options.createTreemapPlot)
    .createTitle(options.createTitle);
}
