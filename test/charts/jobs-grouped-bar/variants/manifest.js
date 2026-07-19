import {
  createJobsDivergingBar,
  createJobsFixedPixelBar,
  createJobsGroupReassignmentBar,
  createJobsGroupedBar,
  createJobsHorizontalBar,
  createJobsOffsetPaddingBar,
  createJobsOverlayBar,
  createJobsTemporalXBar
} from
  "../../../../examples/jobs-grouped-bar/program.js";
import { loadJobs } from "../../../support/data.js";
import { defineVisualVariant } from "../../../support/visual-variants.js";
import { createJobsGroupedBarPrimitives } from "../primitive.program.js";
import {
  createDivergingLayoutPrimitives,
  createFixedPixelWidthPrimitives,
  createGroupReassignmentPrimitives,
  createOffsetPaddingPrimitives,
  createOverlayLayoutPrimitives
} from "./primitive-programs.js";
import {
  createHorizontalBarPrimitives,
  createTemporalXPrimitives
} from "./position-primitive-programs.js";

const jobs = loadJobs();
export const signedJobs = Object.freeze(jobs.map(row => Object.freeze({
  ...row,
  signedPerc: row.sex === "women" ? -Math.abs(row.perc) : Math.abs(row.perc)
})));
const REASSIGNMENT_JOBS = Object.freeze(["Actor", "Agent", "Author"]);
export const reassignmentJobs = Object.freeze(jobs.filter(row =>
  REASSIGNMENT_JOBS.includes(row.job)
));

const shared = Object.freeze({
  chart: "jobs-grouped-bar",
  width: 720,
  height: 460,
  colors: ["#4c78a8", "#f58518"],
  regions: [Object.freeze({
    name: "plot",
    x: 80,
    y: 40,
    width: 500,
    height: 350,
    minimumInkPixels: 200
  })]
});

