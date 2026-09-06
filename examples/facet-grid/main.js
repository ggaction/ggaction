import { render } from "../../src/index.js";

import { createFacetGridExample } from "./program.js";

const program = createFacetGridExample();
const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
document.querySelector("#status").textContent = "A complete 2 × 3 facet grid rendered";
