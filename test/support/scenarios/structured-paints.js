import { chart } from "../../../src/index.js";
import { variants } from "../../../examples/structured-paints/data.js";
import { realisticRecordView } from "./realistic-data.js";

// The source view and paint variants are shared by lifecycle and direct-option
// witnesses, so both exercise the same pinned rows through public actions.
export const structuredPaintVariants = Object.freeze([
  ...variants,
  { id: "linear", title: "Linear gradient", opacity: .7, fill: {
    type: "linear-gradient", from: { x: 0, y: 0 }, to: { x: 1, y: 1 },
    stops: [{ offset: 0, color: "#2563eb" }, { offset: .5, color: "#60a5fa" }, { offset: 1, color: "#f59e0b" }]
  } }
]);

export function structuredPaintRecordBase(dataset) {
  const view = realisticRecordView(dataset, { rowLimit: 32, groupLimit: 4 });
  const rows = view.rows.map(row => ({ ...row,
    index: row.sourceRowIndex + 1, end: row.sourceRowIndex + 2,
    magnitude: Math.abs(row.value) + 1
  }));
  return {
    rows, provenance: view.provenance,
    program: chart().createCanvas({ width: 360, height: 260, margin: 35 })
      .createData({ id: "rows", values: rows })
  };
}
