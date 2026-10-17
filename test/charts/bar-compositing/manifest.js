import {chart} from "../../../src/index.js";
import {createBlendProgram} from "../../support/bar-blend-program.js";

export const variants = ["#ffffff", "#808080", "#336699"].flatMap((background,index) =>
  [1,.5].map(opacity => ({
    capability:"bar-compositing",chart:"single-source",variant:`backdrop-${index+1}-opacity-${opacity}`,
    title:"One difference source per bar fill and outline",background,opacity,
    width:200,height:200,
    calls:[
      `chart().createCanvas({width:200,height:200,margin:40,background:${JSON.stringify(background)}})`,
      `.createData({values:[{category:"a",value:1}]})`,
      `.createBarPlot({x:"category",y:{field:"value",aggregate:"sum"},guides:false})`,
      `.encodeBarWidth({pixels:80})`,
      `.editBarMark({fill:"#f00000",stroke:"#ffff00",strokeWidth:8})`,
      `.editBarMark({blend:"difference",opacity:${opacity}})`
    ]
  })));

export function createPublicProgram(variant) {
  return createBlendProgram({background:variant.background,opacity:variant.opacity});
}

// Independent literal geometry: one bar occupies [60,40,80,120]. No public
// program state, semantic materializer, or runtime bounds are read here.
export function createPrimitiveProgram({background,opacity}) {
  return chart().createCanvas({width:200,height:200,margin:40,background})
    .createGraphics({id:"literal-bar",type:"collection"})
    .editGraphics({target:"literal-bar",property:"items",value:[{type:"rect",properties:{
      x:60,y:40,width:80,height:120,fill:"#f00000",stroke:"#ffff00",strokeWidth:8,
      opacity,blend:"difference"
    }}]});
}
