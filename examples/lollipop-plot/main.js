import { render } from "../../src/index.js";
import { createLollipopPlotExample } from "./program.js";

render(createLollipopPlotExample(), document.querySelector("#chart").getContext("2d"));
