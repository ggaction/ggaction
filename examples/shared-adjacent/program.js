import { createSalesBars, publicCalls as overlayCalls } from "../linked-overlay/program.js";

const adjacent = { id: "trend", source: "bars", position: "right", gap: 20,
  plot: { action: "createLinePlot", options: { x: { field: "month" }, y: { field: "sales" },
    line: { stroke: "#1d344c" }, guides: { axes: { y: { title: { text: "sales" } } } } } }, share: { y: true } };
const title = { target: { childPath: ["trend"] }, text: "Same Y scale, aligned plots" };
export const publicCalls = [...overlayCalls.slice(0, 7),
  { op: "createTitle", args: { text: "Sales by month" } },
  { op: "createAdjacentPlot", args: adjacent }, { op: "createTitle", args: title }];
export function createSharedAdjacent() {
  return createSalesBars().createTitle({ text: "Sales by month" })
    .createAdjacentPlot(adjacent).createTitle(title);
}
