import { chart, hconcat } from "../../../src/index.js";
import { repeatChartRows } from "../../../examples/repeat-charts/program.js";

const speed = chart()
  .createCanvas({
    width: 220,
    height: 150,
    margin: { top: 32, right: 72, bottom: 26, left: 30 }
  })
  .createData({ id: "products", values: repeatChartRows })
  .createPointMark({ id: "product", data: "products" })
  .encodeX({ target: "product", field: "speed", scale: { id: "metricScale" } })
  .encodeY({
    target: "product",
    field: "score",
    scale: { id: "scoreScale", domain: [22, 61] }
  })
  .encodeColor({
    target: "product",
    field: "group",
    fieldType: "nominal",
    scale: { id: "groupScale", domain: ["A", "B"] }
  })
  .encodeRadius({ target: "product", value: 4.5 })
  .createGraphics({ id: "header", type: "text", parent: "canvas" })
  .editGraphics({ target: "header", property: "x", value: 89 })
  .editGraphics({ target: "header", property: "y", value: 10 })
  .editGraphics({ target: "header", property: "text", value: "speed" })
  .editGraphics({ target: "header", property: "fill", value: "#0f172a" })
  .editGraphics({ target: "header", property: "fontSize", value: 12 })
  .editGraphics({ target: "header", property: "fontFamily", value: "sans-serif" })
  .editGraphics({ target: "header", property: "fontWeight", value: 600 })
  .editGraphics({ target: "header", property: "textAlign", value: "center" })
  .editGraphics({ target: "header", property: "textBaseline", value: "middle" });

const quality = chart()
  .createCanvas({
    width: 220,
    height: 150,
    margin: { top: 32, right: 72, bottom: 26, left: 30 }
  })
  .createData({ id: "products", values: repeatChartRows })
  .createPointMark({ id: "product", data: "products" })
  .encodeX({ target: "product", field: "quality", scale: { id: "metricScale" } })
  .encodeY({
    target: "product",
    field: "score",
    scale: { id: "scoreScale", domain: [22, 61] }
  })
  .encodeColor({
    target: "product",
    field: "group",
    fieldType: "nominal",
    scale: { id: "groupScale", domain: ["A", "B"] }
  })
  .encodeRadius({ target: "product", value: 4.5 })
  .createGraphics({ id: "header", type: "text", parent: "canvas" })
  .editGraphics({ target: "header", property: "x", value: 89 })
  .editGraphics({ target: "header", property: "y", value: 10 })
  .editGraphics({ target: "header", property: "text", value: "quality" })
  .editGraphics({ target: "header", property: "fill", value: "#0f172a" })
  .editGraphics({ target: "header", property: "fontSize", value: 12 })
  .editGraphics({ target: "header", property: "fontFamily", value: "sans-serif" })
  .editGraphics({ target: "header", property: "fontWeight", value: 600 })
  .editGraphics({ target: "header", property: "textAlign", value: "center" })
  .editGraphics({ target: "header", property: "textBaseline", value: "middle" });

const cost = chart()
  .createCanvas({
    width: 220,
    height: 150,
    margin: { top: 32, right: 72, bottom: 26, left: 30 }
  })
  .createData({ id: "products", values: repeatChartRows })
  .createPointMark({ id: "product", data: "products" })
  .encodeX({ target: "product", field: "cost", scale: { id: "metricScale" } })
  .encodeY({
    target: "product",
    field: "score",
    scale: { id: "scoreScale", domain: [22, 61] }
  })
  .encodeColor({
    target: "product",
    field: "group",
    fieldType: "nominal",
    scale: { id: "groupScale", domain: ["A", "B"] }
  })
  .encodeRadius({ target: "product", value: 4.5 })
  .createGraphics({ id: "header", type: "text", parent: "canvas" })
  .editGraphics({ target: "header", property: "x", value: 89 })
  .editGraphics({ target: "header", property: "y", value: 10 })
  .editGraphics({ target: "header", property: "text", value: "cost" })
  .editGraphics({ target: "header", property: "fill", value: "#0f172a" })
  .editGraphics({ target: "header", property: "fontSize", value: 12 })
  .editGraphics({ target: "header", property: "fontFamily", value: "sans-serif" })
  .editGraphics({ target: "header", property: "fontWeight", value: 600 })
  .editGraphics({ target: "header", property: "textAlign", value: "center" })
  .editGraphics({ target: "header", property: "textBaseline", value: "middle" });

export function createRepeatChartsPrimitive() {
  return hconcat({
    id: "metricsPrimitive",
    programs: [speed, quality, cost],
    gap: 14
  })
    .editGraphics({ target: "canvas", property: "width", value: 838 })
    .createGraphics({ id: "sharedLegend", type: "canvas", parent: "canvas" })
    .editGraphics({ target: "sharedLegend", property: "x", value: 550 })
    .editGraphics({ target: "sharedLegend", property: "y", value: -3.875 })
    .editGraphics({ target: "sharedLegend", property: "width", value: 220 })
    .editGraphics({ target: "sharedLegend", property: "height", value: 150 })
    .editGraphics({ target: "sharedLegend", property: "background", value: "transparent" })
    .createGraphics({
      id: "legendSymbols",
      type: "rect",
      length: 2,
      parent: "sharedLegend"
    })
    .editGraphics({ target: "legendSymbols", property: "x", value: [156.25, 156.25] })
    .editGraphics({ target: "legendSymbols", property: "y", value: [78, 106] })
    .editGraphics({ target: "legendSymbols", property: "width", value: 14 })
    .editGraphics({ target: "legendSymbols", property: "height", value: 12 })
    .editGraphics({
      target: "legendSymbols",
      property: "fill",
      value: ["#4c78a8", "#f58518"]
    })
    .editGraphics({ target: "legendSymbols", property: "stroke", value: "white" })
    .editGraphics({ target: "legendSymbols", property: "strokeWidth", value: 0.5 })
    .createGraphics({
      id: "legendLabels",
      type: "text",
      length: 2,
      parent: "sharedLegend"
    })
    .editGraphics({ target: "legendLabels", property: "x", value: 178.5 })
    .editGraphics({ target: "legendLabels", property: "y", value: [84, 112] })
    .editGraphics({ target: "legendLabels", property: "text", value: ["A", "B"] })
    .editGraphics({ target: "legendLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "legendLabels", property: "fontSize", value: 12 })
    .editGraphics({ target: "legendLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "legendLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "legendLabels", property: "textAlign", value: "left" })
    .editGraphics({ target: "legendLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "legendTitle", type: "text", parent: "sharedLegend" })
    .editGraphics({ target: "legendTitle", property: "x", value: 156 })
    .editGraphics({ target: "legendTitle", property: "y", value: 52 })
    .editGraphics({ target: "legendTitle", property: "text", value: "group" })
    .editGraphics({ target: "legendTitle", property: "fill", value: "#334155" })
    .editGraphics({ target: "legendTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "legendTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "legendTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "legendTitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "legendTitle", property: "textBaseline", value: "middle" });
}
