import { chart, hconcat, vconcat } from "../../../src/index.js";
import { facetGridRows } from "../../../examples/facet-grid/program.js";

const northQ1 = chart()
  .createCanvas({
    width: 160,
    height: 130,
    margin: { top: 30, right: 20, bottom: 22, left: 26 }
  })
  .createData({
    id: "metrics",
    values: facetGridRows.filter(row => row.region === "North" && row.period === "Q1")
  })
  .createPointMark({ id: "result", data: "metrics", fill: "#2563eb" })
  .encodeX({
    target: "result",
    field: "value",
    scale: { id: "valueScale", domain: [18, 42] }
  })
  .encodeY({
    target: "result",
    field: "target",
    scale: { id: "targetScale", domain: [20, 40] }
  })
  .encodeRadius({ target: "result", value: 5 })
  .createGraphics({ id: "header", type: "text", parent: "canvas" })
  .editGraphics({ target: "header", property: "x", value: 83 })
  .editGraphics({ target: "header", property: "y", value: 10 })
  .editGraphics({ target: "header", property: "text", value: "North · Q1" })
  .editGraphics({ target: "header", property: "fill", value: "#0f172a" })
  .editGraphics({ target: "header", property: "fontSize", value: 12 })
  .editGraphics({ target: "header", property: "fontFamily", value: "sans-serif" })
  .editGraphics({ target: "header", property: "fontWeight", value: 600 })
  .editGraphics({ target: "header", property: "textAlign", value: "center" })
  .editGraphics({ target: "header", property: "textBaseline", value: "middle" });

const northQ2 = chart()
  .createCanvas({
    width: 160,
    height: 130,
    margin: { top: 30, right: 20, bottom: 22, left: 26 }
  })
  .createData({
    id: "metrics",
    values: facetGridRows.filter(row => row.region === "North" && row.period === "Q2")
  })
  .createPointMark({ id: "result", data: "metrics", fill: "#2563eb" })
  .encodeX({
    target: "result",
    field: "value",
    scale: { id: "valueScale", domain: [18, 42] }
  })
  .encodeY({
    target: "result",
    field: "target",
    scale: { id: "targetScale", domain: [20, 40] }
  })
  .encodeRadius({ target: "result", value: 5 })
  .createGraphics({ id: "header", type: "text", parent: "canvas" })
  .editGraphics({ target: "header", property: "x", value: 83 })
  .editGraphics({ target: "header", property: "y", value: 10 })
  .editGraphics({ target: "header", property: "text", value: "North · Q2" })
  .editGraphics({ target: "header", property: "fill", value: "#0f172a" })
  .editGraphics({ target: "header", property: "fontSize", value: 12 })
  .editGraphics({ target: "header", property: "fontFamily", value: "sans-serif" })
  .editGraphics({ target: "header", property: "fontWeight", value: 600 })
  .editGraphics({ target: "header", property: "textAlign", value: "center" })
  .editGraphics({ target: "header", property: "textBaseline", value: "middle" });

const northQ3 = chart()
  .createCanvas({
    width: 160,
    height: 130,
    margin: { top: 30, right: 20, bottom: 22, left: 26 }
  })
  .createData({
    id: "metrics",
    values: facetGridRows.filter(row => row.region === "North" && row.period === "Q3")
  })
  .createPointMark({ id: "result", data: "metrics", fill: "#2563eb" })
  .encodeX({
    target: "result",
    field: "value",
    scale: { id: "valueScale", domain: [18, 42] }
  })
  .encodeY({
    target: "result",
    field: "target",
    scale: { id: "targetScale", domain: [20, 40] }
  })
  .encodeRadius({ target: "result", value: 5 })
  .createGraphics({ id: "header", type: "text", parent: "canvas" })
  .editGraphics({ target: "header", property: "x", value: 83 })
  .editGraphics({ target: "header", property: "y", value: 10 })
  .editGraphics({ target: "header", property: "text", value: "North · Q3" })
  .editGraphics({ target: "header", property: "fill", value: "#0f172a" })
  .editGraphics({ target: "header", property: "fontSize", value: 12 })
  .editGraphics({ target: "header", property: "fontFamily", value: "sans-serif" })
  .editGraphics({ target: "header", property: "fontWeight", value: 600 })
  .editGraphics({ target: "header", property: "textAlign", value: "center" })
  .editGraphics({ target: "header", property: "textBaseline", value: "middle" });

