import { chart } from "../../src/index.js";

export const values = Array.from({ length: 9 }, (_, group) => [1, 2, 1].map((value, x) => ({
  series: `band-${group}`, x, value, level: 10 + 1010 * group
}))).flat();
export const colorRange = ["#D9D9F3", "#00BFFF", "#0276FD", "#000080", "#000080", "#0276FD", "#00BFFF", "#D9D9F3"];
export const publicCalls = [
  { op: "createCanvas", args: { width: 320, height: 220, margin: 20 } },
  { op: "createData", args: { values } },
  { op: "createAreaPlot", args: {
    x: { field: "x", scale: { domain: [0, 2], nice: false } },
    y: { field: "value", scale: { domain: [0, 20], nice: false } }, guides: false
  } },
  { op: "encodeGroup", args: { fields: ["series"] } },
  { op: "encodeColor", args: { field: "level", fieldType: "quantitative", scale: {
    domain: [10, 8090], range: colorRange, interpolate: "hcl", whitePoint: "d50"
  } } },
  { op: "layoutSeries", args: { mode: "stack" } },
  { op: "editAreaMark", args: { opacity: 0.7 } }
];

export function createContinuousAreaColor() {
  return chart()
    .createCanvas(publicCalls[0].args)
    .createData(publicCalls[1].args)
    .createAreaPlot(publicCalls[2].args)
    .encodeGroup(publicCalls[3].args)
    .encodeColor(publicCalls[4].args)
    .layoutSeries(publicCalls[5].args)
    .editAreaMark(publicCalls[6].args);
}
