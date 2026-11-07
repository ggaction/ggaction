export const canvas = Object.freeze({ width: 380, height: 280, margin: 40 });
export const values = Object.freeze(["A", "B"].flatMap((series, index) =>
  [[1,3], [2,2], [1,1], [4,0]].map((column, x) => Object.freeze({ series, x, value: column[index] }))));
export const plot = Object.freeze({ id: "stream", x: { field: "x", scale: { domain: [0,3], nice: false } },
  y: { field: "value", scale: { domain: [-1,4], nice: false } }, groupBy: "series", layout: "wiggle",
  color: { field: "series", scale: { range: ["#2563eb", "#0d9488"] } },
  area: { opacity: 1, stroke: "none", strokeWidth: 0 }, guides: false });
