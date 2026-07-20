import { render } from "../../src/index.js";
import { createGapminderDevelopmentTrajectories } from "./program.js";

const response = await fetch("../../data/gapminder.json");
if (!response.ok) {
  throw new Error(`Gapminder request failed with ${response.status}.`);
}
const program = createGapminderDevelopmentTrajectories(await response.json());
const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
document.querySelector("#status").textContent = "Rendered";
window.__gapminderDevelopmentTrajectories = Object.freeze({
  width: 760,
  height: 500,
  paths: program.graphicSpec.objects.trajectories.items.length
});
