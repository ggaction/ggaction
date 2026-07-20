import { render } from "../../src/index.js";
import { createCarsGradientPlot } from "./program.js";

const response = await fetch("../../data/cars.json");
if (!response.ok) throw new Error(`Failed to load cars: ${response.status}`);
const cars = await response.json();
const program = createCarsGradientPlot(cars);

render(program, document.querySelector("#chart").getContext("2d"));
document.querySelector("#status").textContent =
  `Density profiles from ${cars.length} cars`;
