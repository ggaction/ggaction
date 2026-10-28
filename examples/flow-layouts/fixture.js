export const canvas = { width: 640, height: 500, margin: { left: 40, right: 40, top: 80, bottom: 40 }, background: "#ffffff" };
export const variants = [
  { id: "dag", method: "dag", orientation: "horizontal", title: "Flow · two sources, one total" },
  { id: "vertical", method: "dag", orientation: "vertical", title: "Flow · vertical conservation" },
  { id: "cyclic", method: "cyclic", orientation: "horizontal", title: "Flow · both directions retained" },
  { id: "cyclic-vertical", method: "cyclic", orientation: "vertical", title: "Flow · vertical feedback lanes" }
];
export const dagNodes = [{ id: "Supply A" }, { id: "Supply B" }, { id: "Total" }];
export const dagEdges = [{ id: "a", from: "Supply A", to: "Total", value: 6 }, { id: "b", from: "Supply B", to: "Total", value: 4 }];
export const cyclicNodes = [{ id: "Process A" }, { id: "Process B" }];
export const cyclicEdges = [{ id: "a", from: "Process A", to: "Process B", value: 2 }, { id: "b", from: "Process B", to: "Process A", value: 2 }];
export const colors = ["#2563eb", "#f59e0b", "#0d9488"];
