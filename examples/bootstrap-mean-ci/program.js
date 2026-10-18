import { chart } from "../../src/index.js";

export const values = [[0, 0, 1, 2, 30], [1, 2, 2, 3, 35], [0, 1, 4, 5, 40], [2, 3, 5, 8, 45], [1, 2, 6, 10, 50]]
  .flatMap((observations, x) => observations.map(value => ({ x, value })));
const method = { type: "bootstrap", seed: 1 };
export const publicCalls = [
  { op: "createCanvas", args: { width: 320, height: 220, margin: 20 } },
  { op: "createData", args: { values } },
  { op: "createSummaryData", args: { id: "intervals", groupBy: "x", aggregates: [
    { field: "value", op: "mean", as: "mean" },
    { field: "value", op: { op: "ciLower", method }, as: "lower" },
    { field: "value", op: { op: "ciUpper", method }, as: "upper" }
  ] } },
  { op: "createAreaPlot", args: { x: { field: "x", scale: { domain: [0, 4], nice: false } },
    y: { lower: "lower", upper: "upper", scale: { domain: [0, 40], nice: false } }, guides: false } },
  { op: "editAreaMark", args: { opacity: 0.3 } },
  { op: "createLineMark", args: { id: "meanLine", stroke: "#4c78a8", strokeWidth: 2 } },
  { op: "encodeX", args: { field: "x", scale: { id: "x" } } },
  { op: "encodeY", args: { field: "mean", scale: { id: "y" } } }
];
export function createBootstrapMeanCI() {
  return chart().createCanvas(publicCalls[0].args).createData(publicCalls[1].args)
    .createSummaryData(publicCalls[2].args).createAreaPlot(publicCalls[3].args)
    .editAreaMark(publicCalls[4].args).createLineMark(publicCalls[5].args)
    .encodeX(publicCalls[6].args).encodeY(publicCalls[7].args);
}
