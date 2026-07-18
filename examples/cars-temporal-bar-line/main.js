import { render } from "../../src/index.js";
import { createCarsTemporalBarLine } from "./program.js";

const response = await fetch("../../data/cars.json");
const cars = await response.json();
const program = createCarsTemporalBarLine(cars);

const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
document.querySelector("#status").textContent =
  `${program.graphicSpec.objects.bars.items.length} model years on one shared scale`;
