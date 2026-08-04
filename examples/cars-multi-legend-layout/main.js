import { render } from "../../src/index.js";
import { createCarsMultiLegendLayout } from "./program.js";

const response = await fetch("../../data/cars.json");
const cars = await response.json();
const program = createCarsMultiLegendLayout(cars);

const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
document.querySelector("#status").textContent =
  "Origin and acceleration legends share one aligned top lane";
