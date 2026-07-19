import { render } from "../../src/index.js";
import { createGapminderPopulationDonut } from "./program.js";

const response = await fetch("../../data/gapminder.json");
const program = createGapminderPopulationDonut(await response.json());
const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
document.querySelector("#status").textContent = "Rendered Gapminder population donut.";

window.__gapminderPopulationDonut = Object.freeze({
  width: canvas.width,
  height: canvas.height,
  paths: program.graphicSpec.objects.arc.items.length,
  rows: program.semanticSpec.datasets[0].values.length
});
