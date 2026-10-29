export const canvas = { width: 640, height: 480, margin: { left: 40, right: 40, top: 80, bottom: 40 }, background: "#ffffff" };
export const variants = [
  { id: "line", chart: "contours", title: "A level boundary", subtitle: "The line encloses grid values of at least one" },
  { id: "filled", chart: "contour-bands", title: "Bands between levels", subtitle: "Two bands share one interpolated boundary" },
  { id: "holes", chart: "contour-holes", title: "A missing center remains empty", subtitle: "Cells touching a missing sample are excluded" },
  { id: "histogram", chart: "contour-histogram", title: "Weighted point bins", subtitle: "An explicit histogram grid preserves total weight" },
  { id: "kde", chart: "contour-density", title: "A two-dimensional kernel", subtitle: "A triangular product kernel uses explicit bandwidth" }
];
export const hill = { origin: [0, 0], dx: 1, dy: 1, width: 3, height: 3, values: [0, 0, 0, 0, 2, 0, 0, 0, 0] };
export const hole = { origin: [0, 0], dx: 1, dy: 1, width: 5, height: 5,
  values: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, null, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] };
export const pointSource = { id: "samples", values: [{ id: "center", x: 1, y: 1, weight: 2 }], keyField: "id" };
export const colors = ["#bfdbfe", "#1d4ed8"];
