import { render } from "../../src/index.js";
import { createFacetFieldTitles } from "./program.js";
const program = createFacetFieldTitles();
render(program, document.querySelector("#chart").getContext("2d"));
document.querySelector("#status").textContent = "Two panels rendered with one shared field title";
