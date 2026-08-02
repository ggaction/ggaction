import { createWindowReference } from "../../oracles/window.js";

export const MONTHLY_MOVING_LAYOUT = Object.freeze({
  width: 760,
  height: 420,
  margin: Object.freeze({ top: 76, right: 30, bottom: 58, left: 62 })
});

export const MONTHLY_EVENT_ROWS = Object.freeze([
  Object.freeze({ date: "2024-01-18T12:00:00Z", value: 12 }),
  Object.freeze({ date: "2024-02-09T12:00:00Z", value: 20 }),
  Object.freeze({ date: "2024-03-21T12:00:00Z", value: 16 }),
  Object.freeze({ date: "2024-04-11T12:00:00Z", value: 28 }),
  Object.freeze({ date: "2024-05-24T12:00:00Z", value: 24 }),
  Object.freeze({ date: "2024-06-07T12:00:00Z", value: 36 }),
  Object.freeze({ date: "2024-07-19T12:00:00Z", value: 32 }),
  Object.freeze({ date: "2024-08-13T12:00:00Z", value: 44 }),
  Object.freeze({ date: "2024-09-26T12:00:00Z", value: 38 }),
  Object.freeze({ date: "2024-10-10T12:00:00Z", value: 50 }),
  Object.freeze({ date: "2024-11-22T12:00:00Z", value: 46 }),
  Object.freeze({ date: "2024-12-05T12:00:00Z", value: 58 })
]);

export const MONTHLY_ROWS = Object.freeze(MONTHLY_EVENT_ROWS.map((row, index) =>
  Object.freeze({ ...row, month: Date.UTC(2024, index, 1) })
));

export const MONTHLY_MOVING_TRANSFORM = Object.freeze({
  type: "window",
  partitionBy: Object.freeze([]),
  sortBy: Object.freeze([
    Object.freeze({ field: "month", order: "ascending" })
  ]),
  operations: Object.freeze([
    Object.freeze({
      op: "movingMean",
      field: "value",
      as: "movingMean",
      frame: Object.freeze({ preceding: 2, following: 0 })
    })
  ])
});

export const MONTHLY_MOVING_ROWS = createWindowReference(MONTHLY_ROWS, {
  sortBy: MONTHLY_MOVING_TRANSFORM.sortBy,
  operations: MONTHLY_MOVING_TRANSFORM.operations
});

export const MONTH_TICKS = Object.freeze([
  Date.UTC(2024, 0, 1),
  Date.UTC(2024, 2, 1),
  Date.UTC(2024, 4, 1),
  Date.UTC(2024, 6, 1),
  Date.UTC(2024, 8, 1),
  Date.UTC(2024, 10, 1)
]);
