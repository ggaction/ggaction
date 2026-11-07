export const observations = [
  { id: "a", x: 1, y: 1 }, { id: "b", x: 1, y: 3 },
  { id: "c", x: 3, y: 5 }, { id: "d", x: 5, y: 5 },
  { id: "e", x: 7, y: 7 }, { id: "f", x: 9, y: 9 }
];
export const boundaries = [0, 2, 4, 6, 8, 10];
export const valueScale = { domain: [0, 10], nice: false, zero: false };
export const countScale = { domain: [0, 3], nice: false, zero: true };
export const panels = {
  center: { width: 320, height: 280, margin: { left: 40, right: 20, top: 20, bottom: 40 } },
  x: { width: 320, height: 120, margin: { left: 40, right: 20, top: 20, bottom: 20 } },
  y: { width: 140, height: 280, margin: { left: 10, right: 30, top: 20, bottom: 40 } }
};
export const targets = [
  { childPath: ["x"], id: "histogram" },
  { childPath: ["lower", "center"], id: "points" },
  { childPath: ["lower", "y"], id: "histogram" }
];
