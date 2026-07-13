import { chart } from "../../src/index.js";

export function createCarsScatterplot(cars) {
  const rows = cars.filter(
    car =>
      Number.isFinite(car.Horsepower) &&
      Number.isFinite(car.Miles_per_Gallon) &&
      typeof car.Origin === "string" &&
      car.Origin.length > 0
  );

  return chart()
    .createCanvas({
      width: 640,
      height: 400,
      margin: { top: 30, right: 30, bottom: 60, left: 70 }
    })
    .createData({ id: "cars", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "Horsepower" })
    .encodeY({ field: "Miles_per_Gallon" })
    .encodeColor({ field: "Origin" })
    .encodeRadius({ value: 3 })
    .createGuides({
      axes: {
        x: { title: { text: "Horsepower" } },
        y: { title: { text: "Miles per Gallon" } }
      }
    });
}
