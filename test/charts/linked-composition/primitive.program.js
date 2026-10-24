import { chart, hconcat } from "../../../src/index.js";
import { rows } from "../../../examples/linked-overlay/program.js";
export { rows };

export function barPrimitive() {
  return chart()
    .createCanvas({ plot: { width: 320, height: 240 }, margin: { top: 55, right: 25, bottom: 55, left: 65 } })
    .createData({ id: "data", values: rows })
    .createBarMark({ id: "bars", data: "data" })
    .encodeX({ target: "bars", field: "month", fieldType: "nominal" })
    .encodeY({ target: "bars", field: "sales", aggregate: "sum", scale: { domain: [0, 80], nice: false } })
    .encodeColor({ target: "bars", value: "#9dbbd6" })
    .createGuides();
}

export function overlayPrimitive() {
  return barPrimitive()
    .createLineMark({ id: "trend" })
    .encodeColor({ target: "trend", value: "#1d344c" })
    .createTitle({ text: "Line follows the bar endpoints" });
}

export function adjacentPrimitive() {
  const left = barPrimitive().createTitle({ text: "Sales by month" });
  const right = chart()
    .createCanvas({ plot: { width: 320, height: 240 }, margin: { top: 55, right: 25, bottom: 55, left: 65 } })
    .createData({ id: "data", values: rows })
    .createLineMark({ id: "trend", data: "data" })
    .encodeX({ target: "trend", field: "month", fieldType: "nominal" })
    .encodeY({ target: "trend", field: "sales", scale: { domain: [0, 80], nice: false } })
    .encodeColor({ target: "trend", value: "#1d344c" })
    .createGuides()
    .createTitle({ text: "Same Y scale, aligned plots" });
  return hconcat({ programs: [{ id: "bars", program: left }, { id: "trend", program: right }], gap: 20 });
}

export const variants = [
  { id: "bar-line", create: overlayPrimitive,
    proposedCall: 'program.createOverlay({ id: "trend", source: "bars", type: "line", basis: "visibleItems" })' },
  { id: "shared-y", create: adjacentPrimitive,
    proposedCall: 'program.createAdjacentPlot({ id: "trend", source: "bars", position: "right", plot: { action: "createLinePlot", options: { x: { field: "month" }, y: { field: "sales" } } }, share: { y: true } })' }
];
