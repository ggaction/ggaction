import { chart } from "../../../src/index.js";

function encodedGraphicId(namespace, localId) {
  const encode = value => [...value]
    .map(character => character.codePointAt(0).toString(16).padStart(6, "0"))
    .join("");
  return `g${encode(namespace)}_${localId}`;
}

const mainCanvas = encodedGraphicId("dashboard-main", "canvas");
const mainPlot = encodedGraphicId("dashboard-main", "plot-main");
const mainPoint = encodedGraphicId("dashboard-main", "point");
const mainTitle = encodedGraphicId("dashboard-main", "chartTitle");
const detailCanvas = encodedGraphicId("dashboard-detail", "canvas");
const detailPlot = encodedGraphicId("dashboard-detail", "plot-main");
const detailBar = encodedGraphicId("dashboard-detail", "bar");
const detailTitle = encodedGraphicId("dashboard-detail", "chartTitle");

export function createProgramCompositionPrimitives() {
  let program = chart()
    .createGraphics({ id: "canvas", type: "canvas" })
    .editGraphics({ target: "canvas", property: "width", value: 588 })
    .editGraphics({ target: "canvas", property: "height", value: 244 })
    .editGraphics({ target: "canvas", property: "background", value: "white" })
    .createGraphics({ id: mainCanvas, type: "canvas", parent: "canvas" })
    .editGraphics({ target: mainCanvas, property: "width", value: 280 })
    .editGraphics({ target: mainCanvas, property: "height", value: 220 })
    .editGraphics({ target: mainCanvas, property: "background", value: "#eff6ff" })
    .editGraphics({ target: mainCanvas, property: "x", value: 12 })
    .editGraphics({ target: mainCanvas, property: "y", value: 12 })
    .createGraphics({ id: mainPlot, type: "collection", parent: mainCanvas })
    .createGraphics({ id: mainPoint, type: "circle", length: 3, parent: mainPlot })
    .editGraphics({ target: mainPoint, property: "fill", value: "#4c78a8" })
    .editGraphics({ target: mainPoint, property: "x", value: [36, 144, 252] })
    .editGraphics({ target: mainPoint, property: "y", value: [188, 52, 120] })
    .editGraphics({ target: mainPoint, property: "radius", value: 5 })
    .createGraphics({ id: mainTitle, type: "text", parent: mainCanvas })
    .editGraphics({ target: mainTitle, property: "x", value: 36 })
    .editGraphics({ target: mainTitle, property: "y", value: 23.5 })
    .editGraphics({ target: mainTitle, property: "text", value: "Observed points" })
    .editGraphics({ target: mainTitle, property: "fill", value: "#0f172a" })
    .editGraphics({ target: mainTitle, property: "fontSize", value: 15 })
    .editGraphics({ target: mainTitle, property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: mainTitle, property: "fontWeight", value: 600 })
    .editGraphics({ target: mainTitle, property: "textAlign", value: "left" })
    .editGraphics({ target: mainTitle, property: "textBaseline", value: "middle" })
    .createGraphics({ id: detailCanvas, type: "canvas", parent: "canvas" })
    .editGraphics({ target: detailCanvas, property: "width", value: 260 })
    .editGraphics({ target: detailCanvas, property: "height", value: 220 })
    .editGraphics({ target: detailCanvas, property: "background", value: "#fff7ed" })
    .editGraphics({ target: detailCanvas, property: "x", value: 316 })
    .editGraphics({ target: detailCanvas, property: "y", value: 12 })
    .createGraphics({ id: detailPlot, type: "collection", parent: detailCanvas })
    .createGraphics({ id: detailBar, type: "rect", length: 3, parent: detailPlot })
    .editGraphics({
      target: detailBar,
      property: "x",
      value: [45.14666666666666, 110.48, 175.81333333333333]
    })
    .editGraphics({ target: detailBar, property: "y", value: [120, 69, 103] })
    .editGraphics({
      target: detailBar,
      property: "width",
      value: 47.03999999999999
    })
    .editGraphics({ target: detailBar, property: "height", value: [68, 119, 85] })
    .editGraphics({ target: detailBar, property: "fill", value: "#f58518" })
    .editGraphics({ target: detailBar, property: "stroke", value: "white" })
    .editGraphics({ target: detailBar, property: "strokeWidth", value: 0.5 })
    .createGraphics({ id: detailTitle, type: "text", parent: detailCanvas })
    .editGraphics({ target: detailTitle, property: "x", value: 36 })
    .editGraphics({ target: detailTitle, property: "y", value: 23.5 })
    .editGraphics({ target: detailTitle, property: "text", value: "Replacement bars" })
    .editGraphics({ target: detailTitle, property: "fill", value: "#0f172a" })
    .editGraphics({ target: detailTitle, property: "fontSize", value: 15 })
    .editGraphics({ target: detailTitle, property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: detailTitle, property: "fontWeight", value: 600 })
    .editGraphics({ target: detailTitle, property: "textAlign", value: "left" })
    .editGraphics({ target: detailTitle, property: "textBaseline", value: "middle" });
  return program;
}
