// Literal oracle: x band centers 110/210/310; price 0..10 maps to 260..60.
export const canvas = { width: 420, height: 320, margin: { left: 60, right: 60, top: 60, bottom: 60 }, background: "#ffffff" };
export function ohlcReference(id) {
  const prices = [
    { stem: [110, 240, 80], body: [94, 120, 32, 80], fill: "#16a34a", label: ["7", 110, 74] },
    { stem: [210, 220, 100], body: [194, 140, 32, 40], fill: "#dc2626", label: ["4", 210, 94] },
    { stem: [310, 180, 140], doji: [294, 326, 160], label: ["5", 310, 134] }
  ];
  const graphics = [];
  for (const price of prices) {
    const [x, y1, y2] = price.stem;
    graphics.push({ type: "line", properties: { x1: x, x2: x, y1, y2, stroke: "#334155", strokeWidth: 1, opacity: 1 } });
    if (price.body) { const [x, y, width, height] = price.body; graphics.push({ type: "rect", properties: { x, y, width, height, fill: price.fill, stroke: "#334155", strokeWidth: 1, opacity: 1 } }); }
    else if (id !== "no-doji") { const [x1, x2, y] = price.doji; graphics.push({ type: "line", properties: { x1, x2, y1: y, y2: y, stroke: "#334155", strokeWidth: 1, opacity: 1 } }); }
    if (id === "labels") { const [text, x, y] = price.label; graphics.push({ type: "text", properties: { text, x, y, textAlign: "center", textBaseline: "bottom", fill: "#0f172a", fontFamily: "sans-serif", fontSize: 12, fontWeight: "normal" } }); }
  }
  return { graphics, clip: { x: 60, y: 60, width: 300, height: 200 } };
}
