import { chart } from "../../src/index.js";

const originFilter = Object.freeze({
  field: "Origin",
  op: "oneOf",
  values: ["Japan", "USA"]
});

function createCarsRegressionScatterplotWithFilter(
  cars,
  filter,
  regression = {
    confidence: 0.95,
    band: { color: "#111111", opacity: 0.18 },
    line: { strokeWidth: 3 }
  },
  { canvas = {}, guides = {} } = {}
) {
  return chart()
    .createCanvas({
      width: 760,
      height: 480,
      margin: { top: 40, right: 190, bottom: 70, left: 80 },
      ...canvas
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
    .filterMarks(filter)
    .createRegression(regression)
    .createGuides(guides);
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
    op: "gte",
    value: 150
  });
}

export function createRangeFilterCarsRegressionScatterplot(cars) {
  return createCarsRegressionScatterplotWithFilter(cars, {
    field: "Displacement",
    op: "range",
    min: 100,
    max: 300,
    inclusive: true
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

export function createLeftLegendCarsRegressionScatterplot(cars) {
  return createCarsRegressionScatterplotWithFilter(
    cars,
    originFilter,
    {
      confidence: 0.95,
      band: { color: "#111111", opacity: 0.18 },
      line: { strokeWidth: 3 }
    },
    {
      canvas: {
        margin: { top: 40, right: 80, bottom: 70, left: 190 }
      },
      guides: {
        legend: {
          position: "left",
          align: "center",
          direction: "vertical",
          offset: 80,
          titlePosition: "top",
          labels: { color: "#475569", fontSize: 12 },
          titleStyle: {
            color: "#0f172a",
            fontSize: 14,
            fontWeight: 700
          },
          border: {
            color: "#94a3b8",
            lineWidth: 1,
            padding: 10,
            background: "#f8fafc"
          },
          count: 5
        }
      }
    }
  );
}
