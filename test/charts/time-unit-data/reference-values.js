export const TIME_UNIT_LAYOUT = Object.freeze({
  panelWidth: 440,
  panelHeight: 360,
  gap: 24,
  padding: 12,
  margin: Object.freeze({ top: 82, right: 32, bottom: 70, left: 58 })
});

export const TIME_DOMAIN = Object.freeze([
  Date.UTC(2023, 11, 25),
  Date.UTC(2024, 3, 7)
]);

export const MONTH_TICKS = Object.freeze([
  Date.UTC(2024, 0, 1),
  Date.UTC(2024, 1, 1),
  Date.UTC(2024, 2, 1),
  Date.UTC(2024, 3, 1)
]);

export const EVENT_ROWS = Object.freeze([
  Object.freeze({ event: "A", date: "2024-01-05T12:00:00Z", order: 1 }),
  Object.freeze({ event: "B", date: "2024-01-17T12:00:00Z", order: 2 }),
  Object.freeze({ event: "C", date: "2024-01-29T12:00:00Z", order: 3 }),
  Object.freeze({ event: "D", date: "2024-02-04T12:00:00Z", order: 4 }),
  Object.freeze({ event: "E", date: "2024-02-15T12:00:00Z", order: 5 }),
  Object.freeze({ event: "F", date: "2024-02-27T12:00:00Z", order: 6 }),
  Object.freeze({ event: "G", date: "2024-03-06T12:00:00Z", order: 7 }),
  Object.freeze({ event: "H", date: "2024-03-18T12:00:00Z", order: 8 }),
  Object.freeze({ event: "I", date: "2024-03-29T12:00:00Z", order: 9 })
]);

export const MONTH_ROWS = Object.freeze(EVENT_ROWS.map((row, index) =>
  Object.freeze({
    ...row,
    month: Date.UTC(2024, Math.floor(index / 3), 1)
  })
));

export const TIME_UNIT_TRANSFORM = Object.freeze({
  type: "timeUnit",
  field: "date",
  unit: "month",
  as: "month"
});
