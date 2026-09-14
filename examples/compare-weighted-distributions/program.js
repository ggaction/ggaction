import { chart, hconcat } from "../../src/index.js";

export function createWeightedDistributionsWorkflow() {
  const base = chart()
    .createCanvas({ width: 360, height: 300, margin: 65 })
    .createData({ id: "observations", values: [
      { value: 1, weight: 1 }, { value: 2, weight: 3 }, { value: 4, weight: 2 }
    ] });
  const histogram = base.createHistogram({ field: "value", binBoundaries: [0, 2, 3, 5],
    weight: { field: "weight", kind: "frequency" } })
    .createTitle({ text: "Histogram: mass 1, 3, 2" });
  const density = base.createDensityPlot({ field: "value", bandwidth: 0.5,
    extent: [-1, 6], steps: 80, normalization: "unit",
    weight: { field: "weight", kind: "frequency" } })
    .createTitle({ text: "KDE: density per value unit" });
  const ecdf = base.createECDFPlot({ field: "value", weight: "weight" })
    .editXAxisTitle({ text: "Value" })
    .editYAxisTitle({ text: "Cumulative probability" })
    .createTitle({ text: "ECDF: cumulative probability" });
  return hconcat({ programs: [histogram, density, ecdf], gap: 20 });
}
