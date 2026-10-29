// Independent literals: 100/100/120px columns, four 28px rows, 4px padding.
export { canvas } from "../../../examples/table/fixture.js";
const x = [20, 120, 220], widths = [100, 100, 120];
const values = [["Name", "Amount", "Trend"], ["Alpha", "4", ""], ["Beta", "8", ""], ["", "12", ""]];
export const expectedCells = values.flatMap((row, r) => row.map((text, c) => {
  const band = r === 0 || r === 3;
  const clip = { x: x[c], y: 20 + r * 28, width: widths[c], height: 28 };
  const items = [{ type: "rect", properties: { ...clip, fill: band ? "#f1f5f9" : "#ffffff", stroke: "#cbd5e1", strokeWidth: 1, opacity: 1 } }];
  if (c === 1 && (r === 1 || r === 2)) items.push({ type: "rect", properties: {
    x: 124, y: r === 1 ? 52 : 80, width: r === 1 ? 46 : 92, height: 20,
    fill: "#93c5fd", stroke: "none", strokeWidth: 0, opacity: 1
  } });
  if (c === 2 && (r === 1 || r === 2)) items.push({ type: "path", properties: {
    commands: r === 1 ? [{ op: "M", x: 224, y: 72 }, { op: "L", x: 280, y: 52 }, { op: "L", x: 336, y: 62 }]
      : [{ op: "M", x: 224, y: 80 }, { op: "L", x: 280, y: 100 }, { op: "L", x: 336, y: 90 }],
    fill: "none", stroke: "#2563eb", strokeWidth: 1.5, opacity: 1
  } });
  if (text) items.push({ type: "text", properties: {
    fill: "#0f172a", fontFamily: "sans-serif", fontSize: 12, fontWeight: band ? "bold" : "normal",
    text, x: c === 1 ? 216 : x[c] + 4, y: 34 + r * 28, textAlign: c === 1 ? "right" : "left", textBaseline: "middle"
  } });
  return { clip, items };
}));
