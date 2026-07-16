import { render } from "../../src/index.js";
import { createCarsErrorBarOverlay } from "./program.js";

const response = await fetch("../../data/cars.json");
if (!response.ok) throw new Error(`Failed to load cars: ${response.status}`);
const cars = await response.json();
const program = createCarsErrorBarOverlay(cars);

const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
document.querySelector("#status").textContent =
  `Observations and 95% mean confidence intervals from ${cars.length} cars`;
