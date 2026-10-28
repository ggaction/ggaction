import {chart} from "../../src/index.js";

export function createBlendProgram({background="#ffffff",opacity=1,strokeWidth=8,blend="difference"}={}) {
  return chart().createCanvas({width:200,height:200,margin:40,background})
    .createData({values:[{category:"a",value:1}]})
    .createBarPlot({x:"category",y:{field:"value",aggregate:"sum"},guides:false})
    .encodeBarWidth({pixels:80})
    .editBarMark({fill:"#f00000",stroke:"#ffff00",strokeWidth})
    .editBarMark({blend,opacity});
}
