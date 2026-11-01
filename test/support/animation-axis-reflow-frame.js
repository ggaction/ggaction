import { chart, prepareFontResource, prepareTextMetrics } from "../../src/index.js";
import { planTransition, sampleTransition } from "../../src/animation.js";

export const axisReflowFontFamily="ggaction Metric Fixture";
export const axisReflowFontHash="cd7546c63196b68eda1205ca5544da143e0626cfb5623aa8a8988bf69b287878";
export const axisReflowFontIdentity=value=>Object.fromEntries(["contentHash","family","style","weight","metricsProviderVersion"].map(key=>[key,value[key]]));

// Real retained font bytes and exact host measurements use the public resource
// path. The independent native midpoint changes the scale before layout.
export async function animationAxisReflowFrame({bytes,decode,measure}) {
  let from=chart().createCanvas({width:240,height:300,background:"transparent",margin:80,responsive:{minPlotSize:{width:40,height:40}}})
    .createData({id:"rows",keyField:"id",values:[{id:"a",x:0,y:0},{id:"b",x:2,y:2}]}).createPointMark({id:"points",opacity:0})
    .encodeX({field:"x",scale:{domain:[0,2],nice:false}}).encodeY({field:"y"})
    .createXAxis({line:false,title:false,ticksAndLabels:{values:[0,1,2],labels:{fontFamily:axisReflowFontFamily,fontSize:20,fontWeight:400,color:"red",
      labelMap:[0,1,2].map(value=>({value,label:"AB AB"})),responsive:{maxLines:2}}}});
  const host={requestToken:"axis-reflow",load:()=>({bytes,mimeType:"font/ttf"}),decode,measure};
  const prepared=await prepareFontResource(from,{kind:"create",id:"font",uri:"fixture:axis-reflow",expectedHash:axisReflowFontHash,mimeType:"font/ttf",
    family:axisReflowFontFamily,style:"normal",weight:400,metricsProviderVersion:"measured-axis@1"},host);
  from=from.createFontResource({prepared,requestToken:host.requestToken});
  const metrics=await prepareTextMetrics(from,{id:"axis-metrics",fonts:["font"],axisLabelReflow:true},{requestToken:host.requestToken,decode,measure});
  from=from.applyTextMetrics({prepared:metrics,requestToken:host.requestToken});
  const to=from.editCanvas({width:420}),native=from.editCanvas({width:330});
  const plan=planTransition({from,to,options:{durationMs:100,easing:"linear"}});
  return {from,to,native,plan,frame:sampleTransition(plan,50),expected:native};
}
