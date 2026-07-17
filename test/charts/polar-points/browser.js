import { render } from "../../../src/index.js";
import { parseFashionTsneCsv } from "../../support/fashion-tsne.js";

import {
  createCarsPolarScatterplot,
  createFashionTsnePolarPoints
} from "../../../examples/polar-points/program.js";

const [carsResponse, fashionResponse] = await Promise.all([
  fetch("../../../data/cars.json"),
  fetch("../../../data/fashion_mnist_tsne.csv")
]);
const [cars, fashionSource] = await Promise.all([
  carsResponse.json(),
  fashionResponse.text()
]);
const programs = {
  cars: createCarsPolarScatterplot(cars),
  fashion: createFashionTsnePolarPoints(parseFashionTsneCsv(fashionSource))
};

for (const [id, program] of Object.entries(programs)) {
  const canvas = document.querySelector(`#${id}`);
  render(program, canvas.getContext("2d"));
}

window.__polarPoints = Object.freeze({
  cars: Object.freeze({
    width: document.querySelector("#cars").width,
    height: document.querySelector("#cars").height,
    points: programs.cars.graphicSpec.objects.point.items.length
  }),
  fashion: Object.freeze({
    width: document.querySelector("#fashion").width,
    height: document.querySelector("#fashion").height,
    points: programs.fashion.graphicSpec.objects.point.items.length
  })
});
