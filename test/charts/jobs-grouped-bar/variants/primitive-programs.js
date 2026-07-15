import { createJobsGroupedBarPrimitives } from "../primitive.program.js";

export function createOverlayLayoutPrimitives(jobs) {
  return createJobsGroupedBarPrimitives(jobs, { layout: "overlay" });
}

export function createDivergingLayoutPrimitives(jobs) {
  return createJobsGroupedBarPrimitives(jobs, {
    field: "signedPerc",
    layout: "diverging"
  });
}

export function createFixedPixelWidthPrimitives(jobs) {
  return createJobsGroupedBarPrimitives(jobs, { pixels: 14 });
}

export function createOffsetPaddingPrimitives(jobs) {
  return createJobsGroupedBarPrimitives(jobs, {
    paddingInner: 0.2,
    paddingOuter: 0.1
  });
}

export function createGroupReassignmentPrimitives(jobs) {
  return createJobsGroupedBarPrimitives(jobs, {
    groupField: "job",
    legendTitle: "Occupation"
  });
}
