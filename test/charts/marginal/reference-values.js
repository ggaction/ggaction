// Independent linear maps for six observations and five fixed half-open bins.
const fill = "#93c5fd", stroke = "transparent";
export const xCounts = [2, 1, 1, 1, 1], yCounts = [1, 1, 2, 1, 1];
export const xRects = xCounts.map((count, index) => {
  const top = (1 - count / 3) * 100 + count / 3 * 20;
  return { type: "rect", properties: { x: 40 + 52 * index, y: top, width: 52, height: 100 - top, fill, opacity: 1, stroke, strokeWidth: 0 } };
});
export const yRects = yCounts.map((count, index) => ({ type: "rect", properties: {
  x: 10, y: 196 - 44 * index, width: (1 - count / 3) * 10 + count / 3 * 110 - 10,
  height: 44, fill, opacity: 1, stroke, strokeWidth: 0
} }));
export const points = [[66,218],[66,174],[118,130],[170,130],[222,86],[274,42]]
  .map(([x,y]) => ({ type: "circle", properties: { fill: "#2563eb", x, y, radius: 5 } }));
