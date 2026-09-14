import { chart, hconcat } from "../../src/index.js";

export function createMissingObservationsWorkflow() {
  const rows = [{ t: 1, value: 2 }, { t: 3, value: 6 }];
  function derive(program, source, suffix) {
    return program
      .createCompleteData({ id: `complete${suffix}`, source, key: "t", values: [1, 2, 3] })
      .createImputedData({ id: `imputed${suffix}`, source: `complete${suffix}`,
        fields: "value", sortBy: [{ field: "t" }], method: "linear" })
      .createWindowData({ id: `window${suffix}`, source: `imputed${suffix}`,
        sortBy: [{ field: "t" }], operations: [
          { op: "movingMean", field: "value", as: "mean", frame: { preceding: 1 } }
        ] });
  }
  const before = derive(chart()
    .createCanvas({ width: 420, height: 300, margin: 65 })
    .createData({ id: "raw", values: rows }), "raw", "Before")
    .createLinePlot({ id: "trend", data: "windowBefore", x: "t", y: "mean" });
  const after = derive(before.createData({ id: "replacement", values: [
    { t: 1, value: 4 }, { t: 3, value: 8 }
  ] }), "replacement", "After")
    .bindMarkData({ target: "trend", data: "windowAfter" });
  return hconcat({ programs: [
    before.createTitle({ text: "Before: moving means 2, 3, 5" }),
    after.createTitle({ text: "After: moving means 4, 5, 7" })
  ], gap: 20 });
}
