import { chart } from "../../src/index.js";
import { frame, fontFamily, outlineFixture } from "./data.js";

export function createMarkOutlineExample(style = "rectangle-outline") {
  const f = outlineFixture(style), color = values => `rgb(${values.join(",")})`;
  const margin = f.clip ? { left: f.clip.x, top: f.clip.y,
    right: frame.width - f.clip.x - f.clip.width, bottom: frame.height - f.clip.y - f.clip.height } : 0;
  const x = { domain: [0, 512], range: [0, 512] };
  const y = { domain: [0, 256], range: [0, 256] };
  let p = chart().createCanvas({ ...frame, margin })
    .createData({ id: "backdrop", values: [{ left: 20, right: 260, top: 45, bottom: 180 }] })
    .createRectMark({ id: "background", data: "backdrop", fill: color(f.underlay), stroke: false })
    .encodeXRange({ lower: "left", upper: "right", scale: x })
    .encodeYRange({ lower: "top", upper: "bottom", scale: y })
    .createTextMark({ id: "title", data: "backdrop", text: f.title, fontFamily: "Arial", fontSize: 14, fill: "#243447" })
    .encodeX({ datum: 20, fieldType: "quantitative", scale: x })
    .encodeY({ datum: 24, fieldType: "quantitative", scale: y });
  const appearance = { fill: color(f.fill), outline: { color: color(f.stroke), width: f.strokeWidth },
    opacity: f.opacity, lineCap: "round", lineJoin: "round" };
  if (f.kind === "rect") return p
    .createData({ id: "shape", values: [{ left: 80, right: 200, top: 80, bottom: 140 }] })
    .createRectMark({ id: "outlined", data: "shape", ...appearance, clip: Boolean(f.clip), stroke: false })
    .encodeXRange({ lower: "left", upper: "right", scale: x })
    .encodeYRange({ lower: "top", upper: "bottom", scale: y });
  if (f.kind === "circle") return p
    .createData({ id: "shape", values: [{ x: 140, y: 110 }] })
    .createPointMark({ id: "outlined", data: "shape", ...appearance, stroke: false })
    .encodeX({ field: "x", scale: x }).encodeY({ field: "y", scale: y })
    .encodePointRadius({ value: 36 });
  if (f.kind === "path") return p
    .createData({ id: "shape", values: [{ x: 80, top: 140, bottom: 140 }, { x: 140, top: 70, bottom: 140 }, { x: 200, top: 140, bottom: 140 }] })
    .createAreaMark({ id: "outlined", data: "shape", ...appearance })
    .encodeX({ field: "x", scale: x })
    .encodeYRange({ lower: "top", upper: "bottom", scale: y });
  return p.createData({ id: "shape", values: [{ x: 80, y: 130, label: "AB" }] })
    .createTextMark({ id: "outlined", data: "shape", ...appearance, fontFamily, fontSize: 60 })
    .encodeX({ field: "x", scale: x }).encodeY({ field: "y", scale: y })
    .encodeText({ field: "label" });
}
