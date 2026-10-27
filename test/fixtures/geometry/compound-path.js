export const outer = [[0, 0], [10, 0], [10, 10], [0, 10]];
export const hole = [[3, 3], [7, 3], [7, 7], [3, 7]];
export const island = [[12, 0], [14, 0], [14, 2], [12, 2]];

export const outerCommands = [
  { op: "M", x: 0, y: 0 }, { op: "L", x: 10, y: 0 },
  { op: "L", x: 10, y: 10 }, { op: "L", x: 0, y: 10 }, { op: "Z" }
];
export const holeCommands = [
  { op: "M", x: 3, y: 3 }, { op: "L", x: 7, y: 3 },
  { op: "L", x: 7, y: 7 }, { op: "L", x: 3, y: 7 }, { op: "Z" }
];
export const reversedHoleCommands = [
  { op: "M", x: 3, y: 3 }, { op: "L", x: 3, y: 7 },
  { op: "L", x: 7, y: 7 }, { op: "L", x: 7, y: 3 }, { op: "Z" }
];
export const islandCommands = [
  { op: "M", x: 12, y: 0 }, { op: "L", x: 14, y: 0 },
  { op: "L", x: 14, y: 2 }, { op: "L", x: 12, y: 2 }, { op: "Z" }
];
export const cubicCommands = [
  { op: "M", x: 0, y: 0 },
  { op: "C", x1: 0, y1: 10, x2: 10, y2: 10, x: 10, y: 0 }
];

export const samples = [
  { point: [1, 1], filled: true },
  { point: [5, 5], filled: false },
  { point: [13, 1], filled: true },
  { point: [11, 1], filled: false }
];
