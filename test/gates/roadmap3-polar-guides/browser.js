import { render } from "../../../src/index.js";

import { createCarsPolarGuidePrimitives } from "./primitive.program.js";

const response = await fetch("../../../data/cars.json");
const program = createCarsPolarGuidePrimitives(await response.json());
const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));

window.__polarGuides = Object.freeze({
  width: canvas.width,
  height: canvas.height,
  points: program.graphicSpec.objects.point.items.length,
  thetaLabels: program.graphicSpec.objects.thetaAxisLabels.items.length,
  radialLabels: program.graphicSpec.objects.radialAxisLabels.items.length
});
