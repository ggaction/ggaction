import { render } from "../../src/index.js";
import { createCarsBoxPlot } from "./program.js";

const response = await fetch("../../data/cars.json");
if (!response.ok) throw new Error(`Failed to load cars: ${response.status}`);
const cars = await response.json();
const program = createCarsBoxPlot(cars);

const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
document.querySelector("#status").textContent =
  `Tukey distributions from ${cars.length} cars`;
