import { chart } from "../../src/index.js";
export const layout = {"width": 480, "height": 270, "margin": 0, "background": "#ffffff"};
export const gamma1DataOptions = {
  id: "gamma1Data",
  values: [
    {"lo": 30, "hi": 76, "bottom": 180, "top": 205, "value": 0.0},
    {"lo": 76, "hi": 122, "bottom": 180, "top": 205, "value": 0.125},
    {"lo": 122, "hi": 168, "bottom": 180, "top": 205, "value": 0.25},
    {"lo": 168, "hi": 214, "bottom": 180, "top": 205, "value": 0.375},
    {"lo": 214, "hi": 260, "bottom": 180, "top": 205, "value": 0.5},
    {"lo": 260, "hi": 306, "bottom": 180, "top": 205, "value": 0.625},
    {"lo": 306, "hi": 352, "bottom": 180, "top": 205, "value": 0.75},
    {"lo": 352, "hi": 398, "bottom": 180, "top": 205, "value": 0.875},
    {"lo": 398, "hi": 444, "bottom": 180, "top": 205, "value": 1.0}
  ]
};
export const gamma1MarkOptions = {"id": "gamma1", "data": "gamma1Data", "stroke": false};
export const gamma1XOptions = {"target": "gamma1", "lower": "lo", "upper": "hi", "scale": {"id": "gamma1X", "domain": [0, 480]}};
export const gamma1YOptions = {"target": "gamma1", "lower": "bottom", "upper": "top", "scale": {"id": "gamma1Y", "domain": [0, 270]}};
export const gamma1ColorOptions = {"target": "gamma1", "field": "value", "fieldType": "quantitative", "scale": {"id": "gamma1Color", "domain": [0, 1], "range": ["#75190b", "#90f2a4"], "interpolate": "cubehelix"}};
export const gamma22DataOptions = {
  id: "gamma22Data",
  values: [
    {"lo": 30, "hi": 76, "bottom": 148, "top": 173, "value": 0.0},
    {"lo": 76, "hi": 122, "bottom": 148, "top": 173, "value": 0.125},
    {"lo": 122, "hi": 168, "bottom": 148, "top": 173, "value": 0.25},
    {"lo": 168, "hi": 214, "bottom": 148, "top": 173, "value": 0.375},
    {"lo": 214, "hi": 260, "bottom": 148, "top": 173, "value": 0.5},
    {"lo": 260, "hi": 306, "bottom": 148, "top": 173, "value": 0.625},
    {"lo": 306, "hi": 352, "bottom": 148, "top": 173, "value": 0.75},
    {"lo": 352, "hi": 398, "bottom": 148, "top": 173, "value": 0.875},
    {"lo": 398, "hi": 444, "bottom": 148, "top": 173, "value": 1.0}
  ]
};
export const gamma22MarkOptions = {"id": "gamma22", "data": "gamma22Data", "stroke": false};
export const gamma22XOptions = {"target": "gamma22", "lower": "lo", "upper": "hi", "scale": {"id": "gamma22X", "domain": [0, 480]}};
export const gamma22YOptions = {"target": "gamma22", "lower": "bottom", "upper": "top", "scale": {"id": "gamma22Y", "domain": [0, 270]}};
export const gamma22ColorOptions = {"target": "gamma22", "field": "value", "fieldType": "quantitative", "scale": {"id": "gamma22Color", "domain": [0, 1], "range": ["#75190b", "#90f2a4"], "interpolate": "cubehelix"}};
export const gamma22EditOptions = {"target": "gamma22", "gamma": 2.2};
export const powerDataOptions = {
  id: "powerData",
  values: [
    {"lo": 30, "hi": 76, "bottom": 70, "top": 95, "value": -2.0},
    {"lo": 76, "hi": 122, "bottom": 70, "top": 95, "value": -1.5},
    {"lo": 122, "hi": 168, "bottom": 70, "top": 95, "value": -1.0},
    {"lo": 168, "hi": 214, "bottom": 70, "top": 95, "value": -0.5},
    {"lo": 214, "hi": 260, "bottom": 70, "top": 95, "value": 0.0},
    {"lo": 260, "hi": 306, "bottom": 70, "top": 95, "value": 0.5},
    {"lo": 306, "hi": 352, "bottom": 70, "top": 95, "value": 1.0},
    {"lo": 352, "hi": 398, "bottom": 70, "top": 95, "value": 1.5},
    {"lo": 398, "hi": 444, "bottom": 70, "top": 95, "value": 2.0}
  ]
};
export const powerMarkOptions = {"id": "power", "data": "powerData", "stroke": false};
export const powerXOptions = {"target": "power", "lower": "lo", "upper": "hi", "scale": {"id": "powerX", "domain": [0, 480]}};
export const powerYOptions = {"target": "power", "lower": "bottom", "upper": "top", "scale": {"id": "powerY", "domain": [0, 270]}};
export const powerColorOptions = {"target": "power", "field": "value", "fieldType": "quantitative", "scale": {"id": "powerColor", "domain": [-2, 2], "range": ["blue", "red"], "interpolate": "rgb"}};
export const powerEditOptions = {"target": "power", "type": "pow", "exponent": 3};
export const publicCalls = [
  { op: "createCanvas", args: layout },
  { op: "createData", args: gamma1DataOptions },
  { op: "createRectMark", args: gamma1MarkOptions },
  { op: "encodeXRange", args: gamma1XOptions },
  { op: "encodeYRange", args: gamma1YOptions },
  { op: "encodeColor", args: gamma1ColorOptions },
  { op: "createData", args: gamma22DataOptions },
  { op: "createRectMark", args: gamma22MarkOptions },
  { op: "encodeXRange", args: gamma22XOptions },
  { op: "encodeYRange", args: gamma22YOptions },
  { op: "encodeColor", args: gamma22ColorOptions },
  { op: "editColorScale", args: gamma22EditOptions },
  { op: "createData", args: powerDataOptions },
  { op: "createRectMark", args: powerMarkOptions },
  { op: "encodeXRange", args: powerXOptions },
  { op: "encodeYRange", args: powerYOptions },
  { op: "encodeColor", args: powerColorOptions },
  { op: "editColorScale", args: powerEditOptions }
];
export function createColorControls() {
  return chart()
    .createCanvas(layout)
    .createData(gamma1DataOptions)
    .createRectMark(gamma1MarkOptions)
    .encodeXRange(gamma1XOptions)
    .encodeYRange(gamma1YOptions)
    .encodeColor(gamma1ColorOptions)
    .createData(gamma22DataOptions)
    .createRectMark(gamma22MarkOptions)
    .encodeXRange(gamma22XOptions)
    .encodeYRange(gamma22YOptions)
    .encodeColor(gamma22ColorOptions)
    .editColorScale(gamma22EditOptions)
    .createData(powerDataOptions)
    .createRectMark(powerMarkOptions)
    .encodeXRange(powerXOptions)
    .encodeYRange(powerYOptions)
    .encodeColor(powerColorOptions)
    .editColorScale(powerEditOptions);
}
