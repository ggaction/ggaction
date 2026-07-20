import { render } from "../../src/index.js";
import { createGapminderHorizon } from "./program.js";

const response = await fetch("../../data/gapminder.json");
if (!response.ok) {
  throw new Error(`Failed to load gapminder data: ${response.status}`);
}
const gapminder = await response.json();
const program = createGapminderHorizon(gapminder);

const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
document.querySelector("#status").textContent =
  "Three folded bands around a 55-year baseline";
