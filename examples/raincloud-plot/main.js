import { render } from "../../src/index.js";
import { createRaincloudExample } from "./program.js";

const program = createRaincloudExample();
const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
document.querySelector("#status").textContent =
  "Half density, quartiles, and every observation share one source";
