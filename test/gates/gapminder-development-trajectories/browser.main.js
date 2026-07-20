import { render } from "../../../src/index.js";
import { createDevelopmentTrajectoryPrimitives } from "./primitive.program.js";

const response = await fetch("/data/gapminder.json");
if (!response.ok) {
  throw new Error(`Gapminder request failed with ${response.status}.`);
}
const gapminder = await response.json();
const program = createDevelopmentTrajectoryPrimitives(gapminder);
const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"), { pixelRatio: 2 });
document.querySelector("#status").textContent = "Rendered";
window.__ggactionGate = Object.freeze({
  program,
  logicalWidth: 760,
  logicalHeight: 500,
  pathCount: program.graphicSpec.objects.trajectories.items.length
});
