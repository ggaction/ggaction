import { render } from "../../src/index.js";
import { createECDFExample } from "./program.js";

render(createECDFExample(), document.querySelector("#chart").getContext("2d"));
