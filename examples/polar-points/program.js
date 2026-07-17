import { chart } from "../../src/index.js";

function validCars(rows) {
  return rows.filter(row =>
    Number.isFinite(row?.Acceleration) &&
    Number.isFinite(row?.Horsepower) &&
    typeof row?.Origin === "string" &&
    row.Origin.length > 0
  );
}

export function createCarsPolarScatterplot(rows) {
  return chart()
    .createCanvas({ width: 520, height: 520, margin: 48 })
    .createData({ values: validCars(rows) })
    .createPointMark()
    .encodeTheta({ field: "Acceleration" })
    .encodeR({ field: "Horsepower" })
    .encodeColor({ field: "Origin" })
    .encodePointRadius({ value: 3 });
}

export function createFashionTsnePolarPoints(fashionRows) {
  return chart()
    .createCanvas({ width: 560, height: 560, margin: 40 })
    .createData({ values: fashionRows })
    .createPointMark({ opacity: 0.42 })
    .encodeTheta({ field: "x_pos" })
    .encodeR({ field: "y_pos", scale: { zero: false } })
    .encodeColor({ field: "label_name", palette: "tableau10" })
    .encodePointRadius({ value: 1.4 });
}
