import {chart} from "../../../src/index.js";
// Literal geometry, hierarchy and paint are independent of chart materialization.
export function createPrimitiveProgram({background="#ffffff",opacity=1,blend="difference"}={}) {
  return chart().createCanvas({width:200,height:200,margin:40,background})
    .createGraphics({id:"barPlot",type:"rect",parent:"plot-main",length:1})
    .editGraphics({target:"barPlot",property:"items",value:[{type:"rect",properties:{
      x:60,y:40,width:80,height:120,fill:"#f00000",stroke:"#ffff00",strokeWidth:8,
      opacity,blend
    }}]});
}

export function createPrimitiveGlyphProgram({ type = "point", blend = "multiply", opacity = .5 } = {}) {
  const outline = { color: "white", width: 8 };
  const primitives = {
    point: { type: "circle", properties: { x: 100, y: 80, radius: 35, fill: "red", stroke: "transparent", strokeWidth: 0, outline } },
    rect: { type: "rect", properties: { x: 60, y: 40, width: 80, height: 80, fill: "red", stroke: "transparent", strokeWidth: 0, outline } },
    line: { type: "path", properties: { commands: [{ op: "M", x: 50, y: 80 }, { op: "L", x: 150, y: 80 }], stroke: "red", strokeWidth: 8, strokeDash: [] } },
    text: { type: "text", properties: { x: 100, y: 80, text: "AB", fill: "red", outline, fontSize: 36, fontFamily: "Arial", fontWeight: "normal", textAlign: "center", textBaseline: "middle", rotation: 0 } }
  };
  const primitive = primitives[type];
  return chart().createCanvas({ width: 200, height: 160, margin: 0, background: "#336699" })
    .createGraphics({ id: "glyph", type: primitive.type, parent: "plot-main", length: 1 })
    .editGraphics({ target: "glyph", property: "items", value: [{ type: primitive.type, properties: { ...primitive.properties, blend, opacity } }] });
}
