import { render } from "../../src/basic.js";

import { createGettingStartedChart } from "./program.js";

const program = createGettingStartedChart();
const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
document.querySelector("#status").textContent = "Chart rendered";
