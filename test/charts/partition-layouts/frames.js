import { partitionFrameEndpoints } from "../../support/partition-frames.js";
import { createPartitionFramePlan, samplePartitionFrame } from "../../../src/materialization/hierarchy/partitionFrames.js";

export const frameVariants = Object.freeze([0, .5, 1].map(progress => Object.freeze({
  variant: progress === .5 ? "bend-half" : `bend-${progress}`, progress,
  title: `Partition frame · ${progress}`, width: 480, height: 360
})));

// Test renderer input for a private animation preparation helper. The future
// player will own this assembly; this fixture adds no public animation API.
export function partitionFrameProgram(progress) {
  const { before, after } = partitionFrameEndpoints();
  const frame = samplePartitionFrame(createPartitionFramePlan(before, after, { target: "partitionPlot" }), progress);
  const graphicSpec = structuredClone(before.graphicSpec);
  graphicSpec.objects.partitionPlot.items = frame.groups[0].graphics;
  return { graphicSpec };
}
