import { render } from "../../src/index.js";

import { createCarsScatterplot } from "./program.js";

const response = await fetch("../../data/cars.json");
const cars = await response.json();
const rows = cars.filter(
  car =>
    Number.isFinite(car.Horsepower) &&
    Number.isFinite(car.Miles_per_Gallon)
);
const program = createCarsScatterplot(rows);

const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
document.querySelector("#status").textContent = `${rows.length} cars rendered`;
