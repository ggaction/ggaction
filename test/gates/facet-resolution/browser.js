import { render } from "../../../src/index.js";
import { createGapminderRegressionFacetPrimitives } from
  "./primitive.program.js";
import { createGapminderOuterGuideFacetPrimitives } from
  "./primitive.program.js";

const rows = await fetch("../../../data/gapminder.json").then(response => response.json());
const programs = {
  shared: createGapminderRegressionFacetPrimitives(rows),
  independent: createGapminderRegressionFacetPrimitives(rows, {
    xResolution: "independent"
  }),
  outer: createGapminderOuterGuideFacetPrimitives(rows)
};

for (const [id, program] of Object.entries(programs)) {
  const canvas = document.querySelector(`#${id}`);
  render(program, canvas.getContext("2d"));
}

window.__facetResolutionGate = Object.freeze(Object.fromEntries(
  Object.entries(programs).map(([id, program]) => [id, Object.freeze({
    width: program.graphicSpec.objects.canvas.properties.width,
    height: program.graphicSpec.objects.canvas.properties.height
  })])
));
document.querySelector("#status").textContent = "Facet resolution Gates rendered";
