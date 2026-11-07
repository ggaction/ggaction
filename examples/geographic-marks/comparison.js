import { chart, hconcat } from "../../src/index.js";
import { getMarkItems } from "../../src/inspection.js";
import { createGeographicMarks } from "./program.js";

export function graticuleMeasurements(program) {
  return getMarkItems(program, { target: "graticule" }).map((item, rank) => ({
    id: item.key, axis: item.fields.axis, value: item.fields.value, rank,
    sign: item.fields.value < 0 ? "negative" : item.fields.value > 0 ? "positive" : "zero"
  }));
}

export function createGraticuleComparison() {
  const grid = createGeographicMarks("graticule");
  const analysis = chart().createCanvas({ width: 480, height: 480, margin: { left: 40, right: 140, top: 40, bottom: 40 } })
    .createData({ id: "grid-values", keyField: "id", values: graticuleMeasurements(grid) })
    .createPointMark({ id: "values" })
    .encodeX({ field: "value", scale: { id: "degrees", domain: [-40, 40], nice: false } })
    .encodeY({ field: "rank", scale: { domain: [0, 7], nice: false } }).encodeRadius({ value: 5 })
    .encodeColor({ field: "axis", scale: { range: ["#dc2626", "#2563eb", "#059669"] } })
    .createXAxis({ scale: "degrees", title: false, ticksAndLabels: { values: [-40, 0, 40] } })
    .createLegend({ target: "values" });
  return hconcat({ id: "comparison", gap: 24, programs: [
    { id: "grid", program: grid }, { id: "analysis", program: analysis }
  ] });
}

export function refreshGraticuleComparison(program) {
  return program.reviseData({ target: { childPath: ["analysis"] }, source: "grid-values", id: "updated-grid-values",
    values: graticuleMeasurements(program.children.grid) });
}
