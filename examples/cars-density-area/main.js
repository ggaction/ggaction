import { render } from "../../src/index.js";
import { createCarsDensityArea } from "./program.js";

const response = await fetch("../../data/cars.json");
const cars = await response.json();
const program = createCarsDensityArea(cars);

const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
document.querySelector("#status").textContent =
  `${program.graphicSpec.objects.densities.children.length} Origin density curves from ${cars.length} cars`;
