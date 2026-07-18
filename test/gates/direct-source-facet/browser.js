import { render } from "../../../src/index.js";

import {
  createCarsOriginHistogramFacetPrimitives,
  createCarsOriginScatterplotFacetPrimitives
} from "./primitive.program.js";

const response = await fetch("../../../data/cars.json");
const cars = await response.json();
const programs = {
  scatterplot: createCarsOriginScatterplotFacetPrimitives(cars),
  histogram: createCarsOriginHistogramFacetPrimitives(cars)
};

for (const [id, program] of Object.entries(programs)) {
  const canvas = document.querySelector(`#${id}`);
  render(program, canvas.getContext("2d"));
}

window.__directFacetGate = Object.freeze(Object.fromEntries(
  Object.entries(programs).map(([id, program]) => {
    const canvas = document.querySelector(`#${id}`);
    const nestedCanvasCount = Object.values(program.graphicSpec.objects)
      .filter(object => object.type === "canvas").length - 1;
    return [id, Object.freeze({
      width: canvas.width,
      height: canvas.height,
      nestedCanvasCount
    })];
  })
));
document.querySelector("#status").textContent = "Direct-source facet gate rendered";

