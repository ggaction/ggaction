import { render } from "../../../src/index.js";

import {
  createCarsOriginDonutPrimitives,
  createGapminderRadialBarPrimitives,
  createNightingaleRosePrimitives
} from "./primitive.program.js";

const [carsResponse, gapminderResponse, nightingaleResponse] = await Promise.all([
  fetch("../../../data/cars.json"),
  fetch("../../../data/gapminder.json"),
  fetch("../../../data/nightingale_rose.json")
]);
const [cars, gapminder, nightingale] = await Promise.all([
  carsResponse.json(),
  gapminderResponse.json(),
  nightingaleResponse.json()
]);
const programs = {
  donut: createCarsOriginDonutPrimitives(cars),
  rose: createNightingaleRosePrimitives(nightingale),
  radial: createGapminderRadialBarPrimitives(gapminder)
};
const canvases = {
  donut: document.querySelector("#cars-donut"),
  rose: document.querySelector("#nightingale-rose"),
  radial: document.querySelector("#gapminder-radial")
};

for (const key of Object.keys(programs)) {
  render(programs[key], canvases[key].getContext("2d"));
}

window.__polarArcGate = Object.freeze(Object.fromEntries(
  Object.keys(programs).map(key => [key, {
    width: canvases[key].width,
    height: canvases[key].height,
    paths: programs[key].graphicSpec.objects.arcSectors.items.length
  }])
));
