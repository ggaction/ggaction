import { render } from "../../src/index.js";
import { createCarsHistogram } from "./program.js";

const response = await fetch("../../data/cars.json");
const cars = await response.json();
const program = createCarsHistogram(cars);

const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
document.querySelector("#status").textContent =
  `${program.semanticSpec.datasets[0].values.length} cars binned`;
