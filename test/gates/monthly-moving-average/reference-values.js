import { createWindowReference } from "../../oracles/window.js";

export const AIRLINE_DATA_SOURCE =
  "https://www.bts.gov/newsroom/monthly-passengers-us-scheduled-airlines-domestic-international-april-2023-april-2026";

export const MOVING_WINDOW_LAYOUT = Object.freeze({
  panelWidth: 380,
  panelHeight: 360,
  gap: 20,
  padding: 6,
  margin: Object.freeze({ top: 74, right: 14, bottom: 50, left: 70 })
});

const PASSENGERS = Object.freeze([
  70.1, 70.4, 84.9, 81.2, 87.1, 89.7, 91.8, 86.8, 77.5, 82.8, 77.1, 83.3,
  70.7, 67.2, 83.7, 80.4, 85.3, 88.7, 92.2, 86.8, 76.8, 84.2, 74.8, 81.2
]);

export const AIRLINE_PASSENGER_ROWS = Object.freeze(PASSENGERS.map((passengers, index) =>
  Object.freeze({
    date: new Date(Date.UTC(2024 + Math.floor(index / 12), index % 12, 1)).toISOString(),
    month: Date.UTC(2024 + Math.floor(index / 12), index % 12, 1),
    passengers
  })
));

function movingTransform(op, { preceding, following = 0 }) {
  return Object.freeze({
    type: "window",
    partitionBy: Object.freeze([]),
    sortBy: Object.freeze([
      Object.freeze({ field: "month", order: "ascending" })
    ]),
    operations: Object.freeze([
      Object.freeze({
        op,
        field: "passengers",
        as: op,
        frame: Object.freeze({ preceding, following })
      })
    ])
  });
}

export const TRAILING_MEAN_TRANSFORM = movingTransform("movingMean", {
  preceding: 2
});
export const CENTERED_MEAN_TRANSFORM = movingTransform("movingMean", {
  preceding: 2,
  following: 2
});
export const TRAILING_SUM_TRANSFORM = movingTransform("movingSum", {
  preceding: 2
});

function derive(transform) {
  return createWindowReference(AIRLINE_PASSENGER_ROWS, {
    sortBy: transform.sortBy,
    operations: transform.operations
  });
}

export const TRAILING_MEAN_ROWS = derive(TRAILING_MEAN_TRANSFORM);
export const CENTERED_MEAN_ROWS = derive(CENTERED_MEAN_TRANSFORM);
export const TRAILING_SUM_ROWS = derive(TRAILING_SUM_TRANSFORM);

export const MONTH_TICKS = Object.freeze([
  Date.UTC(2024, 0, 1),
  Date.UTC(2024, 6, 1),
  Date.UTC(2025, 0, 1),
  Date.UTC(2025, 6, 1)
]);
