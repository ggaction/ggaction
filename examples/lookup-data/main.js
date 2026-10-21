import { render } from "../../src/index.js";
import { createLookupExample } from "./program.js";
const program = createLookupExample();
render(program, document.querySelector("#chart").getContext("2d"));
document.querySelector("#status").textContent = "Three group means rendered from two separate tables";
