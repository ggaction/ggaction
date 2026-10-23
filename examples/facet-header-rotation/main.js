import { render } from "../../src/index.js";
import { createFacetHeaderRotation } from "./program.js";
const program = createFacetHeaderRotation();
const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
document.querySelector("#status").textContent = "Two region panels rendered with vertical names";
