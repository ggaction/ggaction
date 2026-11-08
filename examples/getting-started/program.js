import { chart } from "../../src/index.js";

// The rows of data/cars.json: 406 car models from 1970–1982.
export function createGettingStartedChart(cars) {
  const measured = cars.filter(car =>
    Number.isFinite(car.Horsepower) && Number.isFinite(car.Miles_per_Gallon));

  return chart()
    .createCanvas({
      width: 640,
      height: 400,
      margin: { top: 30, right: 130, bottom: 60, left: 70 }
    })
    .createData({ values: measured })
    .createScatterPlot({
      id: "cars",
      x: "Horsepower",
      y: "Miles_per_Gallon",
      color: "Origin",
      shape: "Origin",
      guides: {
        axes: {
          x: { title: { text: "Horsepower" } },
          y: { title: { text: "Miles per gallon" } }
        }
      }
    });
}
