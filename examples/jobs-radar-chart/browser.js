import { render } from "../../src/index.js";
import { createJobsRadarChart } from "./program.js";

const response = await fetch("../../data/jobs.json");
const program = createJobsRadarChart(await response.json());
const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
document.querySelector("#status").textContent = "Rendered Jobs radar chart.";

window.__jobsRadarChart = Object.freeze({
  width: canvas.width,
  height: canvas.height,
  paths: program.graphicSpec.objects.line.items.length,
  closed: program.graphicSpec.objects.line.items.every(item =>
    item.properties.commands.at(-1).op === "Z"
  )
});
