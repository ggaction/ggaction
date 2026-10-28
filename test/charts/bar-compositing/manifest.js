import {defineVisualVariant} from "../../support/visual-variants.js";
import {createPrimitiveProgram} from "./primitive.program.js";
import {createBlendProgram} from "../../support/bar-blend-program.js";

// Screen over white is intentionally invisible; browser and PDF numeric cases cover it.
// Visual examples use contrasting backdrops so each displayed chart has plot ink.
export const variants = ["difference", "multiply", "screen"].flatMap(blend =>
  ["#ffffff", "#808080", "#336699"].flatMap((background,index) =>
  blend==="screen"&&background==="#ffffff"?[]:
  [1,.5].map(opacity => ({
    capability:"bar-compositing",chart:"bar-compositing",variant:`${blend==="difference"?"":blend+"-"}backdrop-${index+1}-opacity-${String(opacity).replace(".","-")}`,
    title:`One ${blend} source per bar fill and outline`,background,opacity,blend,
    width:200,height:200,
    calls:[
      `chart().createCanvas({width:200,height:200,margin:40,background:${JSON.stringify(background)}})`,
      `.createData({values:[{category:"a",value:1}]})`,
      `.createBarPlot({x:"category",y:{field:"value",aggregate:"sum"},guides:false})`,
      `.encodeBarWidth({pixels:80})`,
      `.editBarMark({fill:"#f00000",stroke:"#ffff00",strokeWidth:8})`,
      `.editBarMark({blend:${JSON.stringify(blend)},opacity:${opacity}})`
    ]
  }))));

export function createPublicProgram(variant) {
  return createBlendProgram({background:variant.background,opacity:variant.opacity,blend:variant.blend});
}

export {createPrimitiveProgram};
export const visualVariants=variants.map(variant=>defineVisualVariant({
  ...variant, primitive:()=>createPrimitiveProgram(variant),userFacing:()=>createPublicProgram(variant),
  callChain:variant.calls.join("\n")+";",compareSemanticSpec:false,programEquivalence:"render",
  colors:[],regions:[{name:"bar interior",x:80,y:60,width:40,height:80,minimumInkPixels:100}],
  artifact:{scope:"charts",capability:"bar-compositing"}
}));
