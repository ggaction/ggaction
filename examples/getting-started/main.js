import { render } from "../../src/index.js";

import { createGettingStartedChart } from "./program.js";

const program = createGettingStartedChart();
const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
