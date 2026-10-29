import { canvas, variants, colors } from "../../../examples/contours/fixture.js";
export { canvas, variants, colors };
// Independent literal grid solutions. A center value 2 crosses level 1 at half edges.
const square = [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 1], [0, 0]];
const diamond = [[.5, 1], [1, .5], [1.5, 1], [1, 1.5], [.5, 1]];
const diamondHole = [[.5, 1], [1, 1.5], [1.5, 1], [1, .5], [.5, 1]];
// The null center excludes its four adjacent cells, leaving a 2-by-2 square hole.
const outer = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [3, 4], [2, 4], [1, 4], [0, 4], [0, 3], [0, 2], [0, 1], [0, 0]];
const missing = [[1, 1], [1, 2], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [2, 1], [1, 1]];
export function contourReference(id) {
  const variant = variants.find(value => value.id === id);
  if (!variant) throw new Error(`Unknown contour reference ${id}.`);
  const regions = id === "line" ? [[diamond]] : id === "holes" ? [[outer, missing]] : [[square, diamondHole], [diamond]];
  const maximum = id === "holes" ? 4 : 2;
  const paths = regions.map((rings, index) => ({ type: "path", properties: {
    commands: rings.flatMap(ring => [...ring.slice(0, -1).map(([x, y], i) => ({ op: i === 0 ? "M" : "L", x: 40 + x / maximum * 560, y: 440 - y / maximum * 360 })), { op: "Z" }]),
    fillRule: "nonzero", fill: id === "line" ? "none" : id === "holes" ? "#2563eb" : colors[index], stroke: "#1d4ed8", strokeWidth: 2, opacity: 1
  } }));
  return { paths, title: variant.title, subtitle: variant.subtitle, clip: { x: 40, y: 80, width: 560, height: 360 } };
}
