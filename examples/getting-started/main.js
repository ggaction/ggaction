import { render } from "../../src/index.js";

import { createGettingStartedChart } from "./program.js";

const cars = await fetch("../../data/cars.json").then(response => response.json());
const program = createGettingStartedChart(cars);
const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
document.querySelector("#status").textContent = "Chart rendered";
