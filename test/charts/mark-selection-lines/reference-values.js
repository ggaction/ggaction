import { createCarsLineChartValues } from "../../charts/cars-line-chart/reference-values.js";

export const LINE_HIGHLIGHT_LAYOUT = Object.freeze({
  width: 720,
  height: 460,
  margin: Object.freeze({ top: 80, right: 170, bottom: 60, left: 80 })
});

export const LINE_HIGHLIGHT_TARGET = Object.freeze({
  origin: "Japan",
  stroke: "#dc2626",
  strokeWidth: 5,
  strokeDash: Object.freeze([6, 4]),
  opacity: 1,
  dimOpacity: 0.16
});

export function selectJapanLineSeries(
  cars,
  {
    width = LINE_HIGHLIGHT_LAYOUT.width,
    height = LINE_HIGHLIGHT_LAYOUT.height,
    margin = LINE_HIGHLIGHT_LAYOUT.margin
  } = {}
) {
  const values = createCarsLineChartValues(cars, { width, height, margin });
  const matches = values.series
    .map((series, index) => ({ series, index }))
    .filter(({ series }) => series.origin === LINE_HIGHLIGHT_TARGET.origin);
  if (matches.length !== 1) {
    throw new Error("Line highlight requires one unique Japan line series.");
  }
  const [{ series, index }] = matches;
  if (series.points.length < 2) {
    throw new Error("Line highlight requires one connected Japan line path.");
  }
  return Object.freeze({
    rows: Object.freeze(values.validCars),
    origins: Object.freeze(values.origins),
    target: Object.freeze({
      key: `trends/series/${index}`,
      index,
      origin: series.origin,
      pointCount: series.points.length,
      first: Object.freeze({ ...series.points[0] }),
      last: Object.freeze({ ...series.points.at(-1) })
    })
  });
}
