import { render } from "../../src/index.js";
import { createBeeswarmExample } from "./program.js";

const program = createBeeswarmExample();
const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
document.querySelector("#status").textContent =
  `${program.graphicSpec.objects.swarm.items.length} observations packed`;
