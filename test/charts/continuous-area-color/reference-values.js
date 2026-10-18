// Literal color samples and independent linear area geometry.
export const expectedColors = ["#d9d9f3", "#51c1ff", "#008aff", "#0930af", "#000080", "#0930af", "#008aff", "#51c1ff", "#d9d9f3"];
export function areaItems() {
  const y = value => 200 + value / 20 * -180;
  return expectedColors.map((fill, group) => ({ id: `areaPlot:${group}`, properties: {
    commands: [
      { op: "M", x: 20, y: y(group) },
      { op: "L", x: 160, y: y(group * 2) },
      { op: "L", x: 300, y: y(group) },
      { op: "L", x: 300, y: y(group + 1) },
      { op: "L", x: 160, y: y((group + 1) * 2) },
      { op: "L", x: 20, y: y(group + 1) },
      { op: "Z" }
    ], fill, opacity: 0.7
  } }));
}
