export const rows = [
  { id: "Root", parent: null, value: 10 }, { id: "A", parent: "Root", value: 6 },
  { id: "B", parent: "Root", value: 4 }, { id: "A1", parent: "A", value: 2 }, { id: "A2", parent: "A", value: 4 }
];
export const canvas = { width: 640, height: 500, margin: { left: 0, right: 0, top: 72, bottom: 0 }, background: "#ffffff" };
export const labels = ["Root · 10", "A · 6", "A1 · 2", "A2 · 4", "B · 4"];
export const colors = ["#475569", "#2563eb", "#60a5fa", "#60a5fa", "#f59e0b"];
export const parents = [0, 1, 1, 0];
export const children = [1, 2, 3, 4];
export const variants = [
  { id: "vertical", title: "Tree · vertical", options: { nodeSize: [48, 32], siblingGap: 112, depthGap: 118, orientation: "vertical" },
    translate: [320, 100], positions: [[320, 100], [240, 250], [160, 400], [320, 400], [400, 250]] },
  { id: "horizontal", title: "Tree · horizontal", options: { nodeSize: [48, 32], siblingGap: 112, depthGap: 118, orientation: "horizontal" },
    translate: [100, 240], positions: [[100, 240], [250, 160], [400, 80], [400, 240], [250, 320]] },
  { id: "radial", title: "Tree · radial", options: { nodeSize: [48, 32], siblingGap: 112, depthGap: 118, orientation: "radial", radius: 180, startAngle: 0, sweep: 360 },
    translate: [320, 250], positions: [[320, 250], [372.9006727063226, 322.81152949374524], [491.19017293312766, 194.37694101250946], [214.19865458735485, 395.62305898749054], [234.40491353343617, 222.18847050625477]] }
];
