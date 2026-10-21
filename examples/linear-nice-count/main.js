import { render } from "../../src/index.js";
import { createLinearNiceCount } from "./program.js";
const program=createLinearNiceCount();
render(program,document.querySelector("#chart").getContext("2d"));
document.querySelector("#status").textContent="Y domain 0–110; automatic count density 10";
