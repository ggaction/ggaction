import { createJobsGroupedBar } from "../../../examples/jobs-grouped-bar/program.js";
import { loadJobs } from "../../support/data.js";
import {
  defineVisualVariant,
  registerVisualVariantTests
} from "../../support/visual-variants.js";
import { createJobsGroupedBarPrimitives } from "./primitive.program.js";

const jobs = loadJobs();

registerVisualVariantTests([defineVisualVariant({
  chart: "jobs-grouped-bar",
  variant: "baseline",
  title: "Jobs Grouped Bar",
  callChain: "createJobsGroupedBar(rows)",
  primitive: createJobsGroupedBarPrimitives(jobs),
  userFacing: createJobsGroupedBar(jobs),
  width: 720,
  height: 460,
  colors: ["#4c78a8", "#f58518"],
  regions: [{ name: "plot", x: 80, y: 40, width: 500, height: 350, minimumInkPixels: 200 }],
  artifact: false
})]);
