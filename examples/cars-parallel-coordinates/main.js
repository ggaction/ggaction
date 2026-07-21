import { render } from "../../src/index.js";
import { createCarsParallelCoordinates } from "./program.js";

const response = await fetch("../../data/cars.json");
if (!response.ok) {
  throw new Error(`Cars request failed with ${response.status}.`);
}
const program = createCarsParallelCoordinates(await response.json());
const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
document.querySelector("#status").textContent = "Rendered";
window.__carsParallelCoordinates = Object.freeze({
  width: 860,
  height: 500,
  paths: program.graphicSpec.objects.parallelCoordinates.items.length,
  axes: program.graphicSpec.objects.parallelAxisLines.items.length
});
