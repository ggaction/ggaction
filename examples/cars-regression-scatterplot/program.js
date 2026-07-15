import { chart } from "../../src/index.js";

const originFilter = Object.freeze({
  field: "Origin",
  oneOf: ["Japan", "USA"]
});

function createCarsRegressionScatterplotWithFilter(
  cars,
  filter,
  regression = {
    confidence: 0.95,
    band: { color: "#111111", opacity: 0.18 },
    line: { strokeWidth: 3 }
  }
) {
  return chart()
    .createCanvas({
      width: 760,
      height: 480,
      margin: { top: 40, right: 190, bottom: 70, left: 80 }
    })
    .createData({ id: "cars", values: cars })
    .createPointMark({ id: "points" })
    .encodeX({
      field: "Displacement",
      scale: { nice: true, zero: false }
    })
    .encodeY({
      field: "Acceleration",
      scale: { nice: true, zero: false }
    })
    .encodeColor({
      field: "Origin",
      scale: { palette: "tableau10" }
    })
    .encodeSize({ field: "Acceleration" })
    .encodeShape({ field: "Origin" })
    .encodeOpacity({ value: 0.27 })
    .filterMark(filter)
    .createRegression(regression)
    .createGuides();
}

export function createCarsRegressionScatterplot(cars) {
  return createCarsRegressionScatterplotWithFilter(cars, originFilter);
}

export function createPolynomialCarsRegressionScatterplot(cars) {
  return createCarsRegressionScatterplotWithFilter(cars, originFilter, {
    method: "polynomial",
    degree: 2
  });
}

export function createLoessCarsRegressionScatterplot(cars) {
  return createCarsRegressionScatterplotWithFilter(cars, originFilter, {
    method: "loess",
    span: 0.55,
    band: false
  });
}

export function createPredictionIntervalCarsRegressionScatterplot(cars) {
  return createCarsRegressionScatterplotWithFilter(cars, originFilter, {
    interval: "prediction"
  });
}

export function createComparisonFilterCarsRegressionScatterplot(cars) {
  return createCarsRegressionScatterplotWithFilter(cars, {
    field: "Horsepower",
    predicate: { op: "gte", value: 150 }
  });
}

export function createRangeFilterCarsRegressionScatterplot(cars) {
  return createCarsRegressionScatterplotWithFilter(cars, {
    field: "Displacement",
    range: { min: 100, max: 300, inclusive: true }
  });
}

export function createComponentEditCarsRegressionScatterplot(cars) {
  return createCarsRegressionScatterplot(cars)
    .editRegressionBand({
      target: "pointsRegressionBands",
      color: "#475569",
      opacity: 0.12,
      stroke: "#111827",
      strokeWidth: 1.5
    })
    .editRegressionLine({
      target: "pointsRegressionLines",
      strokeWidth: 5
    });
}
