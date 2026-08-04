import { createWindowReference } from "../../oracles/window.js";
import { airlinePassengerRows } from
  "../../../examples/airline-passenger-moving-windows/program.js";

export const AIRLINE_DATA_SOURCE =
  "https://www.bts.gov/newsroom/monthly-passengers-us-scheduled-airlines-domestic-international-april-2023-april-2026";

export const MOVING_WINDOW_LAYOUT = Object.freeze({
  panelWidth: 380,
  panelHeight: 360,
  gap: 20,
  padding: 6,
  margin: Object.freeze({ top: 74, right: 14, bottom: 50, left: 70 })
});

export const AIRLINE_PASSENGER_EVENTS = airlinePassengerRows;

export const AIRLINE_PASSENGER_ROWS = Object.freeze(
  AIRLINE_PASSENGER_EVENTS.map(row => Object.freeze({
    ...row,
    month: new Date(row.date).getTime()
  }))
);

export const TIME_UNIT_TRANSFORM = Object.freeze({
  type: "timeUnit",
  field: "date",
  unit: "month",
  as: "month"
});

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
