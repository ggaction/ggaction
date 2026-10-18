// Independent literal percentile targets for the asymmetric five-group fixture.
export const expectedRows = [
  { x: 0, mean: 6.6, lower: 0.4, upper: 18.4 },
  { x: 1, mean: 8.6, lower: 1.6, upper: 22 },
  { x: 2, mean: 10, lower: 1.2, upper: 25.2 },
  { x: 3, mean: 12.6, lower: 3.2, upper: 29.2 },
  { x: 4, mean: 13.8, lower: 2.2, upper: 31.6 }
];
const point = (row, field) => ({ x: 20 + row.x / 4 * 280, y: 200 + row[field] / 40 * -180 });
export const areaCommands = [
  ...expectedRows.map((row, index) => ({ op: index ? "L" : "M", ...point(row, "lower") })),
  ...[...expectedRows].reverse().map(row => ({ op: "L", ...point(row, "upper") })), { op: "Z" }
];
export const lineCommands = expectedRows.map((row, index) => ({ op: index ? "L" : "M", ...point(row, "mean") }));
