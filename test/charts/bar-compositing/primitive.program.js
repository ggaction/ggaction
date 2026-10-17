import {chart} from "../../../src/index.js";
// Literal geometry, hierarchy and paint are independent of chart materialization.
export function createPrimitiveProgram({background="#ffffff",opacity=1}={}) {
  return chart().createCanvas({width:200,height:200,margin:40,background})
    .createGraphics({id:"barPlot",type:"rect",parent:"plot-main",length:1})
    .editGraphics({target:"barPlot",property:"items",value:[{type:"rect",properties:{
      x:60,y:40,width:80,height:120,fill:"#f00000",stroke:"#ffff00",strokeWidth:8,
      opacity,blend:"difference"
    }}]});
}
