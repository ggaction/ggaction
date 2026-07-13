import { chart } from "../../src/index.js";

export const cars = [
  { horsepower: 88, mpg: 27, origin: "USA" },
  { horsepower: 70, mpg: 36, origin: "Japan" },
  { horsepower: 110, mpg: 24, origin: "Europe" }
];

export function createGettingStartedChart() {
  return chart()
    .createCanvas({
      width: 640,
      height: 400,
      margin: { top: 30, right: 30, bottom: 60, left: 70 }
    })
    .createData({ id: "cars", values: cars })
    .createPointMark({ id: "points" })
    .encodeX({ field: "horsepower" })
    .encodeY({ field: "mpg" })
    .encodeColor({ field: "origin" })
    .encodeRadius({ value: 4 })
    .createGuides({
      axes: {
        x: { title: { text: "Horsepower" } },
        y: { title: { text: "Miles per gallon" } }
      }
    });
}
