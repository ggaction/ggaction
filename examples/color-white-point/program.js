import { chart } from "../../src/index.js";
export const layout = {"width": 480, "height": 270, "margin": 0, "background": "#ffffff"};
export const d65DataOptions = {
  id: "d65Data",
  values: [
    {"lo": 30, "hi": 76, "bottom": 160, "top": 200, "value": 0.0},
    {"lo": 76, "hi": 122, "bottom": 160, "top": 200, "value": 0.125},
    {"lo": 122, "hi": 168, "bottom": 160, "top": 200, "value": 0.25},
    {"lo": 168, "hi": 214, "bottom": 160, "top": 200, "value": 0.375},
    {"lo": 214, "hi": 260, "bottom": 160, "top": 200, "value": 0.5},
    {"lo": 260, "hi": 306, "bottom": 160, "top": 200, "value": 0.625},
    {"lo": 306, "hi": 352, "bottom": 160, "top": 200, "value": 0.75},
    {"lo": 352, "hi": 398, "bottom": 160, "top": 200, "value": 0.875},
    {"lo": 398, "hi": 444, "bottom": 160, "top": 200, "value": 1.0}
  ]
};
export const d65MarkOptions = {"id": "d65", "data": "d65Data", "stroke": false};
export const d65XOptions = {"target": "d65", "lower": "lo", "upper": "hi", "scale": {"id": "d65X", "domain": [0, 480]}};
export const d65YOptions = {"target": "d65", "lower": "bottom", "upper": "top", "scale": {"id": "d65Y", "domain": [0, 270]}};
export const d65ColorOptions = {"target": "d65", "field": "value", "fieldType": "quantitative", "scale": {"id": "d65Color", "domain": [0, 1], "range": ["red", "blue"], "interpolate": "lab"}};
export const d50DataOptions = {
  id: "d50Data",
  values: [
    {"lo": 30, "hi": 76, "bottom": 75, "top": 115, "value": 0.0},
    {"lo": 76, "hi": 122, "bottom": 75, "top": 115, "value": 0.125},
    {"lo": 122, "hi": 168, "bottom": 75, "top": 115, "value": 0.25},
    {"lo": 168, "hi": 214, "bottom": 75, "top": 115, "value": 0.375},
    {"lo": 214, "hi": 260, "bottom": 75, "top": 115, "value": 0.5},
    {"lo": 260, "hi": 306, "bottom": 75, "top": 115, "value": 0.625},
    {"lo": 306, "hi": 352, "bottom": 75, "top": 115, "value": 0.75},
    {"lo": 352, "hi": 398, "bottom": 75, "top": 115, "value": 0.875},
    {"lo": 398, "hi": 444, "bottom": 75, "top": 115, "value": 1.0}
  ]
};
export const d50MarkOptions = {"id": "d50", "data": "d50Data", "stroke": false};
export const d50XOptions = {"target": "d50", "lower": "lo", "upper": "hi", "scale": {"id": "d50X", "domain": [0, 480]}};
export const d50YOptions = {"target": "d50", "lower": "bottom", "upper": "top", "scale": {"id": "d50Y", "domain": [0, 270]}};
export const d50ColorOptions = {"target": "d50", "field": "value", "fieldType": "quantitative", "scale": {"id": "d50Color", "domain": [0, 1], "range": ["red", "blue"], "interpolate": "lab"}};
export const d50EditOptions = {"target": "d50", "whitePoint": "d50"};
export const publicCalls = [
  { op: "createCanvas", args: layout },
  { op: "createData", args: d65DataOptions },
  { op: "createRectMark", args: d65MarkOptions },
  { op: "encodeXRange", args: d65XOptions },
  { op: "encodeYRange", args: d65YOptions },
  { op: "encodeColor", args: d65ColorOptions },
  { op: "createData", args: d50DataOptions },
  { op: "createRectMark", args: d50MarkOptions },
  { op: "encodeXRange", args: d50XOptions },
  { op: "encodeYRange", args: d50YOptions },
  { op: "encodeColor", args: d50ColorOptions },
  { op: "editColorScale", args: d50EditOptions }
];
export function createWhitePointComparison() {
  return chart()
    .createCanvas(layout)
    .createData(d65DataOptions)
    .createRectMark(d65MarkOptions)
    .encodeXRange(d65XOptions)
    .encodeYRange(d65YOptions)
    .encodeColor(d65ColorOptions)
    .createData(d50DataOptions)
    .createRectMark(d50MarkOptions)
    .encodeXRange(d50XOptions)
    .encodeYRange(d50YOptions)
    .encodeColor(d50ColorOptions)
    .editColorScale(d50EditOptions);
}
