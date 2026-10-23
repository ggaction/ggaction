import { render } from "../../src/index.js";
import { createLinearNearestTicks } from "./program.js";

const program = createLinearNearestTicks();
render(program, document.querySelector("#chart").getContext("2d"));
document.querySelector("#status").textContent = "Nearest-step density 5 selects 0, 20, …, 140";
