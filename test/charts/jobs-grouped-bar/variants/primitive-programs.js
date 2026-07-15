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
