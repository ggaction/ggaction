import { frame, styles, shadowFixture } from "../../../examples/mark-shadows/data.js";
import { createMarkShadowExample } from "../../../examples/mark-shadows/program.js";
import { createMarkShadowPrimitive } from "./primitive.program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
export { frame, styles };
function callChain(style) {
  const f=shadowFixture(style), x={domain:[0,512],range:[0,512]}, y={domain:[0,256],range:[0,256]};
  const margin=f.clip?{left:65,top:65,right:125,bottom:57}:0;
  const calls=[["createCanvas",{...frame,margin}],
    ["createData",{id:"backdrop",values:[{left:20,right:240,top:45,bottom:180}]}],
    ["createRectMark",{id:"background",fill:"#e2e8f0",stroke:false}],
    ["encodeXRange",{lower:"left",upper:"right",scale:x}],["encodeYRange",{lower:"top",upper:"bottom",scale:y}],
    ["createTextMark",{id:"title",data:"backdrop",text:f.title,fontFamily:"Arial",fontSize:14,fill:"#243447"}],
    ["encodeX",{datum:20,fieldType:"quantitative",scale:x}],["encodeY",{datum:24,fieldType:"quantitative",scale:y}],
    ["createData",{id:"sibling",values:[{left:210,right:230,top:75,bottom:110}]}],
    ["createRectMark",{id:"sibling",data:"sibling",fill:"#fbbf24",stroke:false}],
    ["encodeXRange",{lower:"left",upper:"right",scale:x}],["encodeYRange",{lower:"top",upper:"bottom",scale:y}]];
  const appearance={fill:f.fill,opacity:f.opacity,shadow:f.shadow,stroke:false};
  if(f.kind==="circle")calls.push(["createData",{id:"shape",values:[{x:115,y:110}]}],
    ["createPointMark",{id:"shadowed",data:"shape",...appearance}], ["encodeX",{field:"x",scale:x}],
    ["encodeY",{field:"y",scale:y}],["encodePointRadius",{value:26}]);
  else calls.push(["createData",{id:"shape",values:[{left:80,right:150,top:80,bottom:140}]}],
    ["createRectMark",{id:"shadowed",data:"shape",...appearance,clip:Boolean(f.clip)}],
    ["encodeXRange",{lower:"left",upper:"right",scale:x}],["encodeYRange",{lower:"top",upper:"bottom",scale:y}]);
  return "chart()\n"+calls.map(([name,args])=>`  .${name}(${JSON.stringify(args)})`).join("\n")+";";
}
export const visualVariants=styles.map(style=>defineVisualVariant({
  chart:"mark-shadows",variant:style,title:`Shadow · ${style}`,...frame,
  primitive:()=>createMarkShadowPrimitive(style),userFacing:()=>createMarkShadowExample(style),
  callChain:callChain(style),programEquivalence:"render",compareSemanticSpec:false,
  artifact:{scope:"charts",capability:"mark-shadows"},colors:[],
  regions:[{name:"shadowed-glyph",x:60,y:60,width:120,height:110,minimumInkPixels:1000}]
}));
