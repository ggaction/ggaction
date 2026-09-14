import { chart, hconcat } from "../../src/index.js";

export function createSelectedLabelsWorkflow() {
  const before = chart()
    .createCanvas({ width: 420, height: 320, margin: 70 })
    .createData({ values: [
      { category: "A", value: 2 }, { category: "A", value: 3 },
      { category: "B", value: 9 }, { category: "C", value: 7 }
    ] })
    .createBarPlot({ id: "bars", x: "category", y: { field: "value", aggregate: "sum" } })
    .createMarkLabels({ id: "totals", source: "bars", field: "value" });
  const after = before
    .editMarkLabelSelection({ target: "totals", select: { field: "value", op: "max", count: 2 } })
    .editMarkLabelPlacement({ target: "totals", placement: {
      anchor: "outsideEnd", gap: 5, overflow: "outside", leader: { stroke: "#64748b" }
    } })
    .layoutLabels({ target: "totals", axis: "y", maxDisplacement: 24,
      padding: 3, bounds: "canvas", leader: false });
  return hconcat({ programs: [
    before.createTitle({ text: "All final bar totals" }),
    after.createTitle({ text: "Top two totals: 9 and 7" })
  ], gap: 20 });
}
