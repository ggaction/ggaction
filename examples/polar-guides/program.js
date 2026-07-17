import { chart } from "../../src/index.js";

function validCars(rows) {
  return rows.filter(row =>
    Number.isFinite(row?.Acceleration) &&
    Number.isFinite(row?.Horsepower) &&
    typeof row?.Origin === "string" &&
    row.Origin.length > 0
  );
}

export function createCarsPolarGuides(rows) {
  return chart()
    .createCanvas({ width: 620, height: 620, margin: 78 })
    .createData({ values: validCars(rows) })
    .createPointMark({ opacity: 0.78 })
    .encodeTheta({ field: "Acceleration" })
    .encodeR({ field: "Horsepower", scale: { zero: true } })
    .encodeColor({ field: "Origin" })
    .encodePointRadius({ value: 3 })
    .createGuides();
}
