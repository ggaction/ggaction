import { chart } from "../../src/index.js";

export function createInspectionChart() {
  return chart().createCanvas({ width: 420, height: 300, margin: 70 })
    .createData({ id: "observations", keyField: "id", values: [
      { id: "a", x: 2, y: 3 }, { id: "b", x: 8, y: 7 }, { id: "c", x: 2, y: 3 }
    ] })
    .createPointMark({ id: "observations" })
    .encodeX({ field: "x", scale: { domain: [0, 10], nice: false } })
    .encodeY({ field: "y", scale: { domain: [0, 10], nice: false } })
    .createXAxis({ ticksAndLabels: { values: [0, 5, 10] }, title: false })
    .createYAxis({ ticksAndLabels: { values: [0, 5, 10] }, title: false })
    .createTitle({ text: "Inspect overlapping observations" });
}

export function createSelectionHandleChart() {
  return createInspectionChart().selectMarks({ id: "window", target: "observations", region: { x: { ranges: [{ min: 2, max: 6 }] } } })
    .highlightMarks({ selection: "window", color: "#dc2626", dimOthers: false, bringToFront: false });
}

export function createCategoryHandleChart() {
  return chart().createCanvas({ width: 420, height: 300, margin: { left: 70, right: 30, top: 30, bottom: 80 } })
    .createData({ id: "categories", values: [{ category: "A", value: 2 }, { category: "B", value: 5 }, { category: "C", value: 3 }] })
    .createBarPlot({ id: "bars", x: "category", y: "value" });
}
