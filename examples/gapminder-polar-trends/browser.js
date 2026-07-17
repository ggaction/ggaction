import { render } from "../../src/index.js";
import { createGapminderPolarTrends } from "./program.js";

const response = await fetch("../../data/gapminder.json");
const program = createGapminderPolarTrends(await response.json());
const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));

window.__gapminderPolarTrends = Object.freeze({
  width: canvas.width,
  height: canvas.height,
  paths: program.graphicSpec.objects.line.items.length,
  closed: program.graphicSpec.objects.line.items.every(item =>
    item.properties.commands.at(-1).op === "Z"
  )
});
