import { chart } from "../../../src/index.js";
import { frame, fontFamily, outlineFixture } from "../../../examples/mark-outlines/data.js";

export function createMarkOutlinePrimitive(style = "rectangle-outline") {
  const f = outlineFixture(style), rgb = c => `rgb(${c.join(",")})`;
  let p = chart().createGraphics({ id: "canvas", type: "canvas" })
    .editGraphics({ target: "canvas", property: "width", value: frame.width })
    .editGraphics({ target: "canvas", property: "height", value: frame.height })
    .editGraphics({ target: "canvas", property: "background", value: "white" })
    .createGraphics({ id: "plot-main", type: "collection", parent: "canvas" })
    .createGraphics({ id: "background", type: "rect", length: 1, parent: "plot-main" })
    .editGraphics({ target: "background", property: "items", value: [{ type: "rect", properties: {
      x: 20, y: 45, width: 240, height: 135, fill: rgb(f.underlay), opacity: 1, stroke: "transparent", strokeWidth: 0 } }] })
    .createGraphics({ id: "title", type: "text", length: 1, parent: "plot-main" })
    .editGraphics({ target: "title", property: "items", value: [{ type: "text", properties: { x: 20, y: 24, text: f.title,
      fill: "#243447", opacity: 1, fontSize: 14, fontFamily: "Arial", fontWeight: "normal", textAlign: "left", textBaseline: "alphabetic", rotation: 0 } }] });
  const appearance = { fill: rgb(f.fill), opacity: f.opacity, lineCap: "round", lineJoin: "round",
    outline: { color: rgb(f.stroke), width: f.strokeWidth } };
  if (f.kind === "rect") p = p.createGraphics({ id: "outlined", type: "rect", length: 1, parent: "plot-main" })
    .editGraphics({ target: "outlined", property: "items", value: [{ type: "rect", properties: { ...f.rect, ...appearance, stroke: "transparent", strokeWidth: 0 } }] });
  else if (f.kind === "circle") p = p.createGraphics({ id: "outlined", type: "circle", length: 1, parent: "plot-main" })
    .editGraphics({ target: "outlined", property: "items", value: [{ type: "circle", properties: { ...f.circle, ...appearance, stroke: "transparent", strokeWidth: 0 } }] });
  else if (f.kind === "path") p = p.createGraphics({ id: "outlined", type: "path", length: 1, parent: "plot-main" })
    .editGraphics({ target: "outlined", property: "items", value: [{ type: "path", properties: { ...appearance, commands: [
      { op: "M", x: 80, y: 140 }, { op: "L", x: 140, y: 70 }, { op: "L", x: 200, y: 140 },
      { op: "L", x: 200, y: 140 }, { op: "L", x: 140, y: 140 }, { op: "L", x: 80, y: 140 }, { op: "Z" }
    ] } }] });
  else p = p.createGraphics({ id: "outlined", type: "text", length: 1, parent: "plot-main" })
    .editGraphics({ target: "outlined", property: "items", value: [{ type: "text", properties: { ...appearance,
      x: 80, y: 130, text: "AB", fontSize: 60, fontFamily, fontWeight: "normal", textAlign: "left", textBaseline: "alphabetic", rotation: 0 } }] });
  return f.clip ? p.editGraphics({ target: "outlined", property: "clip", value: f.clip }) : p;
}
