import {chart} from "../../src/index.js";

export function createBlendProgram({background="#ffffff",opacity=1,strokeWidth=8,blend="difference"}={}) {
  return chart().createCanvas({width:200,height:200,margin:40,background})
    .createData({values:[{category:"a",value:1}]})
    .createBarPlot({x:"category",y:{field:"value",aggregate:"sum"},guides:false})
    .encodeBarWidth({pixels:80})
    .editBarMark({fill:"#f00000",stroke:"#ffff00",strokeWidth})
    .editBarMark({blend,opacity});
}

// The same per-item blend contract applies to filled and stroked glyphs.
export function createBlendGlyphProgram({ type = "point", blend = "multiply", opacity = .5 } = {}) {
  let p = chart().createCanvas({ width: 200, height: 160, margin: 0, background: "#336699" })
    .createData({ id: "rows", values: type === "line"
      ? [{ x: 50, y: 80 }, { x: 150, y: 80 }]
      : [{ x: 100, y: 80, lo: 60, hi: 140, top: 40, bottom: 120, label: "AB" }] });
  const x = { domain: [0, 200], range: [0, 200] }, y = { domain: [0, 160], range: [0, 160] };
  const appearance = { blend, opacity, fill: "red", outline: { color: "white", width: 8 }, stroke: false };
  if (type === "point") return p.createPointMark({ id: "glyph", ...appearance })
    .encodeX({ field: "x", scale: x }).encodeY({ field: "y", scale: y }).encodePointRadius({ value: 35 });
  if (type === "rect") return p.createRectMark({ id: "glyph", ...appearance })
    .encodeXRange({ lower: "lo", upper: "hi", scale: x }).encodeYRange({ lower: "top", upper: "bottom", scale: y });
  if (type === "line") return p.createLineMark({ id: "glyph", blend, opacity, stroke: "red", strokeWidth: 8 })
    .encodeX({ field: "x", scale: x }).encodeY({ field: "y", scale: y });
  if (type === "text") return p.createTextMark({ id: "glyph", blend, opacity, fill: "red", outline: appearance.outline,
      fontFamily: "Arial", fontSize: 36, align: "center", baseline: "middle" })
    .encodeX({ field: "x", scale: x }).encodeY({ field: "y", scale: y }).encodeText({ field: "label" });
  throw new Error("Unknown blend glyph type.");
}
