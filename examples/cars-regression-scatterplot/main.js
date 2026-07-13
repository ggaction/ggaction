import { render } from "../../src/index.js";
import { createCarsRegressionScatterplot } from "./program.js";

const response = await fetch("../../data/cars.json");
const cars = await response.json();
const program = createCarsRegressionScatterplot(cars);

const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
document.querySelector("#status").textContent =
  "Japan and USA: points, linear fits, and 95% confidence bands";
