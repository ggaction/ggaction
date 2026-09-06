import { render } from "../../src/index.js";
import { createDumbbellPlotExample } from "./program.js";

render(createDumbbellPlotExample(), document.querySelector("#chart").getContext("2d"));
