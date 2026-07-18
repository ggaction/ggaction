import { render } from "../../src/index.js";
import { createGapminderLifeExpectancyHeatmap } from "./program.js";

const response = await fetch("../../data/gapminder.json");
const rows = await response.json();
const program = createGapminderLifeExpectancyHeatmap(rows);
const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
document.querySelector("#status").textContent =
  `${program.graphicSpec.objects.rect.items.length} observed country-year cells`;
