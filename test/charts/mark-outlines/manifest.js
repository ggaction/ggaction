import { frame, fontFamily, styles, outlineFixture } from "../../../examples/mark-outlines/data.js";
import { createMarkOutlineExample } from "../../../examples/mark-outlines/program.js";
import { createMarkOutlinePrimitive } from "./primitive.program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
export { styles, frame };
function callChain(style) {
  const f = outlineFixture(style), rgb = c => `rgb(${c.join(",")})`;
  const x = { domain: [0,512], range: [0,512] }, y = { domain: [0,256], range: [0,256] };
  const appearance = { fill: rgb(f.fill), outline: { color: rgb(f.stroke), width: f.strokeWidth }, opacity: f.opacity, lineCap: "round", lineJoin: "round" };
  const calls = [["createCanvas", { ...frame, margin: f.clip ? { left:90,top:60,right:85,bottom:60 } : 0 }],
    ["createData", { id:"backdrop",values:[{left:20,right:260,top:45,bottom:180}] }],
    ["createRectMark",{id:"background",data:"backdrop",fill:rgb(f.underlay),stroke:false}],
    ["encodeXRange",{lower:"left",upper:"right",scale:x}],["encodeYRange",{lower:"top",upper:"bottom",scale:y}],
    ["createTextMark",{id:"title",data:"backdrop",text:f.title,fontFamily:"Arial",fontSize:14,fill:"#243447"}],
    ["encodeX",{datum:20,fieldType:"quantitative",scale:x}],["encodeY",{datum:24,fieldType:"quantitative",scale:y}]];
  if (f.kind === "rect") calls.push(["createData",{id:"shape",values:[{left:80,right:200,top:80,bottom:140}]}],
    ["createRectMark",{id:"outlined",data:"shape",...appearance,clip:Boolean(f.clip),stroke:false}],
    ["encodeXRange",{lower:"left",upper:"right",scale:x}],["encodeYRange",{lower:"top",upper:"bottom",scale:y}]);
  else if (f.kind === "circle") calls.push(["createData",{id:"shape",values:[{x:140,y:110}]}],
    ["createPointMark",{id:"outlined",data:"shape",...appearance,stroke:false}],
    ["encodeX",{field:"x",scale:x}],["encodeY",{field:"y",scale:y}],["encodePointRadius",{value:36}]);
  else if (f.kind === "path") calls.push(["createData",{id:"shape",values:[{x:80,top:140,bottom:140},{x:140,top:70,bottom:140},{x:200,top:140,bottom:140}]}],
    ["createAreaMark",{id:"outlined",data:"shape",...appearance}],["encodeX",{field:"x",scale:x}],["encodeYRange",{lower:"top",upper:"bottom",scale:y}]);
  else calls.push(["createData",{id:"shape",values:[{x:80,y:130,label:"AB"}]}],
    ["createTextMark",{id:"outlined",data:"shape",...appearance,fontFamily,fontSize:60}],
    ["encodeX",{field:"x",scale:x}],["encodeY",{field:"y",scale:y}],["encodeText",{field:"label"}]);
  return "chart()\n" + calls.map(([name,args]) => `  .${name}(${JSON.stringify(args)})`).join("\n") + ";";
}
export const visualVariants = styles.map(style => defineVisualVariant({
  chart: "mark-outlines", variant: style, title: `Outline · ${style}`, ...frame,
  primitive: () => createMarkOutlinePrimitive(style), userFacing: () => createMarkOutlineExample(style),
  callChain: callChain(style), programEquivalence: "render", compareSemanticSpec: false,
  artifact: { scope: "charts", capability: "mark-outlines" }, colors: [],
  regions: [{ name: "painted-glyph", x: 70, y: 60, width: 140, height: 100, minimumInkPixels: 1000 }]
}));
