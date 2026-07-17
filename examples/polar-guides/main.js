import { render } from "../../src/index.js";

import { createCarsPolarGuides } from "./program.js";

const response = await fetch("../../data/cars.json");
const program = createCarsPolarGuides(await response.json());
const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));

document.querySelector("#status").textContent =
  `${program.graphicSpec.objects.point.items.length} cars rendered`;
window.__polarGuides = Object.freeze({
  width: canvas.width,
  height: canvas.height,
  points: program.graphicSpec.objects.point.items.length,
  thetaLabels: program.graphicSpec.objects.thetaAxisLabels.items.length,
  radialLabels: program.graphicSpec.objects.radialAxisLabels.items.length
});
