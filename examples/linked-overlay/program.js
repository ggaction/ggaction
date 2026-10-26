import { chart } from "../../src/index.js";

export const rows = [
  { month: "Jan", sales: 20 }, { month: "Feb", sales: 45 },
  { month: "Mar", sales: 30 }, { month: "Apr", sales: 65 }
];
export const canvas = { plot: { width: 320, height: 240 },
  margin: { top: 55, right: 25, bottom: 55, left: 65 } };
export const publicCalls = [
  { op: "createCanvas", args: canvas }, { op: "createData", args: { id: "data", values: rows } },
  { op: "createBarMark", args: { id: "bars", data: "data" } },
  { op: "encodeX", args: { target: "bars", field: "month", fieldType: "nominal" } },
  { op: "encodeY", args: { target: "bars", field: "sales", aggregate: "sum", scale: { domain: [0, 80], nice: false } } },
  { op: "encodeColor", args: { target: "bars", value: "#9dbbd6" } }, { op: "createGuides", args: {} },
  { op: "createOverlay", args: { id: "trend", source: "bars" } },
  { op: "encodeColor", args: { target: "trend", value: "#1d344c" } },
  { op: "createTitle", args: { text: "Line follows the bar endpoints" } }
];

export function createSalesBars() {
  return chart().createCanvas(canvas)
    .createData({ id: "data", values: rows })
    .createBarMark({ id: "bars", data: "data" })
    .encodeX({ target: "bars", field: "month", fieldType: "nominal" })
    .encodeY({ target: "bars", field: "sales", aggregate: "sum", scale: { domain: [0, 80], nice: false } })
    .encodeColor({ target: "bars", value: "#9dbbd6" })
    .createGuides();
}

export function createLinkedOverlay() {
  return createSalesBars()
    .createOverlay({ id: "trend", source: "bars" })
    .encodeColor({ target: "trend", value: "#1d344c" })
    .createTitle({ text: "Line follows the bar endpoints" });
}
