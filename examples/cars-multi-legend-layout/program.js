import { chart } from "../../src/index.js";

function validCars(cars) {
  return cars.filter(car =>
    Number.isFinite(car.Displacement) &&
    Number.isFinite(car.Miles_per_Gallon) &&
    Number.isFinite(car.Acceleration) &&
    typeof car.Origin === "string" &&
    car.Origin.length > 0
  );
}

export function createCarsMultiLegendLayoutBase(cars, {
  position = "top"
} = {}) {
  return chart()
    .createCanvas({
      width: 760,
      height: 620,
      margin: {
        top: 40,
        right: 70,
        bottom: position === "bottom" ? 100 : 60,
        left: 70
      }
    })
    .createData({ id: "cars", values: validCars(cars) })
    .createPointMark({ id: "points" })
    .encodeX({ field: "Displacement" })
    .encodeY({ field: "Miles_per_Gallon" })
    .encodeColor({ field: "Origin", fieldType: "nominal" })
    .encodeOpacity({ field: "Acceleration" })
    .createGuides({
      axes: {
        x: { title: { text: "Displacement" } },
        y: { title: { text: "Miles per Gallon" } }
      },
      legend: false
    });
}

export function createCarsMultiLegendLayout(cars, {
  position = "top"
} = {}) {
  const offset = position === "bottom" ? { offset: 60 } : {};
  return createCarsMultiLegendLayoutBase(cars, { position })
    .createLegend({
      target: "points",
      channels: ["color"],
      position,
      align: "left",
      columns: 3,
      titlePosition: "left",
      ...offset
    })
    .createLegend({
      target: "points",
      channels: ["opacity"],
      position,
      align: "right",
      count: 3,
      titlePosition: "left",
      ...offset
    });
}
