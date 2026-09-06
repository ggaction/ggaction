import { render } from "../../src/index.js";

import { createRepeatChartsExample } from "./program.js";

const program = createRepeatChartsExample();
const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
document.querySelector("#status").textContent = "Three repeated metric views rendered";
