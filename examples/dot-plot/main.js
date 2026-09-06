import { render } from "../../src/index.js";
import { createDotPlotExample } from "./program.js";

render(createDotPlotExample(), document.querySelector("#chart").getContext("2d"));
