import { chart } from "../../src/index.js";
import { partitionProgramOptions } from "./options.js";
export function createPartition(id = "icicle") {
  const options = partitionProgramOptions(id);
  let program = chart().createCanvas(options.createCanvas).createData(options.createData)
    .createHierarchyData(options.createHierarchyData).layoutHierarchy(options.layoutHierarchy)
    .createCoordinate(options.createCoordinate);
  if (options.editCoordinate) program = program.editCoordinate(options.editCoordinate);
  return program.createPartitionPlot(options.createPartitionPlot).createTitle(options.createTitle);
}
