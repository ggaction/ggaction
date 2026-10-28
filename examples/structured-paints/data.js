export const frame = Object.freeze({ width: 260, height: 180, margin: 20 });
export const rows = Object.freeze([{ left: 0, right: 1, lower: 0, upper: 1 }]);
export const patterns = Object.freeze(["solid", "diagonal", "antidiagonal", "horizontal", "vertical", "cross", "dots"]);
export const variants = Object.freeze([
  ...patterns.map(style => ({ id: style, title: `${style} pattern`, opacity: .7, fill: {
    type: "pattern", style, pitch: 16, strokeWidth: 3, phase: [3, 5],
    foreground: "rgba(37,99,235,.8)", background: "rgba(245,158,11,.3)", coordinateSpace: "plot"
  } })),
  { id: "radial-ellipse", title: "Radial ellipse", opacity: .7, fill: { type: "radial-gradient",
    center: { x: .5, y: .5 }, focal: { x: .5, y: .5 }, radius: .5,
    stops: [{ offset: 0, color: "rgba(37,99,235,.8)" }, { offset: 1, color: "rgba(245,158,11,.3)" }] } },
  { id: "radial-edge", title: "Radial boundary focal point", opacity: .7, fill: { type: "radial-gradient",
    center: { x: .5, y: .5 }, focal: { x: 0, y: .5 }, radius: .5,
    stops: [{ offset: 0, color: "#2563eb" }, { offset: .5, color: "#60a5fa" }, { offset: .5, color: "#f59e0b" }, { offset: 1, color: "#fef3c7" }] } }
]);
