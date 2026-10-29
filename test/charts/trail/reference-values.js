// Independent literal projection: x=[40,380], yA=88, yB=152; local half-width offsets.
export { canvas } from "../../../examples/trail/fixture.js";
export const expected = Object.freeze({ x: [40, 380], y: [88, 152], widths: [[8, 32], [28, 12]], colors: ["#2563eb", "#0d9488"] });
export function ribbonCommands(index, constant = false) {
  const [x0, x1] = expected.x, y = expected.y[index], [a, b] = constant ? [18, 18] : expected.widths[index];
  return [{ op: "M", x: x0, y: y + a / 2 }, { op: "L", x: x1, y: y + b / 2 },
    { op: "L", x: x1, y: y - b / 2 }, { op: "L", x: x1, y: y - b / 2 },
    { op: "L", x: x0, y: y - a / 2 }, { op: "L", x: x0, y: y + a / 2 }, { op: "Z" }];
}
