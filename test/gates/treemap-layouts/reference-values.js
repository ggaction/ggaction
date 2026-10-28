export const rows = [
  { id: "Root", parent: null, value: 10 }, { id: "A", parent: "Root", value: 6 },
  { id: "B", parent: "Root", value: 4 }, { id: "A1", parent: "A", value: 2 }, { id: "A2", parent: "A", value: 4 }
];
export const canvas = { width: 640, height: 500, margin: { left: 0, right: 0, top: 0, bottom: 0 }, background: "#ffffff" };
export const labels = ["Root · 10", "A · 6", "A1 · 2", "A2 · 4", "B · 4"];
export const colors = ["#f1f5f9", "#bfdbfe", "#93c5fd", "#3b82f6", "#f59e0b"];
export const offset = [48, 100];
export const variants = [
  { id: "slice-dice", title: "Treemap · slice-dice", options: { size: [544, 320], padding: 16, method: "slice-dice" },
    rectangles: [[0, 0, 544, 320], [16, 16, 323.2, 304], [32, 32, 307.2, 352 / 3], [32, 352 / 3, 307.2, 288], [323.2, 16, 528, 304]],
    labelPositions: [[272, 8], [169.6, 24], [169.6, 224 / 3], [169.6, 608 / 3], [425.6, 160]] },
  { id: "squarify", title: "Treemap · squarify", options: { size: [544, 320], padding: 16, method: "squarify" },
    rectangles: [[0, 0, 544, 320], [16, 16, 323.2, 304], [3232 / 15, 32, 307.2, 288], [32, 32, 3232 / 15, 288], [323.2, 16, 528, 304]],
    labelPositions: [[272, 8], [169.6, 24], [784 / 3, 160], [1856 / 15, 160], [425.6, 160]] }
];