const southQ1 = chart()
  .createCanvas({
    width: 160,
    height: 130,
    margin: { top: 30, right: 20, bottom: 22, left: 26 }
  })
  .createData({
    id: "metrics",
    values: facetGridRows.filter(row => row.region === "South" && row.period === "Q1")
  })
  .createPointMark({ id: "result", data: "metrics", fill: "#2563eb" })
  .encodeX({
    target: "result",
    field: "value",
    scale: { id: "valueScale", domain: [18, 42] }
  })
  .encodeY({
    target: "result",
    field: "target",
    scale: { id: "targetScale", domain: [20, 40] }
  })
  .encodeRadius({ target: "result", value: 5 })
  .createGraphics({ id: "header", type: "text", parent: "canvas" })
  .editGraphics({ target: "header", property: "x", value: 83 })
  .editGraphics({ target: "header", property: "y", value: 10 })
  .editGraphics({ target: "header", property: "text", value: "South · Q1" })
  .editGraphics({ target: "header", property: "fill", value: "#0f172a" })
  .editGraphics({ target: "header", property: "fontSize", value: 12 })
  .editGraphics({ target: "header", property: "fontFamily", value: "sans-serif" })
  .editGraphics({ target: "header", property: "fontWeight", value: 600 })
  .editGraphics({ target: "header", property: "textAlign", value: "center" })
  .editGraphics({ target: "header", property: "textBaseline", value: "middle" });

const southQ2 = chart()
  .createCanvas({
    width: 160,
    height: 130,
    margin: { top: 30, right: 20, bottom: 22, left: 26 }
  })
  .createData({ id: "metrics", values: [] })
  .createGraphics({ id: "header", type: "text", parent: "canvas" })
  .editGraphics({ target: "header", property: "x", value: 83 })
  .editGraphics({ target: "header", property: "y", value: 10 })
  .editGraphics({ target: "header", property: "text", value: "South · Q2" })
  .editGraphics({ target: "header", property: "fill", value: "#0f172a" })
  .editGraphics({ target: "header", property: "fontSize", value: 12 })
  .editGraphics({ target: "header", property: "fontFamily", value: "sans-serif" })
  .editGraphics({ target: "header", property: "fontWeight", value: 600 })
  .editGraphics({ target: "header", property: "textAlign", value: "center" })
  .editGraphics({ target: "header", property: "textBaseline", value: "middle" });

const southQ3 = chart()
  .createCanvas({
    width: 160,
    height: 130,
    margin: { top: 30, right: 20, bottom: 22, left: 26 }
  })
  .createData({
    id: "metrics",
    values: facetGridRows.filter(row => row.region === "South" && row.period === "Q3")
  })
  .createPointMark({ id: "result", data: "metrics", fill: "#2563eb" })
  .encodeX({
    target: "result",
    field: "value",
    scale: { id: "valueScale", domain: [18, 42] }
  })
  .encodeY({
    target: "result",
    field: "target",
    scale: { id: "targetScale", domain: [20, 40] }
  })
  .encodeRadius({ target: "result", value: 5 })
  .createGraphics({ id: "header", type: "text", parent: "canvas" })
  .editGraphics({ target: "header", property: "x", value: 83 })
  .editGraphics({ target: "header", property: "y", value: 10 })
  .editGraphics({ target: "header", property: "text", value: "South · Q3" })
  .editGraphics({ target: "header", property: "fill", value: "#0f172a" })
  .editGraphics({ target: "header", property: "fontSize", value: 12 })
  .editGraphics({ target: "header", property: "fontFamily", value: "sans-serif" })
  .editGraphics({ target: "header", property: "fontWeight", value: 600 })
  .editGraphics({ target: "header", property: "textAlign", value: "center" })
  .editGraphics({ target: "header", property: "textBaseline", value: "middle" });

export function createFacetGridPrimitive() {
  const north = hconcat({
    id: "north",
    programs: [northQ1, northQ2, northQ3],
    gap: 12
  });
  const south = hconcat({
    id: "south",
    programs: [southQ1, southQ2, southQ3],
    gap: 12
  });
  return vconcat({ id: "matrixPrimitive", programs: [north, south], gap: 12 });
}
