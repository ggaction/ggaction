import test from "node:test";

import { createJobsGroupedBar } from "../../examples/jobs-grouped-bar/program.js";
import { loadJobs } from "../fixtures/data.js";
import { assertRenderedPNG } from "../helpers/renderPNG.js";
import { createJobsGroupedBarPrimitives } from "../programs/jobsGroupedBarPrimitives.js";

const jobs = loadJobs();

test("renders the public and primitive grouped bars with visible categories", async () => {
  for (const [name, program] of [
    ["jobs-grouped-bar", createJobsGroupedBar(jobs)],
    ["jobs-grouped-bar-primitives", createJobsGroupedBarPrimitives(jobs)]
  ]) {
    await assertRenderedPNG(program, {
      name,
      width: 720,
      height: 460,
      colors: ["#4c78a8", "#f58518"]
    });
  }
});
