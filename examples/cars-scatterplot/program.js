import { chart } from "../../src/index.js";

export const pointShapes = Object.freeze([
  "circle",
  "square",
  "diamond",
  "triangle-up",
  "triangle-down",
  "triangle-left",
  "triangle-right",
  "plus",
  "cross",
  "star",
  "hexagon",
  "wye"
]);

function validCars(cars) {
  return cars.filter(
    car =>
      Number.isFinite(car.Horsepower) &&
      Number.isFinite(car.Miles_per_Gallon) &&
      typeof car.Origin === "string" &&
      car.Origin.length > 0
  );
}

export function createCarsScatterplot(cars) {
  const rows = validCars(cars);

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

export function createScaleReverseCarsScatterplot(cars) {
  return createCarsScatterplot(cars)
    .editScale({ id: "x", reverse: true });
}

export function createDiamondCarsScatterplot(cars) {
  return createCarsScatterplot(cars)
    .editPointMark({ target: "points", shape: "diamond" });
}

export function createShapeVocabularyCarsScatterplot(shapeRows) {
  return chart()
    .createCanvas({
      width: 860,
      height: 400,
      margin: { top: 30, right: 250, bottom: 60, left: 70 }
    })
    .createData({ id: "shapeCars", values: shapeRows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "Horsepower", scale: { domain: [46, 230] } })
    .encodeY({ field: "Miles_per_Gallon", scale: { domain: [9, 46.6] } })
    .encodeRadius({ value: 7 })
    .encodeShape({
      field: "ShapeCategory",
      scale: { range: pointShapes }
    })
    .createGuides({
      axes: {
        x: { title: { text: "Horsepower" } },
        y: { title: { text: "Miles per Gallon" } }
      },
      legend: {
        channels: ["shape"],
        title: "Shape",
        itemGap: 24,
        symbol: {
          layers: [
            {
              type: "point",
              size: 5,
              stroke: "white",
              strokeWidth: 0
            }
          ]
        }
      }
    });
}

export function createPaletteCarsScatterplot(cars) {
  const rows = validCars(cars);

  return chart()
    .createCanvas({
      width: 760,
      height: 400,
      margin: { top: 30, right: 150, bottom: 60, left: 70 }
    })
    .createData({ id: "cars", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "Horsepower" })
    .encodeY({ field: "Miles_per_Gallon" })
    .encodeColor({ field: "Origin", scale: { palette: "set2" } })
    .encodeRadius({ value: 3 })
    .createGuides({
      axes: {
        x: { title: { text: "Horsepower" } },
        y: { title: { text: "Miles per Gallon" } }
      },
      legend: { channels: ["color"] }
    });
}

export function createEncodingReassignmentCarsScatterplot(cars) {
  const rows = validCars(cars);

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
    .createGuides({ axes: { x: {}, y: {} } })
    .encodeX({ field: "Displacement" })
    .encodeY({ field: "Acceleration" })
    .encodeColor({ field: "Cylinders", fieldType: "nominal" })
    .encodeSize({ field: "Weight_in_lbs" })
    .encodeShape({ field: "Origin" });
}