export const visualVariants = Object.freeze([defineVisualVariant({
  ...shared,
  variant: "baseline",
  title: "Canonical Jobs Bar Baseline",
  callChain: `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 40, right: 140, bottom: 70, left: 80 }
  })
  .createData({ id: "jobs", values: rows })
  .createBarPlot({
    id: "bars",
    x: { field: "year", fieldType: "ordinal" },
    y: {
      field: "perc",
      aggregate: "mean",
      scale: { nice: true, zero: false }
    },
    color: {
      field: "sex",
      layout: "group",
      scale: { palette: "tableau10" }
    },
    width: { band: 0.72 }
  });`,
  primitive: () => createJobsGroupedBarPrimitives(jobs),
  userFacing: () => createJobsGroupedBar(jobs)
}), defineVisualVariant({
  ...shared,
  variant: "overlay-layout",
  title: "Overlay Bar Layout",
  callChain: `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 40, right: 140, bottom: 70, left: 80 }
  })
  .createData({ id: "jobs", values: rows })
  .createBarMark({ id: "bars" })
  .encodeX({ field: "year", fieldType: "ordinal" })
  .encodeY({
    field: "perc",
    aggregate: "mean",
    scale: { nice: true, zero: false }
  })
  .encodeColor({
    field: "sex",
    layout: "overlay",
    scale: { palette: "tableau10" }
  })
  .encodeBarWidth({ band: 0.72 })
  .createGuides();`,
  primitive: () => createOverlayLayoutPrimitives(jobs),
  userFacing: () => createJobsOverlayBar(jobs)
}), defineVisualVariant({
  ...shared,
  variant: "diverging-layout",
  title: "Diverging Bar Layout",
  callChain: `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 40, right: 140, bottom: 70, left: 80 }
  })
  .createData({ id: "jobs", values: rows })
  .createBarMark({ id: "bars" })
  .encodeX({ field: "year", fieldType: "ordinal" })
  .encodeY({
    field: "signedPerc",
    aggregate: "mean",
    scale: { nice: true, zero: false }
  })
  .encodeColor({
    field: "sex",
    layout: "diverging",
    scale: { palette: "tableau10" }
  })
  .encodeBarWidth({ band: 0.72 })
  .createGuides();`,
  primitive: () => createDivergingLayoutPrimitives(signedJobs),
  userFacing: () => createJobsDivergingBar(signedJobs)
}), defineVisualVariant({
  ...shared,
  variant: "width-pixels",
  title: "Fixed 14px Bar Width",
  callChain: `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 40, right: 140, bottom: 70, left: 80 }
  })
  .createData({ id: "jobs", values: rows })
  .createBarMark({ id: "bars" })
  .encodeX({ field: "year", fieldType: "ordinal" })
  .encodeY({
    field: "perc",
    aggregate: "mean",
    scale: { nice: true, zero: false }
  })
  .encodeColor({
    field: "sex",
    layout: "group",
    scale: { palette: "tableau10" }
  })
  .encodeBarWidth({ pixels: 14 })
  .createGuides();`,
  primitive: () => createFixedPixelWidthPrimitives(jobs),
  userFacing: () => createJobsFixedPixelBar(jobs)
}), defineVisualVariant({
  ...shared,
  variant: "offset-padding",
  title: "Grouped Bar Offset Padding",
  callChain: `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 40, right: 140, bottom: 70, left: 80 }
  })
  .createData({ id: "jobs", values: rows })
  .createBarMark({ id: "bars" })
  .encodeX({ field: "year", fieldType: "ordinal" })
  .encodeY({
    field: "perc",
    aggregate: "mean",
    scale: { nice: true, zero: false }
  })
  .encodeColor({
    field: "sex",
    layout: "group",
    scale: { palette: "tableau10" }
  })
  .encodeXOffset({
    field: "sex",
    paddingInner: 0.2,
    paddingOuter: 0.1
  })
  .encodeBarWidth({ band: 0.72 })
  .createGuides();`,
  primitive: () => createOffsetPaddingPrimitives(jobs),
  userFacing: () => createJobsOffsetPaddingBar(jobs)
}), defineVisualVariant({
  ...shared,
  colors: ["#4c78a8", "#f58518", "#e45756"],
  variant: "group-reassignment",
  title: "Grouped Field Reassignment",
  callChain: `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 40, right: 140, bottom: 70, left: 80 }
  })
  .createData({ id: "jobs", values: rows })
  .createBarMark({ id: "bars" })
  .encodeX({ field: "year", fieldType: "ordinal" })
  .encodeY({
    field: "perc",
    aggregate: "mean",
    scale: { nice: true, zero: false }
  })
  .encodeColor({
    field: "sex",
    layout: "group",
    scale: { palette: "tableau10" }
  })
  .encodeBarWidth({ band: 0.72 })
  .createGuides({ legend: { title: "Occupation" } })
  .encodeColor({ field: "job", layout: "group" });`,
  primitive: () => createGroupReassignmentPrimitives(reassignmentJobs),
  userFacing: () => createJobsGroupReassignmentBar(reassignmentJobs)
}), defineVisualVariant({
  ...shared,
  variant: "temporal-x",
  title: "Temporal X Bar Position",
  callChain: `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 40, right: 140, bottom: 70, left: 80 }
  })
  .createData({ id: "jobs", values: rows })
  .createBarMark({ id: "bars" })
  .encodeX({ field: "year", fieldType: "temporal" })
  .encodeY({
    field: "perc",
    aggregate: "mean",
    scale: { nice: true, zero: false }
  })
  .encodeColor({
    field: "sex",
    layout: "group",
    scale: { palette: "tableau10" }
  })
  .encodeBarWidth({ band: 0.72 })
  .createGuides();`,
  primitive: () => createTemporalXPrimitives(jobs),
  userFacing: () => createJobsTemporalXBar(jobs)
}), defineVisualVariant({
  ...shared,
  variant: "horizontal-bar",
  title: "Horizontal Stacked Bar Orientation",
  callChain: `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 40, right: 140, bottom: 70, left: 80 }
  })
  .createData({ id: "jobs", values: rows })
  .createBarMark({ id: "bars" })
  .encodeX({
    field: "perc",
    aggregate: "mean",
    scale: { nice: true, zero: true }
  })
  .encodeY({ field: "year", fieldType: "ordinal" })
  .encodeColor({
    field: "sex",
    layout: "stack",
    scale: { palette: "tableau10" }
  })
  .encodeBarWidth({ band: 0.72 })
  .createGuides();`,
  primitive: () => createHorizontalBarPrimitives(jobs),
  userFacing: () => createJobsHorizontalBar(jobs)
})]);
