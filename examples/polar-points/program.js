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
    .createPolarScatterPlot({
      id: "point",
      theta: "Acceleration",
      radius: "Horsepower",
      color: "Origin",
      point: { radius: 3 },
      guides: false
    });
}

export function createFashionTsnePolarPoints(fashionRows) {
  return chart()
    .createCanvas({ width: 560, height: 560, margin: 40 })
    .createData({ values: fashionRows })
    .createPolarScatterPlot({
      id: "point",
      theta: "x_pos",
      radius: { field: "y_pos", scale: { zero: false } },
      color: { field: "label_name", palette: "tableau10" },
      point: { radius: 1.4, opacity: 0.42 },
      guides: false
    });
}
