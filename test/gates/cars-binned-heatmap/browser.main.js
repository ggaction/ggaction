import { render } from "../../../src/index.js";
import { createCarsBinnedHeatmapPrimitives } from "./primitive.program.js";

const response = await fetch("/data/cars.json");
if (!response.ok) throw new Error(`Cars request failed with ${response.status}.`);
const cars = await response.json();
const program = createCarsBinnedHeatmapPrimitives(cars);
const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"), { pixelRatio: 2 });
document.querySelector("#status").textContent = "Rendered";
window.__ggactionGate = Object.freeze({ program, logicalWidth: 700, logicalHeight: 500 });
