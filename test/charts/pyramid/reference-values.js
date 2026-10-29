import { canvas, variants, observations } from "../../../examples/pyramid/fixture.js";
export { canvas, variants };

// Independent literal contract: normalized vertices for values 100, 60, 20.
// The public kernel is intentionally not imported by this baseline.
const width = [[[0, 0], [1, 0], [.8, 1/3], [.2, 1/3]],
  [[.2, 1/3], [.8, 1/3], [.6, 2/3], [.4, 2/3]], [[.4, 2/3], [.6, 2/3], [.6, 1], [.4, 1]]];
const area = [[[0, 0], [1, 0], [.9, 1/3], [.1, 1/3]],
  [[.2, 1/3], [.8, 1/3], [.74, 2/3], [.26, 2/3]], [[.4, 2/3], [.6, 2/3], [.58, 1], [.42, 1]]];
export function pyramidReference(id = "width") {
  if (!variants.some(variant => variant.id === id)) throw new Error(`Unknown Pyramid reference ${id}.`);
  const vertices = (id === "area" ? area : width).map(points => points.map(point => [...point]));
  if (id === "point") vertices[2].splice(2, 2, [.5, 1], [.5, 1]);
  const project = ([cross, progress]) => id === "up" ? [60 + cross * 300, 330 - progress * 270]
    : id === "right" ? [60 + progress * 300, 60 + cross * 270]
    : id === "left" ? [360 - progress * 300, 60 + cross * 270] : [60 + cross * 300, 60 + progress * 270];
  const labelLines = id === "area" ? ["Retur", "ned"] : ["Returne", "d"];
  const graphics = vertices.flatMap((points, index) => {
    const resolved = points.map(project), xs = resolved.map(point => point[0]), ys = resolved.map(point => point[1]);
    return [{ type: "path", properties: { commands: [...resolved.map(([x, y], i) => ({ op: i ? "L" : "M", x, y })), { op: "Z" }],
      fill: "#c7d2fe", stroke: "#4338ca", strokeWidth: 1, opacity: 1 } },
    { type: "text", properties: { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2,
      text: observations[index].stage, fill: "#0f172a", fontFamily: "sans-serif", fontSize: 14, fontWeight: "normal", textAlign: id === "point" && index === 2 ? "left" : "center", textBaseline: "middle",
      ...(index === 2 && id === "point" ? { x: 244 } : {}),
      ...(index === 2 && ["width", "area", "up"].includes(id) ? { lines: labelLines.map((text, line) => ({text, x:0, y:line === 0 ? -8.4 : 8.4})) } : {}) } }];
  });
  return { graphics, clip: { x: 60, y: 60, width: 300, height: 270 } };
}
