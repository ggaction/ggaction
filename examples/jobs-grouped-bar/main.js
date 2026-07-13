import { render } from "../../src/index.js";
import { createJobsGroupedBar } from "./program.js";

const response = await fetch("../../data/jobs.json");
const jobs = await response.json();
const program = createJobsGroupedBar(jobs);

const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
document.querySelector("#status").textContent =
  `${program.semanticSpec.datasets[0].values.length} job records grouped`;
