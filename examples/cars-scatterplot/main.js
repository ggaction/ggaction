import { chart, render } from "../../src/index.js";

const response = await fetch("../../data/cars.json");
const cars = await response.json();
const rows = cars.filter(
  car =>
    Number.isFinite(car.Horsepower) &&
    Number.isFinite(car.Miles_per_Gallon)
);
const program = chart()
  .createCanvas({ width: 640, height: 400, margin: 30 })
  .createData({ id: "cars", values: rows })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" })
  .encodeColor({ field: "Origin" })
  .encodeRadius({ value: 3 });

const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
document.querySelector("#status").textContent = `${rows.length} cars rendered`;
