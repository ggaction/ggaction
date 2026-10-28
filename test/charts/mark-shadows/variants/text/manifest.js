import { createTextShadowExample } from "../../../../../examples/text-shadows/program.js";
import { frame, styles, textShadowFixture } from "../../../../../examples/text-shadows/data.js";
import { fonts } from "../../../../../examples/font-assets/fonts/manifest.js";
import { createTextShadowPrimitive } from "./primitive.program.js";
function callChain(style) {
 const f=textShadowFixture(style),scale={domain:[0,512],range:[0,512]};
 const calls=[["createCanvas",{...frame,margin:f.clip?{left:60,top:50,right:110,bottom:55}:0}],
  ["createData",{id:"labels",values:[{x:f.x,y:f.y,text:f.text}]}],
  ["createTextMark",{id:"labels",data:"labels",fontFamily:fonts[0].family,fontWeight:400,fontSize:f.fontSize,lineHeight:f.lineHeight,
   fill:"#d2462d",opacity:.8,rotation:f.rotation,shadow:f.shadow,lineJoin:"round",clip:Boolean(f.clip),...(f.outline?{outline:f.outline}:{})}],
  ["encodeX",{field:"x",scale}],["encodeY",{field:"y",scale}],["encodeText",{field:"text"}]];
 return "chart()\n"+calls.map(([name,args])=>`  .${name}(${JSON.stringify(args)})`).join("\n")+
  '\n  .createFontResource({prepared, requestToken:"text-shadow-example"})'+
  '\n  .applyTextMetrics({prepared:metrics, requestToken:"text-shadow-example"});';
}
export const visualVariants=styles.map(style=>({chart:"text-shadows",variant:style,title:`Text shadow · ${style}`,...frame,
 source:"examples/text-shadows/program.js",primitive:()=>createTextShadowPrimitive(style),userFacing:()=>createTextShadowExample(style),
 callChain:callChain(style),
 programEquivalence:"render"}));
