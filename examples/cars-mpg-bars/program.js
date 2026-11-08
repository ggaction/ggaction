import { chart } from "../../src/index.js";

// Average fuel economy of 1970–1982 cars by cylinder count and region of origin.
export function createCarsMpgBars(cars) {
  const common = cars.filter(car =>
    Number.isFinite(car.Miles_per_Gallon) && [4, 6, 8].includes(car.Cylinders))
    .map(car => ({ cylinders: `${car.Cylinders} cylinders`, origin: car.Origin, mpg: car.Miles_per_Gallon }));

  return chart()
    .createCanvas({ width: 760, height: 440, margin: { top: 80, right: 140, bottom: 60, left: 70 } })
    .createData({ id: "cars", values: common })
    .createBarPlot({
      id: "bars",
      x: { field: "cylinders", fieldType: "ordinal", scale: { domain: ["4 cylinders", "6 cylinders", "8 cylinders"] } },
      y: { field: "mpg", aggregate: "mean", scale: { domain: [0, 35] } },
      color: { field: "origin", layout: "group", scale: { domain: ["USA", "Japan", "Europe"], range: ["#2563eb", "#dc2626", "#f97316"] } },
      guides: {
        axes: { x: { title: false }, y: { title: { text: "Average miles per gallon" } } },
        legend: { title: "Origin" },
        grid: { horizontal: true, vertical: false }
      }
    })
    .createTitle({
      text: "Fewer cylinders, more miles per gallon",
      subtitle: "Average fuel economy of 1970–1982 car models · no European or Japanese 8-cylinder cars"
    });
}
